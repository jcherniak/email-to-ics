/**
 * Chrome Extension Popup - Using Shared Core Library
 * Replaces the old EmailProcessor with the new shared architecture
 */

import { 
  createBrowserAdapters,
  BrowserPlatformIcsGenerator,
  AiParserService,
  EventData,
  ParsingInput,
  ExtractionResult 
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

// Global state
let adapters: ReturnType<typeof createBrowserAdapters>;
let icsGenerator: BrowserPlatformIcsGenerator;
let aiParser: AiParserService;
let settings: ExtensionSettings;

// DOM elements
let statusDiv: HTMLElement;
let contentDiv: HTMLElement;
let generateButton: HTMLButtonElement;
let settingsButton: HTMLButtonElement;

/**
 * Initialize the extension popup
 */
async function init() {
  try {
    // Initialize platform adapters for Chrome extension
    adapters = createBrowserAdapters();
    
    // Load settings from Chrome storage
    settings = await loadSettings();
    
    // Initialize services with settings
    icsGenerator = new BrowserPlatformIcsGenerator(adapters);
    aiParser = new AiParserService(adapters, settings.openRouterKey, settings.defaultModel);
    
    // Initialize UI
    initializeUI();
    
    adapters.logger.info('Email-to-ICS extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    showError('Failed to initialize extension: ' + (error instanceof Error ? error.message : String(error)));
  }
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
    defaultModel: 'google/gemini-2.5-pro-preview'
  };

  try {
    const stored = await adapters.storage.get<ExtensionSettings>('extension_settings');
    return { ...defaultSettings, ...stored };
  } catch (error) {
    adapters.logger.warn('Failed to load settings, using defaults:', error);
    return defaultSettings;
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
  settings = { ...settings, ...newSettings };
  await adapters.storage.set('extension_settings', settings);
}

/**
 * Initialize UI components
 */
function initializeUI() {
  // Get DOM elements
  statusDiv = document.getElementById('status')!;
  contentDiv = document.getElementById('content')!;
  generateButton = document.getElementById('generate-ics') as HTMLButtonElement;
  settingsButton = document.getElementById('settings') as HTMLButtonElement;

  // Add event listeners
  generateButton?.addEventListener('click', handleGenerateICS);
  settingsButton?.addEventListener('click', showSettings);

  // Initial UI state
  updateStatus('Ready to generate ICS files');
}

/**
 * Handle ICS generation from current page
 */
async function handleGenerateICS() {
  try {
    updateStatus('Capturing page content...');
    generateButton.disabled = true;

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    // Capture page content and screenshot
    const pageData = await capturePageData(tab.id);
    
    updateStatus('Extracting events with AI...');
    
    // Use AI parser to extract events
    const extractionInput: ParsingInput = {
      html: pageData.html || '',
      text: pageData.text || '',
      url: tab.url || '',
      screenshot: pageData.screenshot,
      source: 'webpage' as const
    };

    const result = await aiParser.extractEvents(extractionInput, {
      model: settings.defaultModel
    });

    if (!result.success || !result.events || result.events.length === 0) {
      throw new Error('No events found on this page');
    }

    updateStatus('Generating ICS file...');
    
    // Generate ICS content
    const icsContent = await icsGenerator.generateIcs(
      result.events,
      { method: 'PUBLISH', includeHtmlDescription: true },
      settings.fromEmail
    );

    // Validate ICS
    const validation = icsGenerator.validateIcs(icsContent);
    if (!validation.valid) {
      throw new Error('Generated ICS is invalid: ' + validation.errors.join(', '));
    }

    // Show results
    showResults(result.events, icsContent);
    updateStatus(`Generated ICS for ${result.events.length} event(s)`);

  } catch (error) {
    adapters.logger.error('ICS generation failed:', error);
    showError('ICS generation failed: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    generateButton.disabled = false;
  }
}

/**
 * Capture page content and screenshot
 */
async function capturePageData(tabId: number): Promise<{
  html?: string;
  text?: string;
  screenshot?: string;
}> {
  // Inject content script to get page data
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return {
        html: document.documentElement.outerHTML,
        text: document.body.innerText,
        title: document.title
      };
    }
  });

  // Capture screenshot
  const screenshot = await chrome.tabs.captureVisibleTab(undefined, {
    format: 'png',
    quality: 80
  });

  return {
    html: result.result?.html,
    text: result.result?.text,
    screenshot: screenshot
  };
}

/**
 * Show extraction results and ICS content
 */
function showResults(events: EventData[], icsContent: string) {
  contentDiv.innerHTML = `
    <div class="results">
      <h3>Extracted Events (${events.length})</h3>
      <div class="events-list">
        ${events.map((event, index) => `
          <div class="event-item">
            <h4>${event.summary}</h4>
            <p><strong>Date:</strong> ${new Date(event.dtstart).toLocaleString()}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
            ${event.description ? `<p><strong>Description:</strong> ${event.description.substring(0, 100)}...</p>` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="actions">
        <button id="download-ics" class="btn btn-primary">Download ICS</button>
        <button id="send-email" class="btn btn-secondary">Send Email</button>
        <button id="copy-ics" class="btn btn-outline-secondary">Copy ICS</button>
      </div>
    </div>
  `;

  // Add action event listeners
  document.getElementById('download-ics')?.addEventListener('click', () => downloadICS(icsContent));
  document.getElementById('send-email')?.addEventListener('click', () => sendEmailConfirmation(events, icsContent));
  document.getElementById('copy-ics')?.addEventListener('click', () => copyToClipboard(icsContent));
}

/**
 * Download ICS file
 */
function downloadICS(icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'events.ics';
  a.click();
  URL.revokeObjectURL(url);
  updateStatus('ICS file downloaded');
}

/**
 * Send email confirmation using mailto link
 */
async function sendEmailConfirmation(events: EventData[], icsContent: string) {
  try {
    updateStatus('Opening email client...');
    
    const subject = encodeURIComponent(`Calendar Event${events.length > 1 ? 's' : ''}: ${events[0].summary}${events.length > 1 ? ` and ${events.length - 1} more` : ''}`);
    const body = encodeURIComponent(`Please find the attached calendar event${events.length > 1 ? 's' : ''}.\n\nEvent Details:\n${events.map(e => `• ${e.summary} - ${new Date(e.dtstart).toLocaleString()}`).join('\n')}`);
    
    // Create mailto link
    const mailtoLink = `mailto:${settings.toConfirmedEmail}?subject=${subject}&body=${body}`;
    
    // Open email client
    window.open(mailtoLink, '_blank');
    
    // Also provide download option since mailto can't attach files
    downloadICS(icsContent);
    
    updateStatus('Email client opened. Please attach the downloaded ICS file manually.');
  } catch (error) {
    showError('Failed to open email client: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Copy ICS content to clipboard
 */
async function copyToClipboard(icsContent: string) {
  try {
    await navigator.clipboard.writeText(icsContent);
    updateStatus('ICS content copied to clipboard');
  } catch (error) {
    showError('Failed to copy to clipboard');
  }
}

/**
 * Show settings panel
 */
function showSettings() {
  contentDiv.innerHTML = `
    <div class="settings">
      <h3>Extension Settings</h3>
      <form id="settings-form">
        <div class="mb-3">
          <label for="openrouter-key" class="form-label">OpenRouter API Key</label>
          <input type="password" class="form-control" id="openrouter-key" value="${settings.openRouterKey}">
        </div>
        
        <div class="mb-3">
          <label for="postmark-key" class="form-label">Postmark API Key</label>
          <input type="password" class="form-control" id="postmark-key" value="${settings.postmarkApiKey}">
        </div>
        
        <div class="mb-3">
          <label for="from-email" class="form-label">From Email</label>
          <input type="email" class="form-control" id="from-email" value="${settings.fromEmail}">
        </div>
        
        <div class="mb-3">
          <label for="to-email" class="form-label">To Email</label>
          <input type="email" class="form-control" id="to-email" value="${settings.toConfirmedEmail}">
        </div>
        
        
        <div class="mb-3">
          <label for="default-model" class="form-label">Default AI Model</label>
          <select class="form-control" id="default-model">
            <option value="google/gemini-2.5-pro-preview" ${settings.defaultModel === 'google/gemini-2.5-pro-preview' ? 'selected' : ''}>Gemini 2.5 Pro</option>
            <option value="openai/gpt-4o-mini" ${settings.defaultModel === 'openai/gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini</option>
            <option value="anthropic/claude-3.7-sonnet:thinking" ${settings.defaultModel === 'anthropic/claude-3.7-sonnet:thinking' ? 'selected' : ''}>Claude 3.7 Sonnet</option>
          </select>
        </div>
        
        <button type="submit" class="btn btn-primary">Save Settings</button>
        <button type="button" class="btn btn-secondary" id="back-button">Back</button>
      </form>
    </div>
  `;

  // Add form event listeners
  document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings);
  document.getElementById('back-button')?.addEventListener('click', () => {
    contentDiv.innerHTML = '';
    updateStatus('Ready to generate ICS files');
  });
}

/**
 * Handle settings form submission
 */
async function handleSaveSettings(event: Event) {
  event.preventDefault();
  
  try {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newSettings: Partial<ExtensionSettings> = {
      openRouterKey: (document.getElementById('openrouter-key') as HTMLInputElement).value,
      postmarkApiKey: (document.getElementById('postmark-key') as HTMLInputElement).value,
      fromEmail: (document.getElementById('from-email') as HTMLInputElement).value,
      toConfirmedEmail: (document.getElementById('to-email') as HTMLInputElement).value,
      defaultModel: (document.getElementById('default-model') as HTMLSelectElement).value
    };

    await saveSettings(newSettings);
    
    // Reinitialize AI parser with new settings
    aiParser = new AiParserService(adapters, settings.openRouterKey, settings.defaultModel);
    
    updateStatus('Settings saved successfully');
    
    setTimeout(() => {
      contentDiv.innerHTML = '';
      updateStatus('Ready to generate ICS files');
    }, 2000);
    
  } catch (error) {
    showError('Failed to save settings: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Update status message
 */
function updateStatus(message: string, type: 'info' | 'error' | 'success' = 'info') {
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status status-${type}`;
  }
}

/**
 * Show error message
 */
function showError(message: string) {
  updateStatus(message, 'error');
  adapters?.logger.error(message);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);