/**
 * Content Script for Email-to-ICS Extension
 * Matches full-chrome-extension branch functionality exactly
 */

// Global state for multiple dialog instances
let dialogCount = 0;
const activeDialogs = new Map<string, HTMLElement>();
let currentRequest: AbortController | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'createInPageDialog') {
    createInPageDialog(message.selectedText);
    sendResponse({ success: true });
  } else if (message.action === 'closeDialog') {
    closeDialog(message.dialogId);
    sendResponse({ success: true });
  }
});

/**
 * Create a complete in-page dialog matching the original extension
 */
function createInPageDialog(selectedText?: string) {
  const dialogId = `email-to-ics-dialog-${++dialogCount}`;
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = dialogId;
  dialog.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 420px;
    min-height: 400px;
    max-height: 80vh;
    background: white;
    border: 2px solid #0d6efd;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    resize: both;
    min-width: 350px;
    min-height: 300px;
  `;

  // Create header with drag functionality and close button
  const header = document.createElement('div');
  header.style.cssText = `
    background: #0d6efd;
    color: white;
    padding: 12px 16px;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 16px;
  `;
  header.innerHTML = `
    <span>📧 Email to ICS v2.0</span>
    <div>
      <button id="${dialogId}-settings" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 14px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 4px;
        margin-right: 8px;
      " title="Settings">⚙️</button>
      <button id="${dialogId}-close" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 4px;
      ">✕</button>
    </div>
  `;

  // Create main content area
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    height: calc(100% - 60px);
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.5;
  `;

  // Add initial content with form
  content.innerHTML = `
    <div id="${dialogId}-form">
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Instructions (optional):</label>
        <textarea id="${dialogId}-instructions" style="
          width: 100%;
          height: 80px;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          resize: vertical;
          font-family: inherit;
        " placeholder="Add specific instructions for the AI...">${selectedText ? 'Focus on this section exclusively. Use surrounding html for other context, but this is the event we want:\\n\\n' + selectedText : ''}</textarea>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500;">AI Model:</label>
        <select id="${dialogId}-model" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
        ">
          <option value="openai/gpt-5">GPT-5</option>
          <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
          <option value="openai/o3">OpenAI o3</option>
          <option value="anthropic/claude-opus-4.1">Claude Opus 4.1</option>
          <option value="openai/o4-mini-high">OpenAI o4 Mini High</option>
        </select>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; margin-bottom: 8px;">
          <input type="checkbox" id="${dialogId}-tentative" style="margin-right: 8px;">
          <span>Mark as tentative</span>
        </label>
        
        <label style="display: flex; align-items: center;">
          <input type="checkbox" id="${dialogId}-multiday" style="margin-right: 8px;">
          <span>Multi-day event</span>
        </label>
      </div>
      
      <div style="text-align: center; margin-bottom: 16px;">
        <button id="${dialogId}-generate" style="
          background: #0d6efd;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-right: 8px;
        ">📅 Convert to ICS</button>
        
        <button id="${dialogId}-cancel" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: none;
        ">Cancel</button>
      </div>
    </div>
    
    <div id="${dialogId}-processing" style="display: none; text-align: center; padding: 20px;">
      <div style="margin-bottom: 16px;">
        <div style="
          border: 3px solid #f3f3f3;
          border-top: 3px solid #0d6efd;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <div id="${dialogId}-status" style="font-weight: 500; margin-bottom: 8px;">Processing...</div>
        <div id="${dialogId}-substatus" style="font-size: 12px; color: #666;"></div>
      </div>
      
      <div id="${dialogId}-progress" style="margin-bottom: 16px;">
        <div style="background: #e9ecef; border-radius: 10px; height: 6px; overflow: hidden;">
          <div id="${dialogId}-progress-bar" style="
            background: #0d6efd;
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
      
      <button id="${dialogId}-cancel-processing" style="
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      ">Cancel</button>
    </div>
    
    <div id="${dialogId}-results" style="display: none;"></div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  // Store reference
  activeDialogs.set(dialogId, dialog);

  // Add event listeners
  const generateBtn = content.querySelector(`#${dialogId}-generate`) as HTMLButtonElement;
  const cancelBtn = content.querySelector(`#${dialogId}-cancel`) as HTMLButtonElement;
  const cancelProcessingBtn = content.querySelector(`#${dialogId}-cancel-processing`) as HTMLButtonElement;

  generateBtn?.addEventListener('click', () => handleGenerateICS(dialogId));
  cancelBtn?.addEventListener('click', () => cancelProcessing(dialogId));
  cancelProcessingBtn?.addEventListener('click', () => cancelProcessing(dialogId));
  header.querySelector(`#${dialogId}-close`)?.addEventListener('click', () => closeDialog(dialogId));
  header.querySelector(`#${dialogId}-settings`)?.addEventListener('click', () => openSettings());

  // Add drag functionality
  makeDraggable(dialog, header);

  // Position dialog to avoid overlaps with existing dialogs
  positionDialog(dialog);

  return dialogId;
}

/**
 * Handle ICS generation - matches original flow exactly
 */
async function handleGenerateICS(dialogId: string) {
  const dialog = activeDialogs.get(dialogId);
  if (!dialog) return;

  const formDiv = dialog.querySelector(`#${dialogId}-form`) as HTMLElement;
  const processingDiv = dialog.querySelector(`#${dialogId}-processing`) as HTMLElement;
  const statusDiv = dialog.querySelector(`#${dialogId}-status`) as HTMLElement;
  const substatusDiv = dialog.querySelector(`#${dialogId}-substatus`) as HTMLElement;
  const progressBar = dialog.querySelector(`#${dialogId}-progress-bar`) as HTMLElement;

  try {
    // Get form values
    const instructions = (dialog.querySelector(`#${dialogId}-instructions`) as HTMLTextAreaElement).value;
    const model = (dialog.querySelector(`#${dialogId}-model`) as HTMLSelectElement).value;
    const tentative = (dialog.querySelector(`#${dialogId}-tentative`) as HTMLInputElement).checked;
    const multiday = (dialog.querySelector(`#${dialogId}-multiday`) as HTMLInputElement).checked;

    // Load settings
    const settings = await loadExtensionSettings();
    
    // Validate settings
    const requiredFields = ['openRouterKey', 'postmarkApiKey', 'fromEmail', 'toConfirmedEmail'];
    const missingFields = requiredFields.filter(field => !settings[field] || settings[field].trim() === '');
    
    if (missingFields.length > 0) {
      updateStatus(statusDiv, substatusDiv, 'Missing required settings. Opening settings...', 'error');
      setTimeout(() => openSettings(), 2000);
      return;
    }

    // Show processing view
    formDiv.style.display = 'none';
    processingDiv.style.display = 'block';
    
    // Setup abort controller
    currentRequest = new AbortController();

    // Step 1: Capture screenshot
    updateStatus(statusDiv, substatusDiv, 'Capturing screenshot...', 'info');
    setProgress(progressBar, 10);
    
    const screenshot = await captureScreenshotWithZoom();
    
    // Step 2: Get page content
    updateStatus(statusDiv, substatusDiv, 'Capturing page content...', 'info');
    setProgress(progressBar, 30);
    
    const pageData = {
      html: document.documentElement.outerHTML,
      text: document.body.innerText,
      url: window.location.href,
      screenshot: screenshot
    };

    // Step 3: Call AI
    updateStatus(statusDiv, substatusDiv, 'Analyzing content with AI...', 'info');
    setProgress(progressBar, 50);
    
    const eventData = await callAIModel(pageData, instructions, model, tentative, multiday, settings);
    
    // Step 4: Generate ICS
    updateStatus(statusDiv, substatusDiv, 'Generating ICS file...', 'info');
    setProgress(progressBar, 80);
    
    const icsContent = await generateICSContent(eventData, tentative, multiday, settings);
    
    // Step 5: Show results
    setProgress(progressBar, 100);
    setTimeout(() => {
      processingDiv.style.display = 'none';
      showResults(dialogId, eventData, icsContent, settings);
    }, 500);

  } catch (error) {
    console.error('ICS generation failed:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      updateStatus(statusDiv, substatusDiv, 'Processing cancelled', 'error');
    } else {
      updateStatus(statusDiv, substatusDiv, 'Failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
    
    setTimeout(() => {
      processingDiv.style.display = 'none';
      formDiv.style.display = 'block';
    }, 2000);
  } finally {
    currentRequest = null;
  }
}

/**
 * Capture screenshot with zoom functionality (matches original)
 */
async function captureScreenshotWithZoom(): Promise<string | null> {
  try {
    // Get page dimensions
    const scrollWidth = document.documentElement.scrollWidth;
    const scrollHeight = document.documentElement.scrollHeight;
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    
    // Store original state
    const originalZoom = document.body.style.zoom;
    const originalTransformOrigin = document.body.style.transformOrigin;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    try {
      // Calculate zoom to fit entire page
      const zoomX = innerWidth / scrollWidth;
      const zoomY = innerHeight / scrollHeight;
      const zoomFactor = Math.min(zoomX, zoomY, 1);

      if (zoomFactor < 1) {
        // Apply zoom and scroll to top
        document.body.style.zoom = zoomFactor.toString();
        document.body.style.transformOrigin = '0 0';
        window.scrollTo(0, 0);
        
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Request screenshot from background script
      const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
      
      if (response && response.screenshot) {
        return 'data:image/jpeg;base64,' + response.screenshot;
      } else {
        console.warn('Screenshot capture failed:', response?.error);
        return null;
      }

    } finally {
      // Restore original state
      document.body.style.zoom = originalZoom;
      document.body.style.transformOrigin = originalTransformOrigin;
      window.scrollTo(originalScrollX, originalScrollY);
    }

  } catch (error) {
    console.error('Screenshot error:', error);
    return null;
  }
}

/**
 * Call AI model with exact same prompt format as original
 */
async function callAIModel(pageData: any, instructions: string, model: string, tentative: boolean, multiday: boolean, settings: any): Promise<any> {
  const cleanUrl = stripTrackingParameters(pageData.url);
  
  // Use exact same prompt format as original EmailProcessor
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
    }),
    signal: currentRequest?.signal
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
 * Parse AI response (matches original logic)
 */
function parseAiResponse(response: string): any {
  try {
    // Clean up response - remove any markdown formatting
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleaned);
    
    // Validate required fields
    if (!parsed.summary) {
      throw new Error('Missing required field: summary');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw response:', response);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Generate ICS content (matches original logic)
 */
async function generateICSContent(eventData: any, tentative: boolean, multiday: boolean, settings: any): Promise<string> {
  const uid = generateUID();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Parse dates
  const startDate = new Date(eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : 'T00:00:00'));
  let endDate;
  
  if (eventData.end_date && eventData.end_time) {
    endDate = new Date(eventData.end_date + `T${eventData.end_time}:00`);
  } else if (eventData.end_date) {
    endDate = new Date(eventData.end_date + 'T23:59:59');
  } else if (eventData.start_time === null) {
    // All-day event, end next day
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    // Default to 1 hour duration
    endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
  }
  
  // Format dates for ICS
  const formatDate = (date: Date, allDay = false) => {
    if (allDay) {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    } else {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
  };
  
  const isAllDay = eventData.start_time === null;
  const dtstart = isAllDay ? formatDate(startDate, true) : formatDate(startDate);
  const dtend = isAllDay ? formatDate(endDate, true) : formatDate(endDate);
  
  // Escape text for ICS format
  const escapeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\')
              .replace(/;/g, '\\;')
              .replace(/,/g, '\\,')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '');
  };
  
  // Build ICS content
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Email-to-ICS//Email-to-ICS v2.0//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART${isAllDay ? ';VALUE=DATE' : ''}:${dtstart}`,
    `DTEND${isAllDay ? ';VALUE=DATE' : ''}:${dtend}`,
    `SUMMARY:${escapeText(eventData.summary)}`,
    `DESCRIPTION:${escapeText(eventData.description || '')}`,
    `LOCATION:${escapeText(eventData.location || '')}`,
    `STATUS:${tentative ? 'TENTATIVE' : 'CONFIRMED'}`,
    eventData.url ? `URL:${eventData.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n') + '\r\n';

  return icsContent;
}

/**
 * Show results (matches original format)
 */
function showResults(dialogId: string, eventData: any, icsContent: string, settings: any) {
  const dialog = activeDialogs.get(dialogId);
  if (!dialog) return;

  const resultsDiv = dialog.querySelector(`#${dialogId}-results`) as HTMLElement;
  
  resultsDiv.innerHTML = `
    <div style="border-top: 2px solid #0d6efd; padding-top: 20px;">
      <h4 style="margin: 0 0 16px 0; font-size: 18px; color: #0d6efd;">✅ Event Extracted</h4>
      
      <div style="background: #f8f9fa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <h5 style="margin: 0 0 8px 0; font-size: 16px;">${eventData.summary}</h5>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
          📅 ${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ' (All day)'}
        </p>
        ${eventData.location ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">📍 ${eventData.location}</p>` : ''}
        ${eventData.description ? `<p style="margin: 0; color: #666; font-size: 13px;">${eventData.description.substring(0, 100)}...</p>` : ''}
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
        <button id="${dialogId}-download" style="
          background: #0d6efd;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">💾 Download ICS</button>
        
        <button id="${dialogId}-copy" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">📋 Copy ICS</button>
        
        <button id="${dialogId}-email" style="
          background: #198754;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">📧 Send Email</button>
        
        <button id="${dialogId}-new" style="
          background: #fd7e14;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">🔄 New Event</button>
      </div>
    </div>
  `;

  resultsDiv.style.display = 'block';

  // Add action event listeners
  resultsDiv.querySelector(`#${dialogId}-download`)?.addEventListener('click', () => downloadICS(icsContent, eventData.summary));
  resultsDiv.querySelector(`#${dialogId}-copy`)?.addEventListener('click', () => copyToClipboard(icsContent));
  resultsDiv.querySelector(`#${dialogId}-email`)?.addEventListener('click', () => sendEmailLink(eventData, icsContent, settings));
  resultsDiv.querySelector(`#${dialogId}-new`)?.addEventListener('click', () => startNewEvent(dialogId));
}

/**
 * Helper functions
 */

function loadExtensionSettings(): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extension_settings'], (result) => {
      const defaultSettings = {
        openRouterKey: '',
        postmarkApiKey: '',
        fromEmail: '',
        toTentativeEmail: '',
        toConfirmedEmail: '',
        defaultModel: 'openai/gpt-5'
      };
      
      const stored = result.extension_settings;
      if (stored && typeof stored === 'object' && stored.value) {
        resolve({ ...defaultSettings, ...stored.value });
      } else {
        resolve(defaultSettings);
      }
    });
  });
}

function updateStatus(statusDiv: HTMLElement, substatusDiv: HTMLElement, message: string, type: 'info' | 'error' | 'success' = 'info') {
  statusDiv.textContent = message;
  
  const colors = {
    info: '#0d6efd',
    error: '#dc3545',
    success: '#198754'
  };
  
  statusDiv.style.color = colors[type];
}

function setProgress(progressBar: HTMLElement, percent: number) {
  progressBar.style.width = percent + '%';
}

function cancelProcessing(dialogId: string) {
  if (currentRequest) {
    currentRequest.abort();
    currentRequest = null;
  }
  
  const dialog = activeDialogs.get(dialogId);
  if (!dialog) return;
  
  const formDiv = dialog.querySelector(`#${dialogId}-form`) as HTMLElement;
  const processingDiv = dialog.querySelector(`#${dialogId}-processing`) as HTMLElement;
  
  processingDiv.style.display = 'none';
  formDiv.style.display = 'block';
}

function downloadICS(icsContent: string, summary: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${summary.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(icsContent: string) {
  try {
    await navigator.clipboard.writeText(icsContent);
    console.log('ICS copied to clipboard');
  } catch (error) {
    console.error('Failed to copy to clipboard');
  }
}

function sendEmailLink(eventData: any, icsContent: string, settings: any) {
  const subject = encodeURIComponent(`Calendar Event: ${eventData.summary}`);
  const body = encodeURIComponent(`Please find the attached calendar event.\n\nEvent: ${eventData.summary}\nDate: ${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ''}\n${eventData.location ? 'Location: ' + eventData.location : ''}`);
  
  const mailtoLink = `mailto:${settings.toConfirmedEmail}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
  
  // Also download the ICS file
  downloadICS(icsContent, eventData.summary);
}

function startNewEvent(dialogId: string) {
  const dialog = activeDialogs.get(dialogId);
  if (!dialog) return;
  
  const formDiv = dialog.querySelector(`#${dialogId}-form`) as HTMLElement;
  const resultsDiv = dialog.querySelector(`#${dialogId}-results`) as HTMLElement;
  
  resultsDiv.style.display = 'none';
  formDiv.style.display = 'block';
  
  // Clear form
  (dialog.querySelector(`#${dialogId}-instructions`) as HTMLTextAreaElement).value = '';
  (dialog.querySelector(`#${dialogId}-tentative`) as HTMLInputElement).checked = false;
  (dialog.querySelector(`#${dialogId}-multiday`) as HTMLInputElement).checked = false;
}

function openSettings() {
  chrome.runtime.sendMessage({ action: 'openSettings' });
}

function closeDialog(dialogId: string) {
  const dialog = activeDialogs.get(dialogId);
  if (dialog && dialog.parentNode) {
    dialog.parentNode.removeChild(dialog);
    activeDialogs.delete(dialogId);
  }
}

function makeDraggable(dialog: HTMLElement, handle: HTMLElement) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = dialog.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newLeft = Math.max(0, Math.min(window.innerWidth - dialog.offsetWidth, startLeft + deltaX));
    const newTop = Math.max(0, Math.min(window.innerHeight - dialog.offsetHeight, startTop + deltaY));
    
    dialog.style.left = newLeft + 'px';
    dialog.style.top = newTop + 'px';
    dialog.style.right = 'auto';
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function positionDialog(dialog: HTMLElement) {
  const margin = 20;
  const offset = (activeDialogs.size - 1) * 30;
  
  const right = margin + offset;
  const top = margin + offset;
  
  dialog.style.right = right + 'px';
  dialog.style.top = top + 'px';
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
    console.error('Error stripping tracking parameters:', error);
    return url;
  }
}

function generateUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Add keyboard shortcut for quick dialog creation
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    createInPageDialog();
  }
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' }, (response) => {
  if (response && response.createDialog) {
    createInPageDialog();
  }
});