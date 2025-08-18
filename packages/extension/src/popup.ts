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
    
    // Check if we should show settings directly (from context menu)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('settings') === 'true') {
      showSettings();
      updateStatus('Configure extension settings');
      return;
    }
    
    // Check if required settings are configured
    if (!areRequiredSettingsConfigured()) {
      // Auto-open settings dialog if any required settings are missing
      showSettings();
      updateStatus('Please configure all required settings to continue');
    }
    
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
    defaultModel: 'openai/gpt-5'
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
 * Check if all required settings are configured
 */
function areRequiredSettingsConfigured(): boolean {
  const requiredFields = [
    'openRouterKey',
    'postmarkApiKey', 
    'fromEmail',
    'toConfirmedEmail'
  ] as const;
  
  return requiredFields.every(field => {
    const value = settings[field];
    return value && value.trim().length > 0;
  });
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

  // Update UI state based on settings
  updateUIForSettings();
}

/**
 * Update UI state based on current settings
 */
function updateUIForSettings() {
  const settingsConfigured = areRequiredSettingsConfigured();
  
  if (generateButton) {
    generateButton.disabled = !settingsConfigured;
  }
  
  if (settingsConfigured) {
    updateStatus('Ready to generate ICS files');
  } else {
    updateStatus('Configure settings to get started', 'warning');
  }
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

    // Try to create in-page dialog first, fallback to popup processing
    try {
      await createInPageDialog(tab.id);
      return;
    } catch (error) {
      adapters.logger.warn('In-page dialog failed, using popup mode:', error);
      // Continue with popup processing below
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

    if (!result.events || result.events.length === 0) {
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
      <p class="text-muted">All fields marked with * are required</p>
      <form id="settings-form">
        <div class="mb-3">
          <label for="openrouter-key" class="form-label">OpenRouter API Key *</label>
          <input type="password" class="form-control" id="openrouter-key" value="${settings.openRouterKey}" required>
          <div class="form-text">Get your API key from <a href="https://openrouter.ai/keys" target="_blank">OpenRouter</a></div>
        </div>
        
        <div class="mb-3">
          <label for="postmark-key" class="form-label">Postmark API Key *</label>
          <input type="password" class="form-control" id="postmark-key" value="${settings.postmarkApiKey}" required>
          <div class="form-text">Get your API key from <a href="https://account.postmarkapp.com/api_tokens" target="_blank">Postmark</a></div>
        </div>
        
        <div class="mb-3">
          <label for="from-email" class="form-label">From Email *</label>
          <input type="email" class="form-control" id="from-email" value="${settings.fromEmail}" required>
          <div class="form-text">Must be verified in your Postmark account</div>
        </div>
        
        <div class="mb-3">
          <label for="to-email" class="form-label">To Email *</label>
          <input type="email" class="form-control" id="to-email" value="${settings.toConfirmedEmail}" required>
          <div class="form-text">Where calendar invites will be sent</div>
        </div>
        
        <div class="mb-3">
          <label for="default-model" class="form-label">Default AI Model</label>
          <select class="form-control" id="default-model">
            <option value="openai/gpt-5" ${settings.defaultModel === 'openai/gpt-5' ? 'selected' : ''}>GPT-5</option>
            <option value="anthropic/claude-sonnet-4" ${settings.defaultModel === 'anthropic/claude-sonnet-4' ? 'selected' : ''}>Claude Sonnet 4</option>
            <option value="google/gemini-2.5-pro" ${settings.defaultModel === 'google/gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
            <option value="openai/o3" ${settings.defaultModel === 'openai/o3' ? 'selected' : ''}>OpenAI o3</option>
            <option value="anthropic/claude-opus-4.1" ${settings.defaultModel === 'anthropic/claude-opus-4.1' ? 'selected' : ''}>Claude Opus 4.1</option>
            <option value="openai/o4-mini-high" ${settings.defaultModel === 'openai/o4-mini-high' ? 'selected' : ''}>OpenAI o4 Mini High</option>
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
    // Only allow going back if all required settings are configured
    if (areRequiredSettingsConfigured()) {
      contentDiv.innerHTML = '';
      updateUIForSettings();
    } else {
      updateStatus('Please configure all required settings before continuing', 'warning');
    }
  });
}

/**
 * Handle settings form submission
 */
async function handleSaveSettings(event: Event) {
  event.preventDefault();
  
  try {
    const form = event.target as HTMLFormElement;
    
    const newSettings: Partial<ExtensionSettings> = {
      openRouterKey: (document.getElementById('openrouter-key') as HTMLInputElement).value.trim(),
      postmarkApiKey: (document.getElementById('postmark-key') as HTMLInputElement).value.trim(),
      fromEmail: (document.getElementById('from-email') as HTMLInputElement).value.trim(),
      toConfirmedEmail: (document.getElementById('to-email') as HTMLInputElement).value.trim(),
      defaultModel: (document.getElementById('default-model') as HTMLSelectElement).value
    };

    // Validate required fields
    const requiredFields = [
      { key: 'openRouterKey', label: 'OpenRouter API Key' },
      { key: 'postmarkApiKey', label: 'Postmark API Key' },
      { key: 'fromEmail', label: 'From Email' },
      { key: 'toConfirmedEmail', label: 'To Email' }
    ];
    
    const missingFields = requiredFields.filter(field => 
      !newSettings[field.key as keyof ExtensionSettings] || 
      newSettings[field.key as keyof ExtensionSettings] === ''
    );
    
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => f.label).join(', ');
      updateStatus(`Please fill in all required fields: ${missingLabels}`, 'error');
      return;
    }

    await saveSettings(newSettings);
    
    // Reinitialize AI parser with new settings
    aiParser = new AiParserService(adapters, settings.openRouterKey, settings.defaultModel);
    
    updateStatus('Settings saved successfully', 'success');
    
    // Only allow going back if all required settings are now configured
    if (areRequiredSettingsConfigured()) {
      setTimeout(() => {
        contentDiv.innerHTML = '';
        updateUIForSettings();
      }, 2000);
    }
    
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


/**
 * Create an in-page dialog on the current tab
 */
async function createInPageDialog(tabId: number) {
  try {
    // Send message to content script to create dialog
    await chrome.tabs.sendMessage(tabId, { action: 'createInPageDialog' });
    
    // Close the popup since we're now using in-page dialog
    window.close();
  } catch (error) {
    adapters.logger.warn('Failed to create in-page dialog, falling back to popup mode:', error);
    // Fall back to normal popup behavior
    generateButton.disabled = false;
    updateStatus('Using popup mode - click Generate ICS again');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);