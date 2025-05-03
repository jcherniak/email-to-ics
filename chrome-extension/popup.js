// popup.js
// DOM elements
const contentDiv = document.getElementById('content');
const statusDiv = document.getElementById('status');

// Global state
let availableModels = [];
let selectedModel = null;
let pageScreenshot = null;
let baseUrl = 'https://new.justin-c.com/email-to-ics'; // Add default base URL
let targetUrl = `${baseUrl}/?display=email`;
let modelsEndpointUrl = `${baseUrl}/?get_models=1`;
let debugMode = false; // Add debug mode flag
let lastSubmitParams = null; // Store last submission details for retry

// --- Initial state ---
init();

async function init() {
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
            showCredentialsForm(); // Show login if missing creds or base URL
        } else {
            // Credentials exist, now fetch models
            const modelsPromise = fetchAvailableModels();
            try {
                // Remove screenshot capture from init
                // const screenshotPromise = captureFullPageScreenshot();

                // Wait only for models
                // const [models, screenshot] = await Promise.all([
                //     modelsPromise,
                //     screenshotPromise
                // ]);
                 const models = await modelsPromise;
                
                availableModels = models;
                // pageScreenshot = screenshot; // Remove screenshot handling here
                
                selectedModel = prefs.defaultModel || (availableModels.length > 0 ? (availableModels.find(model => model.default) || availableModels[0]).id : null);
                debugMode = prefs.debugMode || false;
                
                showForm(prefs);
            } catch (error) {
                console.error("Error initializing models:", error); // Updated error message
                availableModels = await modelsPromise.catch(() => []);
                // pageScreenshot = null; // No screenshot here
                selectedModel = prefs.defaultModel || null;
                showForm(prefs);
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

// Updated to accept and pre-fill username
async function showCredentialsForm(errorMessage = null) {
    const storedUsername = await getStoredUsername(); // Now await works directly
    
    contentDiv.innerHTML = `
        <form id="credentials-form">
            <h3>Email to ICS Configuration</h3>
            ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
            <p>
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required value="${storedUsername || ''}">
            </p>
            <p>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </p>
            <p>
                <label for="base-url">Base URL:</label>
                <input type="url" id="base-url" name="base-url" required value="${baseUrl || 'https://new.justin-c.com/email-to-ics'}">
            </p>
            <div class="checkbox-container">
                 <input type="checkbox" id="debug-mode" name="debug-mode" ${debugMode ? 'checked' : ''}>
                 <label for="debug-mode">Enable Debug Mode</label>
            </div>
            <menu>
                <button type="submit">Save Configuration</button>
            </menu>
        </form>
        <p class="note">Your credentials are stored locally in your browser.</p>
    `;
    statusDiv.className = 'hidden';
    contentDiv.style.display = 'block';

    // Add listener for the credentials form *after* innerHTML is set
    const form = document.getElementById('credentials-form');
    if (form) {
        form.addEventListener('submit', saveCredentials);
    }
}

async function saveCredentials(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const newBaseUrl = document.getElementById('base-url').value.trim();
    const newDebugMode = document.getElementById('debug-mode').checked;

    if (!username || !password || !newBaseUrl) {
        showCredentialsForm("Username, password, and Base URL are required");
        return;
    }
    
    // Validate URL format (simple check)
    try {
        new URL(newBaseUrl);
    } catch (_) {
        showCredentialsForm("Invalid Base URL format");
        return;
    }

    // Save to Chrome storage, including debugMode
    chrome.storage.sync.set({ username, password, baseUrl: newBaseUrl, debugMode: newDebugMode }, () => {
        if (chrome.runtime.lastError) {
            showCredentialsForm(`Error saving credentials: ${chrome.runtime.lastError.message}`);
        } else {
            debugMode = newDebugMode; // Update global state
            init(); // Reinitialize with new credentials and settings
        }
    });
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
function showForm(preferences = {}) {
    // Use preferences or defaults
    const includeScreenshot = preferences.takeScreenshots !== false;
    
    // Create model dropdown options
    const modelOptions = availableModels.map(model => 
        `<option value="${model.id}" ${model.id === selectedModel ? 'selected' : ''} title="${model.description}">
            ${model.name}${model.vision_capable ? ' (Vision)' : ''}
        </option>`
    ).join('');

    // Default option if no models available
    const defaultOption = `<option value="" selected>Use server default</option>`;
    
    contentDiv.innerHTML = `
        <form id="ics-form">
            <p>
                <label for="model">AI Model:</label>
                <select id="model" name="model">
                    ${modelOptions.length ? modelOptions : defaultOption}
                </select>
            </p>
            <p>
                <label for="instructions">Special Instructions (optional):</label>
            </p>
            <p>
                <textarea id="instructions" name="instructions"></textarea>
            </p>
            <div class="checkbox-container">
                <input type="checkbox" id="include-screenshot" name="include-screenshot" ${includeScreenshot ? 'checked' : ''}>
                <label for="include-screenshot">Include page screenshot</label>
            </div>
            <menu>
                <button type="submit">Submit</button>
                <button type="button" id="config-button">Settings</button>
                <button type="button" id="logout-button" class="logout-button">Logout</button>
            </menu>
        </form>
    `;
    statusDiv.className = 'hidden';
    contentDiv.style.display = 'block';

    // Check for instructions passed from the context menu
    chrome.storage.local.get(['contextMenuInstructions'], (result) => {
        if (result.contextMenuInstructions) {
            const instructionsTextArea = document.getElementById('instructions');
            if (instructionsTextArea) {
                console.log("Populating instructions from context menu:", result.contextMenuInstructions);
                instructionsTextArea.value = result.contextMenuInstructions;
            }
            // Clear the stored instruction so it's not reused
            chrome.storage.local.remove('contextMenuInstructions');
        }
    });

    // Store selected model from dropdown
    const modelSelect = document.getElementById('model');
    if (modelSelect) {
        selectedModel = modelSelect.value;
        modelSelect.addEventListener('change', () => {
            selectedModel = modelSelect.value;
            // Save preferences when model changes
            savePreferences(
                document.getElementById('include-screenshot').checked,
                selectedModel,
                debugMode // Pass current debugMode
            );
        });
    }
    
    // Save preferences when screenshot checkbox changes
    const screenshotCheckbox = document.getElementById('include-screenshot');
    if (screenshotCheckbox) {
        screenshotCheckbox.addEventListener('change', () => {
            savePreferences(
                screenshotCheckbox.checked,
                selectedModel,
                debugMode // Pass current debugMode
            );
        });
    }

    // Add listeners AFTER form is in the DOM
    document.getElementById('ics-form').addEventListener('submit', handleSubmit);
    document.getElementById('config-button').addEventListener('click', () => showCredentialsForm());
    document.getElementById('logout-button').addEventListener('click', logout);

    // --- BEGIN ADDED CODE for Cmd/Ctrl+Enter ---
    const instructionsTextarea = document.getElementById('instructions');
    if (instructionsTextarea) {
        instructionsTextarea.addEventListener('keydown', (event) => {
            // Check for Cmd+Enter or Ctrl+Enter
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault(); // Prevent adding a newline
                console.log("Cmd/Ctrl+Enter detected, submitting form.");
                // Find the form and trigger the submit handler
                // Note: We pass null instead of the event because handleSubmit expects
                //       an optional event from the form submit, not the keydown event.
                handleSubmit(null); 
            }
        });
    }
    // --- END ADDED CODE ---
}

// Modify showStatus to add Retry button always and manage body class
function showStatus(type, messageHtml) {
    statusDiv.innerHTML = messageHtml;
    statusDiv.className = type; 
    contentDiv.style.display = 'none'; 

    // Add/remove error class to body for sizing
    if (type === 'error') {
        document.body.classList.add('error-state');
    } else {
        document.body.classList.remove('error-state');
    }

    // Always add a retry button if there are params to retry with
    // (and remove any existing one first to avoid duplicates)
    const existingRetryButton = document.getElementById('retry-button');
    if (existingRetryButton) {
        existingRetryButton.remove();
    }
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px'; // Add space above buttons

    // Only add retry if there's something to retry
    if (lastSubmitParams) { 
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Last Submission';
        retryButton.id = 'retry-button';
        retryButton.style.marginRight = '5px'; // Add some space
        retryButton.addEventListener('click', handleRetry);
        buttonContainer.appendChild(retryButton); // Append to container
    }

    // Add a button to go back to the form
    const backButton = document.createElement('button');
    backButton.textContent = 'New Request';
    backButton.addEventListener('click', () => {
        lastSubmitParams = null; // Clear retry state when going back
        init(); // Re-initialize to show the form
    });
    buttonContainer.appendChild(backButton);

    // Append the container with buttons to the status div
    statusDiv.appendChild(buttonContainer);

    /* Original logic for adding button only on error:
    if (type === 'error') {
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.id = 'retry-button';
        retryButton.style.marginTop = '10px';
        retryButton.addEventListener('click', handleRetry);
        statusDiv.appendChild(retryButton);
    }
    */
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

// --- Get Page Content ---
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

// Refactor handleSubmit to handle initial submission and store params
async function handleSubmit(event) {
    if (event) event.preventDefault(); // Prevent default form submission if called by event

    const instructions = document.getElementById('instructions').value;
    const includeScreenshotCheckbox = document.getElementById('include-screenshot');
    const includeScreenshot = includeScreenshotCheckbox.checked;
    const currentModel = selectedModel; // Use the globally selected model

    // Store these params for potential retry
    lastSubmitParams = {
        instructions,
        includeScreenshot,
        model: currentModel
    };

    // Call the core logic function
    await executeSubmit(lastSubmitParams);
}

// New function for the core submission logic
async function executeSubmit(params) {
    const { instructions, includeScreenshot, model } = params;
    
    const credData = await getStoredCredentials();
    if (!credData) { 
        showStatus('error', '<strong>Error:</strong><br>Credentials not configured. Please set your username and password.');
        setTimeout(() => showCredentialsForm(), 2000); 
        return;
    }
    const credentials = credData.encoded;

    showStatus('generating', `Generating ICS... <span id="spinner"></span>`);

    let pageScreenshot = null; 
    let requestBody = {};

    try {
        const tab = await getActiveTab();
        const pageData = await getPageContent(tab.id);

        if (includeScreenshot) {
             showStatus('generating', `Capturing screenshot... <span id="spinner"></span>`);
             pageScreenshot = await captureVisibleTabScreenshot(); 
             if (!pageScreenshot) {
                console.warn("Visible tab screenshot capture failed or was skipped, proceeding without it.");
                showStatus('generating', `Screenshot failed. Generating ICS... <span id="spinner"></span>`);
             } 
        } else {
            // If not taking screenshot, ensure status is updated before sending
             showStatus('generating', `Generating ICS... <span id="spinner"></span>`);
        }

        // Prepare request body (URLSearchParams)
        const body = new URLSearchParams({
            url: pageData.url,
            html: pageData.html,
            instructions: instructions || '',
            fromExtension: '1' // Add the flag here
        });

        if (model) {
            body.append('model', model);
        }

        if (includeScreenshot && pageScreenshot) {
            body.append('screenshot', pageScreenshot.split(',')[1]);
        }

        // --> ADDED: Update status before sending the request <--
        showStatus('generating', `Sending request, waiting for response... <span id="spinner"></span>`);

        requestBody = {
            method: 'POST',
            url: targetUrl, // Base target URL
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString() 
        };

        // The targetUrl for fetch remains the base one,
        // the flag is now part of the URLSearchParams body.
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + credentials
            },
            body: body // Send the body containing the flag
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = responseText;
            // Attempt to parse JSON error from server first
            try {
                const errorJson = JSON.parse(responseText);
                if (errorJson.error) {
                    errorMessage = errorJson.error; 
                }
            } catch (e) { 
                // If not JSON, try parsing HTML
                try {
                    const doc = new DOMParser().parseFromString(responseText, "text/html");
                    const bodyContent = doc.body.innerHTML;
                    if (bodyContent) errorMessage = bodyContent;
                } catch (htmlError) { /* Ignore if HTML parsing fails, stick with text */ }
            }
            throw new Error(errorMessage);
        }
        
        // --- Success path ---
        // lastSubmitParams = null; // No longer clear params on success to allow retry
        if (debugMode) {
            const debugOutput = `
                <strong>Request Sent:</strong>
                <pre>${JSON.stringify(requestBody, null, 2)}</pre>
                <strong>Response Status:</strong> ${response.status}
                <strong>Response Body:</strong>
                <pre>${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}</pre>
            `;
            showStatus('success', `ICS sent to email successfully! <br>${debugOutput}`);
        } else {
            showStatus('success', 'ICS sent to email successfully!');
        }

    } catch (error) {
        console.error('Error submitting:', error);
        const escapedErrorMessage = (error.message || 'Unknown error').replace(/"/g, '&quot;');
        
        let errorDisplay = `<strong>Error:</strong><br><iframe class="error-frame" srcdoc="${escapedErrorMessage}"></iframe>`;
        if (debugMode) {
             const debugOutput = `
                <strong>Request Details (if available):</strong>
                <pre>${JSON.stringify(requestBody, null, 2)}</pre>
                <strong>Error:</strong>
            `;
             errorDisplay = `${debugOutput}<iframe class="error-frame" srcdoc="${escapedErrorMessage}"></iframe>`;
        }
        // Pass the generated error message to showStatus
        showStatus('error', errorDisplay);
    }
}

// Function to handle the retry button click
async function handleRetry() {
    if (lastSubmitParams) {
        console.log("Retrying last submission with params:", lastSubmitParams);
        // Disable retry button immediately to prevent multiple clicks
        const retryButton = document.getElementById('retry-button');
        if (retryButton) retryButton.disabled = true;
        // Re-execute the submission logic with stored parameters
        await executeSubmit(lastSubmitParams);
    } else {
        console.warn("Retry clicked but no last submission parameters found.");
        // Optionally show the main form again or a message
        showForm(); // Go back to the main form
    }
}

// Function to get stored base URL
async function getStoredBaseUrl() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['baseUrl'], (result) => {
            resolve(result.baseUrl || null);
        });
    });
}

// --- Logout Function ---
async function logout() {
    // Clear all relevant stored data
    chrome.storage.sync.remove(['username', 'password', 'baseUrl', 'takeScreenshots', 'defaultModel', 'debugMode'], () => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing storage:", chrome.runtime.lastError);
            // Show error in credentials form maybe?
            showCredentialsForm(`Error during logout: ${chrome.runtime.lastError.message}`);
        } else {
            console.log("Cleared stored settings.");
            // Reset state variables
            baseUrl = 'https://new.justin-c.com/email-to-ics';
            targetUrl = `${baseUrl}/?display=email`;
            modelsEndpointUrl = `${baseUrl}/?get_models=1`;
            availableModels = [];
            selectedModel = null;
            pageScreenshot = null;
            debugMode = false;
            // Show the login form again
            showCredentialsForm();
        }
    });
} 