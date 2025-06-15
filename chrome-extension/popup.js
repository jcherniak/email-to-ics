// popup.js
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
                
                selectedModel = prefs.defaultModel || (availableModels.length > 0 ? (availableModels.find(model => model.default) || availableModels[0]).id : null);
                debugMode = prefs.debugMode || false;
                
                showForm(prefs); // Calls showForm -> Original logic tried to set contentDiv.innerHTML
            } catch (error) {
                console.error("Error initializing models:", error); 
                availableModels = await modelsPromise.catch(() => []);
                selectedModel = prefs.defaultModel || null;
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
        // Remove the redundant credential check - this function is now only called when logged in
        /*
        const credentials = await getStoredCredentials(); // Check credentials first
        if (!credentials) {
            console.warn("Cannot fetch models: Credentials not found during fetch.");
            return []; // Return empty array immediately if no credentials
        }
        */
        const credentials = await getStoredCredentials(); // Still need credentials for the header
        
        const headers = {
            'Authorization': 'Basic ' + credentials
        };

        // Add the flag to the models endpoint URL
        const urlWithFlag = `${modelsEndpointUrl}&fromExtension=1`;

        // Use dynamic modelsEndpointUrl and add auth header
        const response = await fetch(urlWithFlag, { headers });
        if (!response.ok) {
            const errorText = await response.text(); // Log detailed error
            console.error(`Fetch models response error (${response.status}):`, errorText);
            throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data = await response.json();
        console.log("Available models:", data);
        return data.models || [];
    } catch (error) {
        console.error("Error fetching models:", error);
        return [];
    }
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
    // Add a manual handler for the collapse functionality
    document.querySelector('[data-bs-toggle="collapse"]').addEventListener('click', function() {
        // Toggle the collapse
        const targetId = this.getAttribute('data-bs-target');
        const targetElement = document.querySelector(targetId);
        
        // Toggle the aria-expanded attribute
        const isCurrentlyExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isCurrentlyExpanded);
        
        // Toggle the collapse element
        if (targetElement) {
            targetElement.classList.toggle('show');
        }
    });
    
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
            const response = await fetch(`${serverUrl}?get_models=true`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                 credentials: 'include' // Send cookies
            });

             console.log("loadModels: Fetch response status:", response.status);

            if (!response.ok) {
                 if (response.status === 401) {
                     console.log("loadModels: Status 401 - Unauthorized during refresh");
                     isAuthenticated = false;
                     if (authSection) authSection.style.display = 'block';
                     if (formSection) formSection.style.display = 'none';
                     hideStatus();
                     return;
                 }
                 const errorText = await response.text();
                 console.error("loadModels: Fetch failed:", errorText);
                 throw new Error(`Failed to fetch models: ${response.statusText}`);
             }

            const data = await response.json();
             console.log("loadModels: Received data:", data);

            if (!data || !Array.isArray(data.models)) {
                console.error("loadModels: Invalid model data received:", data);
                throw new Error('Invalid model data received from server.');
            }

            localAvailableModels = data.models; // Store in local scope variable
            // Find the default model ID from the response
            serverDefaultModelId = localAvailableModels.find(m => m.default)?.id || (localAvailableModels.length > 0 ? localAvailableModels[0].id : null);
            console.log("loadModels: Server default model ID:", serverDefaultModelId);

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

    async function checkAuthenticationAndFetchConfig() {
        console.log("checkAuthenticationAndFetchConfig: Starting"); 
        try {
            // 1. Get Base URL from storage
            console.log("checkAuthenticationAndFetchConfig: Getting baseUrl from storage");
            const data = await new Promise((resolve) => {
                chrome.storage.sync.get(['baseUrl'], resolve);
            });
            serverUrl = data.baseUrl;

            // Fetch config to get server URL - REMOVED
            /* 
            console.log("checkAuthenticationAndFetchConfig: Fetching config.json");
            const configResponse = await fetch(chrome.runtime.getURL('config.json'));
            if (!configResponse.ok) throw new Error('Failed to load config.json');
            const config = await configResponse.json();
            serverUrl = config.serverUrl;
            */
           
            console.log("checkAuthenticationAndFetchConfig: Got serverUrl from storage:", serverUrl);

            if (!serverUrl) {
                // If no URL stored, treat as unauthorized/needs configuration
                console.log("checkAuthenticationAndFetchConfig: No serverUrl in storage - showing auth section.");
                isAuthenticated = false;
                if (authSection) authSection.style.display = 'block';
                if (formSection) formSection.style.display = 'none';
                hideStatus(); 
                return; // Stop further execution
            }

            // Ensure trailing slash for consistency
            if (!serverUrl.endsWith('/')) {
                serverUrl += '/';
            }

            // 2. Check auth by trying to fetch models
            showStatus('Checking authentication...'); 
            console.log("checkAuthenticationAndFetchConfig: Fetching models for auth check:", `${serverUrl}?get_models=true`);
            const modelsResponse = await fetch(`${serverUrl}?get_models=true`, {
                method: 'GET',
            headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            console.log("checkAuthenticationAndFetchConfig: Auth check response status:", modelsResponse.status);

            if (modelsResponse.status === 401) {
                // Unauthorized
                console.log("checkAuthenticationAndFetchConfig: Status 401 - Unauthorized");
                isAuthenticated = false;
                if (authSection) authSection.style.display = 'block';
                if (formSection) formSection.style.display = 'none';
                hideStatus(); 
                console.log("checkAuthenticationAndFetchConfig: Showing auth section.");
            } else if (!modelsResponse.ok) {
                // Other server error
                console.error("checkAuthenticationAndFetchConfig: Auth check fetch failed (not OK)");
                throw new Error(`Server error checking auth: ${modelsResponse.statusText}`);
            } else {
                // Authorized
                 console.log("checkAuthenticationAndFetchConfig: Status OK - Authorized");
                isAuthenticated = true;
                if (authSection) authSection.style.display = 'none';
                if (formSection) formSection.style.display = 'block';
                hideStatus(); 
                console.log("checkAuthenticationAndFetchConfig: Showing form section, loading models...");
                await loadModels(); 
                // Populate URL field with the current tab's URL
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http:') || tabs[0].url.startsWith('https:'))) {
                        if (urlInput) urlInput.value = tabs[0].url;
                         console.log("checkAuthenticationAndFetchConfig: Populated URL field.");
                    }
                });
            }

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

        // Switch view - keep form visible during processing
        hideStatus(); // Hide main status div if it was shown
        hideReviewStatus();
        reviewSection.style.display = 'none';
        processingView.style.display = 'block';
        // Keep formSection visible below the processing view
        statusMessage.textContent = 'Processing...';
        statusMessage.className = 'status-loading';
        responseData.textContent = '';
        disableForm(); // Disable original form fields
        backToFormButton.disabled = true; // Disable back button during processing

        let htmlContent = '';
        let screenshotViewportData = null;
        let screenshotZoomedData = null;

        try {
            // 1. Get current page HTML (unchanged)
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) throw new Error("Could not get active tab.");
            const tabId = tabs[0].id;
            const currentTabUrl = tabs[0].url;
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => document.documentElement.outerHTML
            });
            if (results && results[0] && results[0].result) htmlContent = results[0].result;
            else console.warn("Could not get HTML content.");

            // 2. Capture screenshots (unchanged, update status message)
            statusMessage.textContent = 'Capturing screenshots...';
            try {
                screenshotViewportData = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 });
                if (screenshotViewportData && screenshotViewportData.startsWith('data:image/jpeg;base64,')) {
                    screenshotViewportData = screenshotViewportData.substring('data:image/jpeg;base64,'.length);
                } else screenshotViewportData = null;
            } catch (vpError) { console.error('Viewport screenshot failed:', vpError); screenshotViewportData = null; }

            try {
                const zoomedDataUrl = await captureVisibleTabScreenshot();
                if (zoomedDataUrl && zoomedDataUrl.startsWith('data:image/jpeg;base64,')) {
                    screenshotZoomedData = zoomedDataUrl.substring('data:image/jpeg;base64,'.length);
                } else screenshotZoomedData = null;
            } catch (zoomError) { console.error('Zoomed screenshot failed:', zoomError); screenshotZoomedData = null; }

            // 3. Prepare data for server
            statusMessage.textContent = 'Sending to server...';
            const formData = new URLSearchParams();
            formData.append('url', urlValue || currentTabUrl); 
            formData.append('html', htmlContent);
            formData.append('instructions', instructionsValue);
            formData.append('model', selectedModelValue);
            formData.append('tentative', isTentativeValue ? '1' : '0');
            formData.append('multiday', isMultidayValue ? '1' : '0');
            formData.append('review', reviewOptionValue === 'review' ? '1' : '0');
            formData.append('fromExtension', 'true');
            formData.append('display', 'email');
            if (screenshotViewportData) formData.append('screenshot_viewport', screenshotViewportData);
            if (screenshotZoomedData) formData.append('screenshot_zoomed', screenshotZoomedData);

            // 4. Send data to server (modified response handling)
            let resultJson = null;
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData,
                credentials: 'include'
            });
            
            const responseText = await response.text(); // Get raw text response

            console.log("RAW RESPONSE TEXT (first 100 chars):", responseText.substring(0, 100));
            // Check if it looks like JSON with needsReview: true
            if (responseText.includes('\"needsReview\":true')) {
                console.log("RAW TEXT CONTAINS needsReview:true!");
            }
            
            if (!response.ok) {
                // Show error in processing view
                statusMessage.textContent = `Error: ${response.status} ${response.statusText}`;
                statusMessage.className = 'status-error';
                console.error("Server returned error:", response.status, responseText);
                responseData.textContent = responseText; // Show raw error response
            } else {
                // Try parsing successful response as JSON
                try {
                    resultJson = JSON.parse(responseText);
                    console.log("PARSED JSON RESPONSE:", resultJson);
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
                        statusMessage.className = 'status-success';
                        
                        // Create a cleaner success response structure
                        let responseHTML = '';
                        
                        // Add the success message
                        if (resultJson.message) {
                            responseHTML += `<div class="success-message">${resultJson.message}</div>`;
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
                        
                        console.log("Success (Sent Directly), displayed details");
                        
                        // Leave showingReview as false
                    }
                } catch (e) {
                    // JSON parsing failed, show raw response in processing view
                    console.warn("Could not parse JSON response, showing raw text.", e);
                    statusMessage.textContent = 'Success (Raw Response)';
                    statusMessage.className = 'status-success';
                    responseData.textContent = responseText;
                    // Leave showingReview as false
                }
            }

        } catch (error) {
            // JS/Fetch error - Show PROCESSING view - Error
            console.error('generateICS Error:', error);
            statusMessage.textContent = `Error: ${error.message || 'Unknown error'}`;
            statusMessage.className = 'status-error';
            responseData.textContent = error.stack || ''; // Show stack trace in response for JS errors
            // Leave showingReview as false
        } finally {
            // Only enable back button if processing view is shown
            if (!showingReview && backToFormButton) {
                backToFormButton.disabled = false;
            }
            // Do NOT re-enable the main form here regardless
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
            const formData = new URLSearchParams();
            formData.append('confirmationToken', reviewData.confirmationToken);

            const response = await fetch(`${serverUrl}?confirm=true`, { // Send to confirmation endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
                credentials: 'include'
            });

            const resultText = await response.text(); // Get text response

            if (!response.ok) {
                let errorMsg = `Server error: ${response.status}`; 
                try { errorMsg += `: ${JSON.parse(resultText).error}`; } catch(e){} // Try to get JSON error
                throw new Error(errorMsg);
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

    // --- NEW Back Button Listener ---
    backToFormButton?.addEventListener('click', () => {
        processingView.style.display = 'none';
        formSection.style.display = 'block';
        disableForm(false); // Re-enable the main form controls
    });
    // -------------------------------
    
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
    checkAuthenticationAndFetchConfig().then(() => {
        // After auth check and basic UI setup, check for context menu instructions
        applyContextMenuInstructions();
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

// Make sure the old code block above the DOMContentLoaded listener is removed or fully commented out. 

// Import the ical.js library
import ICAL from 'ical.js';

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
// ... rest of the file ...