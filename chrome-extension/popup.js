// popup.js
// Import ical.js for ICS parsing
import ICAL from 'ical.js';
// Import Bootstrap JS
import 'bootstrap';

// Make ICAL globally available for the functions that use it
window.ICAL = ICAL;

// DOM elements - Move these inside DOMContentLoaded
// const contentDiv = document.getElementById('content'); 
// const statusDiv = document.getElementById('status');

// Global state
let availableModels = [];
let selectedModel = null;
// let pageScreenshot = null; // Managed within generateICS now
let baseUrl = 'https://new.justin-c.com/email-to-ics'; // Add default base URL
let targetUrl = `${baseUrl}/?display=email`;
let modelsEndpointUrl = `${baseUrl}/?get_models=1`;
let debugMode = false; // Add debug mode flag
let lastSubmitParams = null; // Store last submission details for retry

// --- Initial state ---
// Remove init() call from global scope
// init();

async function init() { // Keep function definition for now, might be removed later
    try {
        // Fetch credentials, preferences, and base URL
        const credentialsPromise = getStoredCredentials();
        const preferencesPromise = getStoredPreferences();
        const baseUrlPromise = getStoredBaseUrl();

        // Wait for credentials and settings first
        const [prefs, storedBaseUrl, credentials] = await Promise.all([
            preferencesPromise,
            baseUrlPromise,
            credentialsPromise
        ]);
        
        baseUrl = storedBaseUrl || 'https://new.justin-c.com/email-to-ics';
        targetUrl = `${baseUrl}/?display=email`;
        modelsEndpointUrl = `${baseUrl}/?get_models=1`;
        debugMode = prefs.debugMode || false;
        
        if (!credentials || !storedBaseUrl) {
            showCredentialsForm(); // Calls showCredentialsForm -> Original logic tried to set contentDiv.innerHTML
        } else {
            // Credentials exist, now fetch models
            const modelsPromise = fetchAvailableModels();
            try {
                 const models = await modelsPromise;
                
                availableModels = models;
                
                selectedModel = prefs.defaultModel || 'openai/gpt-5' || (availableModels.length > 0 ? (availableModels.find(model => model.default) || availableModels[0]).id : null);
                debugMode = prefs.debugMode || false;
                
                showForm(prefs); // Calls showForm -> Original logic tried to set contentDiv.innerHTML
            } catch (error) {
                console.error("Error initializing models:", error); 
                availableModels = await modelsPromise.catch(() => []);
                selectedModel = prefs.defaultModel || 'openai/gpt-5' || null;
                showForm(prefs); // Still needs to show form on error
            }
        }
    } catch (error) {
        console.error("Init error:", error);
        showCredentialsForm(); // Fallback to login on general error
    }
}

// --- Model Management Functions ---
async function fetchAvailableModels() {
    try {
        // Get OpenRouter API key from storage
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get(['openRouterKey'], resolve);
        });
        
        if (!settings.openRouterKey) {
            console.warn('No OpenRouter API key found, using offline models');
            return getOfflineAllowedModels();
        }
        
        // Fetch models directly from OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${settings.openRouterKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const allModels = data.data || [];
        
        // Filter to allowed models only
        const filteredModels = filterAllowedModels(allModels);
        console.log("Available models:", filteredModels);
        return filteredModels;
        
    } catch (error) {
        console.error("Error fetching models:", error);
        return getOfflineAllowedModels();
    }
}

function getOfflineAllowedModels() {
    // Return allowed models even when offline
    return [
        { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
        { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)' },
        { id: 'google/gemini-2.5-flash:thinking', name: 'Gemini 2.5 Flash (Thinking)' },
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'openai/o4-mini-high', name: 'GPT-4 Mini High' },
        { id: 'openai/o3', name: 'GPT-O3' },
        { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
        { id: 'openai/o3-pro', name: 'GPT-O3 Pro' }
    ];
}

function filterAllowedModels(allModels) {
    // Define allowed models
    const allowedModelIds = [
        'anthropic/claude-3.7-sonnet:thinking',
        'google/gemini-2.5-flash:thinking',
        'google/gemini-2.5-flash',
        'openai/o4-mini-high',
        'openai/o3',
        'openai/gpt-4.1',
        'google/gemini-2.5-pro',
        'anthropic/claude-opus-4',
        'openai/o3-pro'
    ];

    // Filter models to only include allowed ones
    const filteredModels = allModels.filter(model => 
        allowedModelIds.includes(model.id)
    );

    // Add any missing models with fallback names
    const foundIds = filteredModels.map(m => m.id);
    const missingIds = allowedModelIds.filter(id => !foundIds.includes(id));
    
    missingIds.forEach(id => {
        const fallbackModel = getOfflineAllowedModels().find(m => m.id === id);
        if (fallbackModel) {
            filteredModels.push(fallbackModel);
        }
    });

    // Sort models with preferred order
    const preferredOrder = [
        'google/gemini-2.5-pro',
        'anthropic/claude-opus-4',
        'anthropic/claude-3.7-sonnet:thinking',
        'google/gemini-2.5-flash:thinking',
        'google/gemini-2.5-flash',
        'openai/o4-mini-high',
        'openai/o3',
        'openai/gpt-4.1',
        'openai/o3-pro'
    ];

    return filteredModels.sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.id);
        const bIndex = preferredOrder.indexOf(b.id);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

// --- Screenshot Capture ---

// Helper function to be executed in the target tab's context
function getPageDimensions() {
    return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        originalZoom: document.body.style.zoom,
        originalTransformOrigin: document.body.style.transformOrigin,
        originalScrollX: window.scrollX,
        originalScrollY: window.scrollY
    };
}

// Helper function to apply zoom (runs in tab context)
function applyZoomStyle(zoomFactor, originalZoom, originalTransformOrigin) {
    document.body.style.zoom = zoomFactor;
    document.body.style.transformOrigin = '0 0';
    // Return originals in case needed, though we aim to just remove the style
    return { originalZoom, originalTransformOrigin }; 
}

// Helper function to remove zoom (runs in tab context)
function removeZoomStyle(originalZoom, originalTransformOrigin) {
    // Attempt to restore originals, or simply remove if they were empty
    document.body.style.zoom = originalZoom || ''; 
    document.body.style.transformOrigin = originalTransformOrigin || '';
}

// Helper function to scroll (runs in tab context)
function scrollToPosition(x, y) {
    window.scrollTo(x, y);
}

// Updated screenshot logic using zoom and scroll
async function captureVisibleTabScreenshot() {
    // Check if we're in an iframe
    if (window.self !== window.top) {
        // We're in an iframe, request screenshot from background
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
                if (response && response.screenshot) {
                    // Background returns base64 without data URL prefix
                    resolve('data:image/jpeg;base64,' + response.screenshot);
                } else {
                    console.error('Screenshot request failed:', response?.error);
                    resolve(null);
                }
            });
        });
    }
    
    // Original popup logic for when not in iframe
    let originalState = {}; // Store original state (zoom, scroll)
    const tab = await getActiveTab();
    let dataUrl = null;

    try {
        // 1. Get dimensions and original state from the page
        const [initialResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getPageDimensions
        });
        const state = initialResult.result;
        originalState = { 
            zoom: state.originalZoom, 
            transformOrigin: state.originalTransformOrigin,
            scrollX: state.originalScrollX,
            scrollY: state.originalScrollY
        }; 

        // 2. Scroll to top-left
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrollToPosition,
            args: [0, 0]
        });

        // 3. Calculate zoom factor
        const zoomX = state.innerWidth / state.scrollWidth;
        const zoomY = state.innerHeight / state.scrollHeight;
        const zoomFactor = Math.min(zoomX, zoomY, 1);

        if (zoomFactor < 1) { 
            // 4. Apply zoom
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: applyZoomStyle,
                args: [zoomFactor, originalState.zoom, originalState.transformOrigin]
            });

            // 5. Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 250)); 
        }

        // 6. Capture screenshot
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
        });

        if (!dataUrl) {
             throw new Error("captureVisibleTab returned empty result after zoom/scroll.");
        }

        console.log("Zoomed+Scrolled screenshot captured successfully");
        return dataUrl;

    } catch (error) {
        console.error("Zoomed+Scrolled screenshot capture error:", error);
        return null;
    } finally {
        // 7. Cleanup: Always try to restore zoom and scroll
        if (Object.keys(originalState).length > 0) {
             try {
                // Remove zoom first
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id }, 
                    func: removeZoomStyle,
                    args: [originalState.zoom, originalState.transformOrigin]
                });
                // Then restore scroll
                 await chrome.scripting.executeScript({
                    target: { tabId: tab.id }, 
                    func: scrollToPosition,
                    args: [originalState.scrollX, originalState.scrollY]
                });
            } catch (cleanupError) {
                console.error("Error cleaning up zoom/scroll style:", cleanupError);
            }
        }
    }
}

// --- Credential Management Functions ---
async function checkCredentials() {
    try {
        const credentials = await getStoredCredentials();
        const storedBaseUrl = await getStoredBaseUrl(); // Check base URL too
        if (credentials && storedBaseUrl) {
            showForm();
        } else {
            showCredentialsForm();
        }
    } catch (error) {
        console.error("Error checking credentials:", error);
        showCredentialsForm();
    }
}

async function getStoredCredentials() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['username', 'password'], (result) => {
            if (result.username && result.password) {
                const credentials = btoa(`${result.username}:${result.password}`);
                // Return object with username and encoded creds
                resolve({ username: result.username, encoded: credentials }); 
            } else {
                resolve(null);
            }
        });
    });
}

// New helper to just get the username
async function getStoredUsername() {
     return new Promise((resolve) => {
        chrome.storage.sync.get(['username'], (result) => {
            resolve(result.username || null);
        });
    });
}

// MODIFIED showCredentialsForm
async function showCredentialsForm(errorMessage = null) {
    // This function now needs access to authSection and formSection
    // It should primarily SHOW authSection and HIDE formSection
    // The actual HTML content is already in popup.html
    
    // We might need to pass the DOM elements or get them here if needed,
    // but the primary logic is handled by checkAuthenticationAndFetchConfig
    // inside DOMContentLoaded now.
    // This function might become redundant or simplified.
    console.warn("showCredentialsForm called - logic likely moved to checkAuthenticationAndFetchConfig");
    // If called directly, ensure visibility is set correctly
    const authSection = document.getElementById('auth-section');
    const formSection = document.getElementById('form-section');
    if (authSection) authSection.style.display = 'block';
    if (formSection) formSection.style.display = 'none';

    // Maybe display the error message somewhere?
    if (errorMessage) {
        const statusDiv = document.getElementById('status'); // Assuming statusDiv is accessible
        if (statusDiv) {
            statusDiv.textContent = errorMessage;
            statusDiv.className = 'status-error';
            statusDiv.style.display = 'block';
        }
    }
}

async function saveCredentials(event) {
    // ... (existing code, BUT the final call should be to the new init logic)
    // Instead of init(), call checkAuthenticationAndFetchConfig if it's defined globally
    // OR rely on the event listener setup within DOMContentLoaded
}

// --- Preferences Management ---
async function getStoredPreferences() {
    return new Promise((resolve) => {
        // Include debugMode in retrieval
        chrome.storage.sync.get(['takeScreenshots', 'defaultModel', 'debugMode'], (result) => {
            resolve({
                takeScreenshots: result.takeScreenshots !== false, // Default to true if not set
                defaultModel: result.defaultModel || null,
                debugMode: result.debugMode || false // Default to false
            });
        });
    });
}

function savePreferences(takeScreenshots, model, currentDebugMode) {
    // Include debugMode in saving
    debugMode = currentDebugMode; // Update global state
    chrome.storage.sync.set({
        takeScreenshots: takeScreenshots,
        defaultModel: model,
        debugMode: currentDebugMode
    });
    
    // Also notify background script (if needed, though background doesn't use debug mode currently)
    chrome.runtime.sendMessage({
        action: 'savePreferences',
        takeScreenshots: takeScreenshots,
        defaultModel: model
    });
}

// --- Main Form Functions ---
// MODIFIED showForm
function showForm(preferences = {}) {
     // This function also becomes simpler. It mainly ensures
     // formSection is visible and authSection is hidden.
     // Populating the form fields (like model dropdown) still needs doing.
    console.warn("showForm called - logic likely moved to checkAuthenticationAndFetchConfig");
    const authSection = document.getElementById('auth-section');
    const formSection = document.getElementById('form-section');
    if (authSection) authSection.style.display = 'none';
    if (formSection) formSection.style.display = 'block';

    // Populate models etc. should happen within checkAuthenticationAndFetchConfig
}

// MODIFIED showStatus
function showStatus(type, messageHtml) {
    // This function needs access to statusDiv
    // It might be better defined *inside* DOMContentLoaded
    console.warn("Global showStatus called");
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.innerHTML = messageHtml;
    statusDiv.className = type; 
    // contentDiv.style.display = 'none'; // Cannot access contentDiv
    const formSection = document.getElementById('form-section');
    if (formSection) formSection.style.display = 'none';

    // ... (rest of the showStatus logic for retry button etc.)
}

// --- Helper Functions ---
async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
        return tabs[0];
    } else {
        throw new Error("Could not get active tab.");
    }
}

async function getPageContent(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => ({
                url: window.location.href,
                html: document.documentElement.outerHTML
            })
        });
        if (results && results[0] && results[0].result) {
            return results[0].result;
        } else {
            console.error("Script execution failed or returned no result.", results);
            throw new Error("Could not get page content.");
        }
    } catch (error) {
        console.error("Error executing script:", error);
        if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError.message);
            throw new Error(`Failed to get page content: ${chrome.runtime.lastError.message}`);
        }
        throw error;
    }
}

// --- Event Handlers ---

// MODIFIED handleSubmit - logic moved to generateICS inside DOMContentLoaded
async function handleSubmit(event) {
   console.error("Global handleSubmit called - should not happen");
}

// MODIFIED executeSubmit - logic moved to generateICS inside DOMContentLoaded
async function executeSubmit(params) {
   console.error("Global executeSubmit called - should not happen");
}

// MODIFIED handleRetry - logic moved to event listener inside DOMContentLoaded
async function handleRetry() {
    console.error("Global handleRetry called - should not happen");
}

// MODIFIED getStoredBaseUrl - Keep
async function getStoredBaseUrl() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['baseUrl'], (result) => {
            resolve(result.baseUrl || null);
        });
    });
}

// MODIFIED logout - Keep, but simplify
async function logout() {
    // ... (clear storage) ...
    // After clearing storage, just call the main init function from DOMContentLoaded
    // This assumes checkAuthenticationAndFetchConfig handles the UI update
    console.log("Logout called - relying on DOMContentLoaded handler to refresh UI");
    // Trigger the main check again
    if (typeof checkAuthenticationAndFetchConfig === 'function') {
         checkAuthenticationAndFetchConfig(); 
    } else {
        // Fallback: reload the popup? Requires permission.
        // window.location.reload(); 
        console.error("Cannot re-trigger auth check after logout.");
    }
}

// --- NEW Consolidated DOMContentLoaded Listener ---
// The previous block starting with document.addEventListener should be the *only* one.
// Remove the old code above this point or comment it out entirely.

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're running in an iframe
    const isInIframe = window.self !== window.top;
    
    // Hide cancel button by default
    const cancelRequestButton = document.getElementById('cancelRequestButton');
    if (cancelRequestButton) {
        cancelRequestButton.style.display = 'none';
    }
    
    // Listen for settings updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'settingsUpdated') {
            console.log('Settings updated, reloading popup...');
            // Reload the popup to refresh with new settings
            window.location.reload();
        }
    });
    
    // Handle close button click
    const closePopupButton = document.getElementById('close-popup');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', () => {
            if (isInIframe) {
                // We're in an iframe, send close message to parent
                window.parent.postMessage({ type: 'CLOSE_IFRAME' }, '*');
            } else {
                // Not in iframe, just close the window
                window.close();
            }
        });
    }
    
    // Listen for messages from the parent window (if in iframe)
    if (isInIframe) {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'INIT_FROM_CONTENT') {
                // Pre-fill URL from parent page
                const urlInput = document.getElementById('url');
                if (urlInput && event.data.data.url) {
                    urlInput.value = event.data.data.url;
                }
            }
        });
    }
    
    // Define ALL DOM element constants here
    const statusDiv = document.getElementById('status');
    const reviewStatusDiv = document.getElementById('review-status');
    const urlInput = document.getElementById('url');
    const convertButton = document.getElementById('convert-button');
    // const screenshotButton = document.getElementById('screenshot-button'); // Removed
    const instructionsInput = document.getElementById('instructions');
    const modelSelect = document.getElementById('model-select');
    // const modelDescriptionText = document.getElementById('model-description-text'); // Removed
    const refreshModelsButton = document.getElementById('refresh-models');
    const authSection = document.getElementById('auth-section');
    const formSection = document.getElementById('form-section');
    const openServerPageButton = document.getElementById('open-server-page');
    const tentativeToggle = document.getElementById('tentative-toggle');
    const multidayToggle = document.getElementById('multiday-toggle');
    const reviewRadioGroup = document.querySelectorAll('input[name="review-option"]');
    const reviewSection = document.getElementById('review-section');
    const reviewContent = document.getElementById('review-content');
    const reviewRecipient = document.getElementById('review-recipient');
    const reviewSubject = document.getElementById('review-subject'); // Get the new subject element
    const sendButton = document.getElementById('send-button');
    const rejectButton = document.getElementById('reject-button');

    // --- NEW elements for processing view ---
    const processingView = document.getElementById('processingView');
    const requestData = document.getElementById('requestData');
    const statusMessage = document.getElementById('statusMessage');
    const responseData = document.getElementById('responseData');
    const backToFormButton = document.getElementById('backToFormButton');
    // --------------------------------------

    // Define global state needed within this scope
    let reviewData = null;
    let serverUrl = ''; 
    let isAuthenticated = false;
    let localAvailableModels = []; // Use a name different from global scope if needed
    let serverDefaultModelId = null;
    let currentTabId = null;

    // Tab State Manager
    class TabStateManager {
        constructor() {
            this.tabId = null;
            this.stateKey = null;
        }
        
        async initialize() {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                this.tabId = tab.id;
                this.stateKey = `tab_${this.tabId}_state`;
                currentTabId = this.tabId;
                
                // Restore state for current tab
                await this.restoreState();
                
                // Save state when popup closes
                window.addEventListener('beforeunload', () => this.saveState());
            } catch (error) {
                console.error('Error initializing tab state manager:', error);
            }
        }
        
        async saveState() {
            if (!this.tabId) return;
            
            const state = {
                formData: {
                    url: urlInput?.value || '',
                    instructions: instructionsInput?.value || '',
                    model: modelSelect?.value || '',
                    tentative: tentativeToggle?.checked || false,
                    multiday: multidayToggle?.checked || false,
                    reviewOption: document.querySelector('input[name="review-option"]:checked')?.value || 'direct'
                },
                processingState: {
                    isProcessing: processingView?.style.display === 'block',
                    hasResults: responseData?.textContent || ''
                },
                timestamp: Date.now()
            };
            
            try {
                await chrome.storage.local.set({[this.stateKey]: state});
                console.log('Saved state for tab', this.tabId);
            } catch (error) {
                console.error('Error saving tab state:', error);
            }
        }
        
        async restoreState() {
            if (!this.tabId) return;
            
            try {
                const result = await chrome.storage.local.get([this.stateKey]);
                const state = result[this.stateKey];
                
                if (state && (Date.now() - state.timestamp) < 3600000) { // 1 hour
                    const form = state.formData;
                    if (form.url && urlInput) urlInput.value = form.url;
                    if (form.instructions && instructionsInput) instructionsInput.value = form.instructions;
                    if (form.model && modelSelect) modelSelect.value = form.model;
                    if (tentativeToggle) tentativeToggle.checked = form.tentative;
                    if (multidayToggle) multidayToggle.checked = form.multiday;
                    if (form.reviewOption) {
                        const radio = document.querySelector(`input[name="review-option"][value="${form.reviewOption}"]`);
                        if (radio) radio.checked = true;
                    }
                    
                    console.log('Restored state for tab', this.tabId);
                }
            } catch (error) {
                console.error('Error restoring tab state:', error);
            }
        }
        
        async cleanup() {
            try {
                const allItems = await chrome.storage.local.get(null);
                const now = Date.now();
                const keysToRemove = [];
                
                for (const key in allItems) {
                    if (key.startsWith('tab_') && key.endsWith('_state')) {
                        const state = allItems[key];
                        if (state && now - state.timestamp > 86400000) { // 24 hours
                            keysToRemove.push(key);
                        }
                    }
                }
                
                if (keysToRemove.length > 0) {
                    await chrome.storage.local.remove(keysToRemove);
                    console.log('Cleaned up', keysToRemove.length, 'old tab states');
                }
            } catch (error) {
                console.error('Error cleaning up tab states:', error);
            }
        }
    }
    
    // Initialize tab state manager
    const tabStateManager = new TabStateManager();

    // --- Utility Functions defined within this scope ---
    // Screenshot helpers
    function getPageDimensions() {
        return {
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            originalZoom: document.body.style.zoom,
            originalTransformOrigin: document.body.style.transformOrigin,
            originalScrollX: window.scrollX,
            originalScrollY: window.scrollY
        };
    }
    function applyZoomStyle(zoomFactor, originalZoom, originalTransformOrigin) {
        document.body.style.zoom = zoomFactor;
        document.body.style.transformOrigin = '0 0';
        return { originalZoom, originalTransformOrigin }; 
    }
    function removeZoomStyle(originalZoom, originalTransformOrigin) {
        document.body.style.zoom = originalZoom || ''; 
        document.body.style.transformOrigin = originalTransformOrigin || '';
    }
    function scrollToPosition(x, y) {
        window.scrollTo(x, y);
    }
    // Main screenshot function
    async function captureVisibleTabScreenshot() {
        // Check if we're in an iframe
        if (window.self !== window.top) {
            // We're in an iframe, request screenshot from background
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Screenshot message error:', chrome.runtime.lastError.message);
                        resolve(null);
                        return;
                    }
                    
                    if (response && response.success && response.screenshot) {
                        // Background returns base64 without data URL prefix
                        resolve('data:image/jpeg;base64,' + response.screenshot);
                    } else {
                        console.error('Screenshot request failed:', response?.error || 'Unknown error');
                        resolve(null);
                    }
                });
            });
        }
        
        // Original popup logic for when not in iframe
        let originalState = {}; 
        const tab = await getActiveTab(); // Needs getActiveTab defined in scope too
        let dataUrl = null;

        try {
            const [initialResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: getPageDimensions
            });
            const state = initialResult.result;
            originalState = { 
                zoom: state.originalZoom, 
                transformOrigin: state.originalTransformOrigin,
                scrollX: state.originalScrollX,
                scrollY: state.originalScrollY
            }; 

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: scrollToPosition,
                args: [0, 0]
            });

            const zoomX = state.innerWidth / state.scrollWidth;
            const zoomY = state.innerHeight / state.scrollHeight;
            const zoomFactor = Math.min(zoomX, zoomY, 1);

            if (zoomFactor < 1) { 
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: applyZoomStyle,
                    args: [zoomFactor, originalState.zoom, originalState.transformOrigin]
                });
                await new Promise(resolve => setTimeout(resolve, 250)); 
            }

            dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'jpeg',
                quality: 90
            });

            if (!dataUrl) {
                 throw new Error("captureVisibleTab returned empty result after zoom/scroll.");
            }
            console.log("Zoomed+Scrolled screenshot captured successfully");
            return dataUrl;

        } catch (error) {
            console.error("Zoomed+Scrolled screenshot capture error:", error);
            return null;
        } finally {
            if (Object.keys(originalState).length > 0) {
                 try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id }, 
                        func: removeZoomStyle,
                        args: [originalState.zoom, originalState.transformOrigin]
                    });
                     await chrome.scripting.executeScript({
                        target: { tabId: tab.id }, 
                        func: scrollToPosition,
                        args: [originalState.scrollX, originalState.scrollY]
                    });
                } catch (cleanupError) {
                    console.error("Error cleaning up zoom/scroll style:", cleanupError);
                }
            }
        }
    }

    // Helper function to get active tab (needed by screenshot)
    async function getActiveTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
            return tabs[0];
        } else {
            throw new Error("Could not get active tab.");
        }
    }

    // Status and UI helpers
    function showStatus(message, type = 'loading', isError = false) { // Added isError flag
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
        statusDiv.style.display = 'block';
        // Adjust body class for errors if needed
        if (isError) { 
             document.body.classList.add('error-state');
        } else {
             document.body.classList.remove('error-state');
        }
    }

    function showReviewStatus(message, type = 'loading') {
         if (!reviewStatusDiv) return;
        reviewStatusDiv.textContent = message;
        reviewStatusDiv.className = `status-${type}`;
        reviewStatusDiv.style.display = 'block';
    }
    
    // Define hideStatus, hideReviewStatus, disableForm, disableReviewButtons
    function hideStatus() {
        if (!statusDiv) return;
        statusDiv.style.display = 'none';
        statusDiv.textContent = '';
        document.body.classList.remove('error-state'); // Also remove error state class
    }

    function hideReviewStatus() {
        if (!reviewStatusDiv) return;
        reviewStatusDiv.style.display = 'none';
        reviewStatusDiv.textContent = '';
    }

    function disableForm(disable = true) {
        urlInput.disabled = disable;
        instructionsInput.disabled = disable;
        convertButton.disabled = disable;
        modelSelect.disabled = disable;
        refreshModelsButton.disabled = disable;
        tentativeToggle.disabled = disable;
        reviewRadioGroup.forEach(radio => radio.disabled = disable);
    }

    function disableReviewButtons(disable = true) {
        sendButton.disabled = disable;
        rejectButton.disabled = disable;
    }

    // --- Core Logic defined within this scope ---
    // Move checkAuthenticationAndFetchConfig, loadModels, populateModelDropdown here
    // Ensure they use localAvailableModels, serverUrl, etc.

    // Definition for loadModels
    async function loadModels(forceRefresh = false) {
        if (!isAuthenticated) {
            console.log("loadModels: Not authenticated, skipping.");
        return;
    }

        // Basic caching check (adjust if more sophisticated caching needed)
        if (!forceRefresh && localAvailableModels.length > 0) {
             console.log('loadModels: Using cached models.');
             populateModelDropdown(); // Use local populate
             return;
         }

        console.log("loadModels: Fetching models from server...");
        showStatus('Loading AI models...'); // Use local showStatus
        if(modelSelect) modelSelect.disabled = true;
        if(refreshModelsButton) refreshModelsButton.disabled = true;

        try {
            // Use the same fetchAvailableModels function we fixed above
            const models = await fetchAvailableModels();
            console.log("loadModels: Received models:", models);

            // Get saved model preference from settings
            const settings = await new Promise((resolve) => {
                chrome.storage.sync.get(['aiModel'], resolve);
            });
            const savedModel = settings.aiModel || 'google/gemini-2.5-pro';
            
            // Convert models to expected format if needed
            localAvailableModels = models.map(model => ({
                id: model.id,
                name: model.name || model.id,
                vision_capable: model.vision_capable || false,
                default: model.id === savedModel // Set default from settings
            }));

            // Find the default model ID
            serverDefaultModelId = localAvailableModels.find(m => m.default)?.id || (localAvailableModels.length > 0 ? localAvailableModels[0].id : null);
            console.log("loadModels: Default model ID:", serverDefaultModelId);

            populateModelDropdown(); // Use local populate
            hideStatus(); // Use local hideStatus

        } catch (error) {
            console.error('loadModels: Error loading models:', error);
            showStatus(`Error loading models: ${error.message}`, 'error', true); // Use local showStatus
            if(modelSelect) modelSelect.innerHTML = '<option value="">Error loading</option>';
        } finally {
            if(modelSelect) modelSelect.disabled = false;
            if(refreshModelsButton) refreshModelsButton.disabled = false;
            console.log("loadModels: Finished.");
        }
    }

    // Definition for populateModelDropdown
    function populateModelDropdown() {
        if (!modelSelect) return;
        modelSelect.innerHTML = ''; // Clear existing options
        console.log("populateModelDropdown: Populating with models:", localAvailableModels);

        if (localAvailableModels.length === 0) {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            // if(modelDescriptionText) modelDescriptionText.textContent = 'Could not load models from the server.'; // Removed
            return;
        }

        localAvailableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name + (model.vision_capable ? ' (Vision)' : '');
            // Select based on the serverDefaultModelId determined in loadModels
            option.selected = (model.id === serverDefaultModelId);
            modelSelect.appendChild(option);
        });

        // Trigger change event AFTER options are added
        // modelSelect.dispatchEvent(new Event('change')); // No longer needed as description is gone
         console.log("populateModelDropdown: Finished.");
    }

    async function testBackgroundConnection() {
        return new Promise((resolve) => {
            console.log('Testing background script connectivity...');
            
            // Add timeout for the ping
            const timeout = setTimeout(() => {
                console.error('Background ping timeout');
                resolve(false);
            }, 5000);
            
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    console.error('Background connectivity test failed:', chrome.runtime.lastError.message);
                    resolve(false);
                } else if (response && response.success) {
                    console.log('Background script is responsive');
                    resolve(true);
                } else {
                    console.warn('Background script returned unexpected response:', response);
                    resolve(false);
                }
            });
        });
    }

    async function wakeUpServiceWorker() {
        console.log('Attempting to wake up service worker...');
        
        // Try multiple wake-up attempts
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Wake-up attempt ${attempt}/3`);
            
            const isAwake = await testBackgroundConnection();
            if (isAwake) {
                console.log('Service worker is awake and responsive');
                return true;
            }
            
            // Wait before next attempt
            if (attempt < 3) {
                console.log('Waiting before next attempt...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.error('Failed to wake up service worker after 3 attempts');
        return false;
    }

    async function checkAuthenticationAndFetchConfig() {
        console.log("checkAuthenticationAndFetchConfig: Starting"); 
        try {
            // Wake up service worker and test connectivity
            const bgConnected = await wakeUpServiceWorker();
            if (!bgConnected) {
                console.warn('Background script not responding - some features may not work');
                // Show warning to user
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <div style="background: #fff3cd; color: #856404; padding: 8px; border-radius: 4px; margin-bottom: 10px; font-size: 12px;">
                            ⚠️ Background service worker not responding. Some features may not work properly.
                        </div>
                    `;
                }
            }
            
            // Check if we have the required API keys configured
            const settings = await new Promise((resolve) => {
                chrome.storage.sync.get(['openRouterKey', 'postmarkApiKey', 'fromEmail'], resolve);
            });
            
            if (!settings.openRouterKey || !settings.postmarkApiKey || !settings.fromEmail) {
                // Not configured - show auth section with link to settings
                console.log("checkAuthenticationAndFetchConfig: Missing API keys - showing auth section.");
                isAuthenticated = false;
                if (authSection) {
                    authSection.style.display = 'block';
                    authSection.innerHTML = `
                        <div style="text-align: center; padding: 20px;">
                            <h3>Setup Required</h3>
                            <p>Please configure your API keys and email settings.</p>
                            <button id="openSettingsBtn" class="btn btn-primary">Open Settings</button>
                        </div>
                    `;
                    
                    // Add click handler for settings button
                    document.getElementById('openSettingsBtn').addEventListener('click', () => {
                        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
                    });
                }
                if (formSection) formSection.style.display = 'none';
                hideStatus(); 
                return;
            }
            
            // Configuration found - proceed with normal flow
            console.log("checkAuthenticationAndFetchConfig: API keys found - authorized");
            isAuthenticated = true;
            if (authSection) authSection.style.display = 'none';
            if (formSection) formSection.style.display = 'block';
            hideStatus(); 
            
            console.log("checkAuthenticationAndFetchConfig: Loading models...");
            await loadModels(); 
            
            // Populate URL field with the current tab's URL
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http:') || tabs[0].url.startsWith('https:'))) {
                    if (urlInput) urlInput.value = tabs[0].url;
                    console.log("checkAuthenticationAndFetchConfig: Populated URL field.");
                }
            });

        } catch (error) {
            console.error('checkAuthenticationAndFetchConfig: Error:', error);
            showStatus(`Error: ${error.message}`, 'error', true); 
            // Ensure both sections are hidden on error
            if (authSection) authSection.style.display = 'none';
            if (formSection) formSection.style.display = 'none';
            console.log("checkAuthenticationAndFetchConfig: Hiding sections due to error.");
        }
    }

    // --- NEW: Function to check and apply context menu instructions ---
    async function applyContextMenuInstructions() {
        try {
            const data = await new Promise((resolve) => {
                chrome.storage.local.get(['contextMenuInstructions'], resolve);
            });

            if (data && data.contextMenuInstructions) {
                console.log("Applying context menu instructions:", data.contextMenuInstructions);
                if (instructionsInput) {
                    instructionsInput.value = data.contextMenuInstructions;
                }
                // Clear the stored value so it's not reused
                chrome.storage.local.remove('contextMenuInstructions', () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error removing context menu instructions:", chrome.runtime.lastError);
                    }
                });
            }
        } catch (error) {
            console.error("Error applying context menu instructions:", error);
        }
    }
    // ----------------------------------------------------------------

    // --- NEW: Refactored/Modified generateICS ---
    async function generateICS() {
        if (!isAuthenticated) {
            showStatus('Not authenticated.', 'error', true); // Still use showStatus for initial auth error
            return;
        }

        let showingReview = false; // <--- DECLARE showingReview here

        const urlValue = urlInput.value.trim();
        const instructionsValue = instructionsInput.value.trim();
        const selectedModelValue = modelSelect.value;
        const isTentativeValue = tentativeToggle.checked;
        const isMultidayValue = multidayToggle.checked;
        const reviewOptionValue = document.querySelector('input[name=\"review-option\"]:checked')?.value || 'direct';

        // Prepare request details text
        let requestDetailsText = `URL: ${urlValue || '(Using current tab)'}\n`;
        requestDetailsText += `Instructions: ${instructionsValue || '(None)'}\n`;
        requestDetailsText += `Model: ${selectedModelValue || '(Default)'}\n`;
        requestDetailsText += `Tentative: ${isTentativeValue}\n`;
        requestDetailsText += `Multi-day: ${isMultidayValue}\n`;
        requestDetailsText += `Review Option: ${reviewOptionValue}\n`;
        requestData.textContent = requestDetailsText;

        // Switch view - hide form during processing but keep back button enabled
        hideStatus(); // Hide main status div if it was shown
        hideReviewStatus();
        reviewSection.style.display = 'none';
        formSection.style.display = 'none'; // Hide the form during processing
        processingView.style.display = 'block';
        statusMessage.textContent = 'Processing...';
        statusMessage.className = 'alert alert-info mb-0';
        
        // Hide the response accordion during processing
        const responseAccordion = document.getElementById('responseAccordion');
        if (responseAccordion) {
            responseAccordion.classList.add('d-none');
        }
        // Hide the Close button and show Cancel button during processing
        const closeButton = document.getElementById('closeButton');
        const cancelButton = document.getElementById('cancelRequestButton');
        if (closeButton) {
            closeButton.style.display = 'none';
        }
        if (cancelButton) {
            cancelButton.style.display = 'block';
        }
        // Don't disable the back button - user should be able to cancel

        // Prepare data for background script - let background handle all Chrome API calls
        statusMessage.textContent = 'Preparing request...';
        
        const params = {
            url: urlValue, // Background script will get current tab URL if not provided
            html: '', // Background script will get HTML content from current tab
            instructions: instructionsValue,
            takeScreenshot: true, // Background script will handle screenshot capture
            tentative: isTentativeValue,
            multiday: isMultidayValue,
            reviewMode: reviewOptionValue,
            aiModel: selectedModelValue
        };
        
        try {
            // 4. Wake up service worker and send to background script for processing
            console.log('Waking up service worker for content processing...');
            const bgReady = await wakeUpServiceWorker();
            if (!bgReady) {
                throw new Error('Background service worker is not responding. Please try reloading the extension.');
            }
            
            let resultJson = null;
            const response = await chrome.runtime.sendMessage({
                action: 'processContent',
                params: params
            });
            
            // Handle Chrome runtime errors first
            if (chrome.runtime.lastError) {
                throw new Error(`Runtime error: ${chrome.runtime.lastError.message}`);
            }
            
            // Handle background script response
            if (!response) {
                throw new Error('No response from background script. Please check extension status and try again.');
            }
            
            console.log('Received response from background script:', response);
            
            if (!response.success) {
                throw new Error(response.error || 'Processing failed');
            }
            
            resultJson = response.result;
            const responseText = JSON.stringify(resultJson); // For debugging

            console.log("BACKGROUND SCRIPT RESPONSE:", resultJson);
            console.log("needsReview:", resultJson.needsReview);
            console.log("confirmationToken:", resultJson.confirmationToken);
            console.log("icsContent length:", resultJson.icsContent ? resultJson.icsContent.length : 'missing');
 
            if (resultJson.needsReview) {
                // Review is needed according to the server
                if (resultJson.confirmationToken && resultJson.icsContent) {
                    console.log("SHOWING REVIEW SECTION - conditions met");
                    // All required data for review is present
                    showReviewSection(resultJson);
                    showingReview = true;
                } else {
                    console.log("NOT SHOWING REVIEW - missing required data");
                    console.log("confirmationToken present:", !!resultJson.confirmationToken);
                    console.log("icsContent present:", !!resultJson.icsContent);
                    // Review needed, but data is missing! Show error in processing view.
                    console.error("Review needed, but missing confirmationToken or icsContent from server:", resultJson);
                    statusMessage.textContent = 'Error: Review data missing from server.';
                }
            } else {
                // Show PROCESSING view - Success (Sent Directly)
                statusMessage.textContent = 'Success (Sent Directly)';
                statusMessage.className = 'alert alert-success mb-0';
                
                // Create a cleaner success response structure
                let responseHTML = '';
                
                // Add the message directly without wrapper
                if (resultJson.message) {
                    responseHTML += `<p>${resultJson.message}</p>`;
                }
                
                // Add the event details directly, not in another card
                if (resultJson.icsContent) {
                    // Extract just the essential details 
                    responseHTML += parseAndDisplayIcs(resultJson.icsContent);
                } else {
                    // Fallback for no ICS content
                    responseHTML += `<pre class="plain-text">${responseText}</pre>`;
                }
                
                // Set the HTML
                responseData.innerHTML = responseHTML;
                
                // Show the response accordion
                const responseAccordion = document.getElementById('responseAccordion');
                if (responseAccordion) {
                    responseAccordion.classList.remove('d-none');
                }
                
                // Show the green Close button and hide Cancel button
                const closeButton = document.getElementById('closeButton');
                const cancelButton = document.getElementById('cancelRequestButton');
                if (closeButton) {
                    closeButton.style.display = 'block';
                    closeButton.addEventListener('click', () => {
                        // Close the iframe if we're in one, otherwise hide the processing view
                        if (window.self !== window.top) {
                            // We're in an iframe, send close message to parent
                            window.parent.postMessage({ type: 'CLOSE_IFRAME' }, '*');
                        } else {
                            // Regular popup, go back to form
                            hideProcessingView();
                            showFormSection();
                        }
                    });
                }
                if (cancelButton) {
                    cancelButton.style.display = 'none';
                }
                
                console.log("Success (Sent Directly), displayed details");
                
                // Leave showingReview as false
            }

        } catch (error) {
            // JS/Fetch error - Show PROCESSING view - Error
            console.error('generateICS Error:', error);
            statusMessage.textContent = `Error: ${error.message || 'Unknown error'}`;
            statusMessage.className = 'alert alert-danger mb-0';
            
            // Show detailed error information
            let errorDetails = `<div class="error-details">`;
            errorDetails += `<h4>Error Details:</h4>`;
            errorDetails += `<p><strong>Message:</strong> ${error.message || 'Unknown error'}</p>`;
            errorDetails += `<p><strong>Type:</strong> ${error.name || 'Unknown'}</p>`;
            
            if (error.stack) {
                errorDetails += `<p><strong>Stack Trace:</strong></p>`;
                errorDetails += `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; max-height: 200px; overflow-y: auto;">${error.stack}</pre>`;
            }
            
            // Add troubleshooting suggestions
            errorDetails += `<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">`;
            errorDetails += `<h5>Troubleshooting:</h5>`;
            errorDetails += `<ul style="margin: 5px 0; padding-left: 20px; font-size: 12px;">`;
            errorDetails += `<li>Try reloading the extension</li>`;
            errorDetails += `<li>Check your internet connection</li>`;
            errorDetails += `<li>Verify API keys in settings</li>`;
            errorDetails += `<li>Try with a different webpage</li>`;
            errorDetails += `</ul>`;
            errorDetails += `</div>`;
            errorDetails += `</div>`;
            
            responseData.innerHTML = errorDetails;
            
            // Show the response accordion with danger styling for errors
            const responseAccordion = document.getElementById('responseAccordion');
            if (responseAccordion) {
                responseAccordion.classList.remove('d-none');
                // Change to danger styling for errors
                const accordionItem = responseAccordion.querySelector('.accordion-item');
                if (accordionItem) {
                    accordionItem.classList.remove('border-primary');
                    accordionItem.classList.add('border-danger');
                }
            }
            // Leave showingReview as false
        } finally {
            // Back button should already be enabled (we don't disable it during processing)
            // Do NOT re-enable the main form here - let the back button handler do that
            // Always hide the cancel button when processing is done
            const cancelButton = document.getElementById('cancelRequestButton');
            if (cancelButton) {
                cancelButton.style.display = 'none';
            }
        }
    }
    // --------------------------------------------

    async function sendReviewedICS() {
        if (!reviewData || !reviewData.confirmationToken) {
            showReviewStatus('Error: Missing confirmation data.', 'error');
            return;
        }

        showReviewStatus('Sending confirmation...', 'loading');
        disableReviewButtons();

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'confirmEvent',
                confirmationToken: reviewData.confirmationToken
            });
            
            if (!response) {
                throw new Error('No response from background script. Please check extension status and try again.');
            }
            
            if (!response.success) {
                throw new Error(response.error || 'Confirmation failed');
            }

            // Success!
            showReviewStatus('Email sent successfully!', 'success');
            // Optionally hide review section after a delay or show a 'Done' button
            setTimeout(() => {
                hideReviewSection();
            }, 2500); // Hide after 2.5 seconds

        } catch (error) {
            console.error('Error sending confirmation:', error);
            showReviewStatus(`Error sending: ${error.message}`, 'error');
            disableReviewButtons(false); // Re-enable buttons on error
        }
    }

    // --- Event Listeners defined within this scope ---
    convertButton?.addEventListener('click', generateICS);
    refreshModelsButton?.addEventListener('click', () => loadModels(true));
    openServerPageButton?.addEventListener('click', () => {
        if (serverUrl) chrome.tabs.create({ url: serverUrl });
    });
    sendButton?.addEventListener('click', sendReviewedICS);
    rejectButton?.addEventListener('click', hideReviewSection);
    
    // Add state saving listeners for form changes
    urlInput?.addEventListener('input', () => tabStateManager.saveState());
    instructionsInput?.addEventListener('input', () => tabStateManager.saveState());
    modelSelect?.addEventListener('change', () => tabStateManager.saveState());
    tentativeToggle?.addEventListener('change', () => tabStateManager.saveState());
    multidayToggle?.addEventListener('change', () => tabStateManager.saveState());
    reviewRadioGroup?.forEach(radio => {
        radio.addEventListener('change', () => tabStateManager.saveState());
    });

    // Helper functions for view management
    function hideProcessingView() {
        if (processingView) {
            processingView.style.display = 'none';
        }
    }
    
    function showFormSection() {
        if (formSection) {
            formSection.style.display = 'block';
        }
        disableForm(false); // Re-enable the main form controls
    }

    // --- NEW Back Button Listener ---
    backToFormButton?.addEventListener('click', () => {
        hideProcessingView();
        showFormSection();
    });
    // -------------------------------
    
    // --- Cancel Request Button Listener ---
    cancelRequestButton?.addEventListener('click', () => {
        // Cancel the ongoing request
        console.log('Cancelling request...');
        
        // Update UI
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = 'Request cancelled by user';
            statusMessage.className = 'alert alert-warning mb-0';
        }
        
        // Hide cancel button and show close button
        cancelRequestButton.style.display = 'none';
        const closeButton = document.getElementById('closeButton');
        if (closeButton) {
            closeButton.style.display = 'block';
        }
        
        // Show the response accordion with warning styling for cancelled
        const responseAccordion = document.getElementById('responseAccordion');
        if (responseAccordion) {
            responseAccordion.classList.remove('d-none');
            // Change to warning styling for cancelled
            const accordionItem = responseAccordion.querySelector('.accordion-item');
            if (accordionItem) {
                accordionItem.classList.remove('border-primary');
                accordionItem.classList.add('border-warning');
            }
        }
        
        // Update response data
        const responseData = document.getElementById('responseData');
        if (responseData) {
            responseData.innerHTML = '<p class="text-muted">The request was cancelled.</p>';
        }
    });
    // --------------------------------------
    
    // --- NEW Keyboard Shortcut Listener ---
    document.addEventListener('keydown', function(event) {
        // Check if the active element is NOT a textarea or input to avoid interfering with typing
        const activeElement = document.activeElement;
        const isTypingArea = activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT');

        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !isTypingArea) {
            // Only trigger if form is visible and not currently processing
            if (formSection.style.display !== 'none' && processingView.style.display === 'none') {
                event.preventDefault();
                convertButton?.click(); 
            }
        }
    });
    // -----------------------------------

    // --- Initialization ---
    Promise.all([
        checkAuthenticationAndFetchConfig(),
        tabStateManager.initialize()
    ]).then(() => {
        // After auth check and basic UI setup, check for context menu instructions
        applyContextMenuInstructions();
        
        // Start periodic cleanup
        setInterval(() => tabStateManager.cleanup(), 3600000); // Every hour
    });

    function hideReviewSection() {
        reviewSection.style.display = 'none';
        formSection.style.display = 'block'; // Show the main form again
        reviewData = null;
        hideReviewStatus();
        disableForm(false); // Re-enable main form controls
    }

    // --- Updated iCal Parser Helper (using ical.js) ---
    function parseAndDisplayIcs(icsString) {
        console.log("parseAndDisplayIcs (using ical.js) called - icsString length:", icsString ? icsString.length : 'none');
        if (!icsString) return '<p>No ICS data available.</p>';

        try {
            const jcalData = ICAL.parse(icsString);
            const vcalendar = new ICAL.Component(jcalData);
            const vevent = vcalendar.getFirstSubcomponent('vevent');

            if (!vevent) {
                throw new Error('Could not find VEVENT component in ICS data.');
            }

            const event = new ICAL.Event(vevent);

            let html = '<dl class="ics-details">';

            // Helper to add property if it exists
            const addProperty = (label, value) => {
                if (value) {
                    // Unescape common characters and handle escaped newlines for display
                    const displayValue = String(value)
                        .replace(/\\,/g, ',')
                        .replace(/\\;/g, ';')
                        .replace(/\\\\/g, '\\')
                        .replace(/\\n/g, '<br>'); // Convert escaped newlines to HTML breaks
                    html += `<dt>${label}:</dt><dd>${displayValue}</dd>`;
                }
            };

            addProperty('Event', event.summary);
            addProperty('Location', event.location);

            // Format dates using toJSDate().toLocaleString() for better readability
            const startDate = event.startDate;
            const endDate = event.endDate;
            if (startDate) {
                try {
                    addProperty('Start', startDate.toJSDate().toLocaleString());
                } catch(dateError) {
                    console.warn("Could not format start date:", dateError);
                    addProperty('Start', startDate.toString()); // Fallback to basic string
                }
            }
            if (endDate) {
                 try {
                    addProperty('End', endDate.toJSDate().toLocaleString());
                 } catch(dateError) {
                    console.warn("Could not format end date:", dateError);
                    addProperty('End', endDate.toString()); // Fallback to basic string
                }
            }

            addProperty('Description', event.description);

            html += '</dl>';

            // Add the raw ICS for debugging (collapsible)
            html += '<details><summary>Raw ICS Data</summary><pre>';
            // Escape HTML characters in the raw ICS string for safe display within <pre>
            html += icsString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += '</pre></details>';

            return html;

        } catch (error) {
            console.error("Error parsing/displaying ICS with ical.js:", error);
            // Fallback: still provide at least the raw data, escaping HTML chars
            return `<p class="error">Error displaying ICS: ${error.message}</p>
                    <pre>${icsString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        }
    }

    // --- Updated showReviewSection ---
    function showReviewSection(data) { // Expects parsed JSON data
        console.log("showReviewSection called with data:", data);
        // Store necessary data for sending confirmation
        reviewData = {
            confirmationToken: data.confirmationToken,
            recipientEmail: data.recipientEmail, // Keep for display
            emailSubject: data.emailSubject,     // Keep for display
            icsContent: data.icsContent           // Keep for display/debugging
        };
        console.log("reviewData set:", reviewData);

        reviewRecipient.textContent = data.recipientEmail || 'Unknown';
        reviewSubject.textContent = data.emailSubject || 'No Subject'; // Populate subject
        console.log("Review recipient/subject populated");

        // Parse and display the ICS content using the helper
        console.log("About to parse ICS content using ical.js");
        reviewContent.innerHTML = parseAndDisplayIcs(data.icsContent || '');
        console.log("ICS content parsed and set to innerHTML");

        formSection.style.display = 'none';
        processingView.style.display = 'none'; // Hide processing view too
        reviewSection.style.display = 'block';
        console.log("Display set: formSection=none, processingView=none, reviewSection=block");
        hideStatus();
        hideReviewStatus();
        disableReviewButtons(false);
        console.log("Review section display complete");
    }
});
// ... rest of the file ...
