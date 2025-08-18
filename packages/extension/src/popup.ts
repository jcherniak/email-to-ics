/**
 * Chrome Extension Popup - Iframe-based with direct API calls
 * Self-hosting architecture with review workflow caching
 */

import { 
  createBrowserAdapters,
  BrowserPlatformIcsGenerator
} from '@email-to-ics/shared-core';

// Extension configuration
interface ExtensionSettings {
  openRouterKey: string;
  postmarkApiKey: string;
  fromEmail: string;
  toTentativeEmail: string;
  toConfirmedEmail: string;
  defaultModel: string;
}

// Review cache for in-memory review workflow
interface ReviewCacheEntry {
  timestamp: number;
  originalData: any;
  eventData: any;
  icsContent: string;
  settings: ExtensionSettings;
  confirmationToken: string;
}

// Global state
let adapters: ReturnType<typeof createBrowserAdapters>;
let icsGenerator: BrowserPlatformIcsGenerator;
let settings: ExtensionSettings;
let reviewCache = new Map<string, ReviewCacheEntry>();
let currentPageInfo: any = null;
let selectedText: string = '';
let isInIframe = false;

// DOM elements (will be populated after DOM loads)
let statusDiv: HTMLElement;
let contentDiv: HTMLElement;
let processingDiv: HTMLElement;
let formSection: HTMLElement;
let reviewSection: HTMLElement;

/**
 * Initialize the extension popup
 */
async function init() {
  try {
    // Detect if running in iframe
    isInIframe = window.self !== window.top;
    
    // Initialize platform adapters
    adapters = createBrowserAdapters();
    icsGenerator = new BrowserPlatformIcsGenerator(adapters);
    
    // Load settings
    settings = await loadSettings();
    
    // Initialize DOM elements
    initializeDOM();
    
    // Set up event listeners
    setupEventListeners();
    
    // Handle iframe initialization
    if (isInIframe) {
      setupIframeMessageHandling();
      // Show close button for iframe
      const closeControls = document.getElementById('close-controls');
      if (closeControls) {
        closeControls.style.display = 'block';
      }
    }
    
    // Check if settings are complete
    await validateAndShowForm();
    
  } catch (error) {
    console.error('Initialization failed:', error);
    showError(`Initialization failed: ${error.message}`);
  }
}

/**
 * Initialize DOM elements and basic UI
 */
function initializeDOM() {
  statusDiv = document.getElementById('status')!;
  contentDiv = document.getElementById('content')!;
  processingDiv = document.getElementById('processing-view')!;
  formSection = document.getElementById('form-section')!;
  reviewSection = document.getElementById('review-section')!;
  
  // Show loading initially
  showStatus('Initializing...', 'info');
}

/**
 * Set up event listeners for form interactions
 */
function setupEventListeners() {
  // Convert to ICS button
  const generateBtn = document.getElementById('generate-ics') as HTMLButtonElement;
  generateBtn?.addEventListener('click', handleGenerateICS);
  
  // Cancel button
  const cancelBtn = document.getElementById('cancel-processing') as HTMLButtonElement;
  cancelBtn?.addEventListener('click', cancelProcessing);
  
  // Settings button
  const settingsBtn = document.getElementById('open-settings') as HTMLButtonElement;
  settingsBtn?.addEventListener('click', openSettings);
  
  // Review workflow buttons
  const acceptBtn = document.getElementById('accept-review') as HTMLButtonElement;
  acceptBtn?.addEventListener('click', acceptReview);
  
  const rejectBtn = document.getElementById('reject-review') as HTMLButtonElement;
  rejectBtn?.addEventListener('click', rejectReview);
  
  // Close iframe button (if in iframe)
  const closeBtn = document.getElementById('close-iframe') as HTMLButtonElement;
  closeBtn?.addEventListener('click', closeIframe);
}

/**
 * Handle iframe message communication
 */
function setupIframeMessageHandling() {
  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'INIT_FROM_CONTENT') {
      currentPageInfo = event.data.data;
      selectedText = event.data.data.selectedText || '';
      
      // Pre-fill instructions if we have selected text
      if (selectedText) {
        const instructionsTextarea = document.getElementById('instructions') as HTMLTextAreaElement;
        if (instructionsTextarea) {
          instructionsTextarea.value = `Focus on this section exclusively. Use surrounding HTML for context, but this is the event we want:\n\n${selectedText}`;
        }
      }
    }
  });
  
  // Send resize messages to parent
  const resizeObserver = new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height > 0) {
      window.parent.postMessage({
        type: 'RESIZE_IFRAME',
        height: height
      }, '*');
    }
  });
  
  resizeObserver.observe(document.body);
}

/**
 * Load settings from Chrome storage
 */
async function loadSettings(): Promise<ExtensionSettings> {
  const defaultSettings: ExtensionSettings = {
    openRouterKey: '',
    postmarkApiKey: '',
    fromEmail: '',
    toTentativeEmail: '',
    toConfirmedEmail: '',
    defaultModel: 'openai/gpt-5'
  };
  
  const stored = await adapters.storage.get('extension_settings');
  return stored ? { ...defaultSettings, ...stored } : defaultSettings;
}

/**
 * Validate settings and show appropriate form
 */
async function validateAndShowForm() {
  const requiredFields = ['openRouterKey', 'postmarkApiKey', 'fromEmail', 'toConfirmedEmail'];
  const missingFields = requiredFields.filter(field => !settings[field] || settings[field].trim() === '');
  
  if (missingFields.length > 0) {
    showStatus(`Missing required settings: ${missingFields.join(', ')}`, 'error');
    // Could automatically open settings here
    return;
  }
  
  // Settings are valid, show the main form
  showMainForm();
}

/**
 * Show the main ICS generation form
 */
function showMainForm() {
  hideStatus();
  formSection.style.display = 'block';
  processingDiv.style.display = 'none';
  reviewSection.style.display = 'none';
  
  // Populate model dropdown
  const modelSelect = document.getElementById('model') as HTMLSelectElement;
  if (modelSelect) {
    modelSelect.innerHTML = `
      <option value="openai/gpt-5">GPT-5</option>
      <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
      <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
      <option value="openai/o3">OpenAI o3</option>
      <option value="anthropic/claude-opus-4.1">Claude Opus 4.1</option>
      <option value="openai/o4-mini-high">OpenAI o4 Mini High</option>
    `;
    modelSelect.value = settings.defaultModel;
  }
}

/**
 * Handle ICS generation
 */
async function handleGenerateICS() {
  try {
    // Get form values
    const instructions = (document.getElementById('instructions') as HTMLTextAreaElement).value;
    const model = (document.getElementById('model') as HTMLSelectElement).value;
    const tentative = (document.getElementById('tentative') as HTMLInputElement).checked;
    const multiday = (document.getElementById('multiday') as HTMLInputElement).checked;
    
    // Show processing view
    showProcessingView();
    
    // Step 1: Get current page info (if not already available)
    if (!currentPageInfo) {
      updateProgress(10, 'Getting page information...');
      currentPageInfo = await getCurrentPageInfo();
    }
    
    // Step 2: Capture screenshot via background script
    updateProgress(30, 'Capturing screenshot...');
    const screenshot = await captureScreenshot();
    
    // Step 3: Call AI model
    updateProgress(50, 'Analyzing content with AI...');
    const eventData = await callAIModel({
      html: currentPageInfo.html,
      text: currentPageInfo.text,
      url: currentPageInfo.url,
      screenshot: screenshot
    }, instructions, model, tentative, multiday);
    
    // Step 4: Generate ICS
    updateProgress(80, 'Generating ICS file...');
    const icsContent = await generateICS(eventData, tentative);
    
    // Step 5: Check if needs review
    const needsReview = shouldReviewEvent(eventData, instructions);
    
    if (needsReview) {
      // Cache for review workflow
      const confirmationToken = generateConfirmationToken();
      reviewCache.set(confirmationToken, {
        timestamp: Date.now(),
        originalData: currentPageInfo,
        eventData,
        icsContent,
        settings,
        confirmationToken
      });
      
      showReviewWorkflow(eventData, icsContent, confirmationToken);
    } else {
      // Direct completion
      updateProgress(100, 'Complete!');
      showResults(eventData, icsContent);
    }
    
  } catch (error) {
    console.error('ICS generation failed:', error);
    showError(`Failed to generate ICS: ${error.message}`);
    showMainForm();
  }
}

/**
 * Capture screenshot via background script
 */
async function captureScreenshot(): Promise<string | null> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    if (response && response.success && response.screenshot) {
      return 'data:image/jpeg;base64,' + response.screenshot;
    }
    console.warn('Screenshot capture failed:', response?.error);
    return null;
  } catch (error) {
    console.error('Screenshot request failed:', error);
    return null;
  }
}

/**
 * Get current page info (fallback if not from iframe)
 */
async function getCurrentPageInfo(): Promise<any> {
  if (isInIframe && currentPageInfo) {
    return currentPageInfo;
  }
  
  try {
    // Request page info from content script
    const response = await chrome.runtime.sendMessage({ action: 'get-page-info' });
    return response;
  } catch (error) {
    console.error('Failed to get page info:', error);
    return {
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML,
      text: document.body.innerText
    };
  }
}

/**
 * Call AI model with direct API
 */
async function callAIModel(pageData: any, instructions: string, model: string, tentative: boolean, multiday: boolean): Promise<any> {
  const cleanUrl = stripTrackingParameters(pageData.url);
  
  // Build prompt exactly like the original
  const prompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

CRITICAL: You must respond with valid JSON only. No markdown, no explanations, just pure JSON.

Extract event details from the provided content and return a JSON object with this exact structure:
{
    "summary": "Event title",
    "location": "Event location or empty string",
    "start_date": "YYYY-MM-DD",
    "start_time": "HH:MM" or null for all-day,
    "end_date": "YYYY-MM-DD", 
    "end_time": "HH:MM" or null for all-day,
    "description": "Event description",
    "timezone": "America/New_York",
    "url": "Event URL or source URL"
}

Guidelines:
- Use ISO 8601 date format (YYYY-MM-DD)
- Use 24-hour time format (HH:MM)
- If no end time specified, make reasonable estimate
- Default timezone is America/New_York unless specified
- For all-day events, set start_time and end_time to null
- Multi-day events: ${multiday ? 'Expected' : 'Not expected'}
- Event status: ${tentative ? 'Tentative' : 'Confirmed'}
- IMPORTANT: If a source URL is provided, include it in the "url" field
- IMPORTANT: If a source URL is provided, also add it at the bottom of the description field with text "\\n\\nSource: [URL]"

${instructions ? `Special instructions: ${instructions}\n` : ''}

${cleanUrl ? `Source URL: ${cleanUrl}\n` : ''}

Content to analyze:
${pageData.html}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Email to ICS Chrome Extension'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 20000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content || '';

  return parseAiResponse(aiResponse);
}

/**
 * Parse AI response
 */
function parseAiResponse(response: string): any {
  try {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.summary) {
      throw new Error('Missing required field: summary');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Generate ICS content using shared library
 */
async function generateICS(eventData: any, tentative: boolean): Promise<string> {
  return await icsGenerator.generateICS({
    summary: eventData.summary,
    description: eventData.description || '',
    location: eventData.location || '',
    dtstart: eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : 'T00:00:00'),
    dtend: eventData.end_date ? eventData.end_date + (eventData.end_time ? `T${eventData.end_time}:00` : 'T23:59:59') : undefined,
    timezone: eventData.timezone || 'America/New_York',
    isAllDay: eventData.start_time === null,
    status: tentative ? 'tentative' : 'confirmed',
    url: eventData.url
  });
}

/**
 * Determine if event needs review
 */
function shouldReviewEvent(eventData: any, instructions: string): boolean {
  // Simple heuristics for review requirement
  if (!eventData.start_date || !eventData.summary) return true;
  if (instructions.toLowerCase().includes('review') || instructions.toLowerCase().includes('check')) return true;
  if (!eventData.location && !eventData.description) return true;
  return false;
}

/**
 * Show review workflow
 */
function showReviewWorkflow(eventData: any, icsContent: string, token: string) {
  hideProcessing();
  reviewSection.style.display = 'block';
  
  // Populate review details
  const reviewContent = document.getElementById('review-content')!;
  reviewContent.innerHTML = `
    <h4>Review Extracted Event</h4>
    <div class="event-preview">
      <h5>${eventData.summary}</h5>
      <p><strong>Date:</strong> ${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ' (All day)'}</p>
      ${eventData.location ? `<p><strong>Location:</strong> ${eventData.location}</p>` : ''}
      ${eventData.description ? `<p><strong>Description:</strong> ${eventData.description.substring(0, 200)}...</p>` : ''}
    </div>
    <div class="mt-3">
      <button class="btn btn-success me-2" onclick="acceptReview('${token}')">✓ Accept & Send</button>
      <button class="btn btn-secondary" onclick="rejectReview('${token}')">✗ Cancel</button>
    </div>
  `;
}

/**
 * Accept review and send ICS
 */
function acceptReview(token?: string) {
  if (!token) return;
  
  const cached = reviewCache.get(token);
  if (!cached) {
    showError('Review session expired');
    return;
  }
  
  // Show final results
  showResults(cached.eventData, cached.icsContent);
  
  // Clean up cache
  reviewCache.delete(token);
}

/**
 * Reject review and return to form
 */
function rejectReview(token?: string) {
  if (token) {
    reviewCache.delete(token);
  }
  showMainForm();
}

/**
 * Show final results
 */
function showResults(eventData: any, icsContent: string) {
  hideProcessing();
  const resultDiv = document.getElementById('results')!;
  resultDiv.style.display = 'block';
  
  resultDiv.innerHTML = `
    <div class="alert alert-success">
      <h4>✅ Event Created Successfully</h4>
      <h5>${eventData.summary}</h5>
      <p>${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ' (All day)'}</p>
    </div>
    <div class="d-flex gap-2">
      <button class="btn btn-primary" onclick="downloadICS('${encodeURIComponent(icsContent)}', '${eventData.summary}')">💾 Download ICS</button>
      <button class="btn btn-secondary" onclick="copyToClipboard('${encodeURIComponent(icsContent)}')">📋 Copy</button>
      <button class="btn btn-success" onclick="sendEmail('${encodeURIComponent(JSON.stringify(eventData))}', '${encodeURIComponent(icsContent)}')">📧 Send Email</button>
    </div>
  `;
}

// Utility functions
function showProcessingView() {
  formSection.style.display = 'none';
  processingDiv.style.display = 'block';
  reviewSection.style.display = 'none';
}

function hideProcessing() {
  processingDiv.style.display = 'none';
}

function updateProgress(percent: number, message: string) {
  const progressBar = document.getElementById('progress-bar')!;
  const statusText = document.getElementById('progress-status')!;
  
  progressBar.style.width = percent + '%';
  statusText.textContent = message;
}

function showStatus(message: string, type: 'info' | 'error' | 'success' = 'info') {
  statusDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
}

function hideStatus() {
  statusDiv.style.display = 'none';
}

function showError(message: string) {
  showStatus(message, 'error');
}

function cancelProcessing() {
  showMainForm();
}

function openSettings() {
  if (isInIframe) {
    chrome.runtime.sendMessage({ action: 'openSettings' });
  } else {
    // Handle settings in standalone mode
    window.location.href = 'popup.html?settings=true';
  }
}

function closeIframe() {
  if (isInIframe) {
    window.parent.postMessage({ type: 'CLOSE_IFRAME' }, '*');
  }
}

function stripTrackingParameters(url: string): string {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
      'fbclid', 'gclid', 'dclid', 'msclkid',
      'mc_cid', 'mc_eid',
      '_ga', '_gid', '_gac',
      'ref', 'referer', 'referrer'
    ];
    
    let hasChanges = false;
    for (const param of trackingParams) {
      if (params.has(param)) {
        params.delete(param);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      urlObj.search = params.toString();
      return urlObj.toString();
    }
    
    return url;
  } catch (error) {
    return url;
  }
}

function generateConfirmationToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Global functions for HTML onclick handlers
(window as any).acceptReview = acceptReview;
(window as any).rejectReview = rejectReview;
(window as any).downloadICS = (content: string, filename: string) => {
  const decoded = decodeURIComponent(content);
  const blob = new Blob([decoded], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};
(window as any).copyToClipboard = (content: string) => {
  const decoded = decodeURIComponent(content);
  navigator.clipboard.writeText(decoded);
};
(window as any).sendEmail = (eventData: string, icsContent: string) => {
  const event = JSON.parse(decodeURIComponent(eventData));
  const subject = `Calendar Event: ${event.summary}`;
  const body = `Please find the attached calendar event.\n\nEvent: ${event.summary}\nDate: ${event.start_date}${event.start_time ? ' at ' + event.start_time : ''}`;
  const mailtoLink = `mailto:${settings.toConfirmedEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoLink, '_blank');
  
  // Also trigger download
  (window as any).downloadICS(icsContent, event.summary);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}