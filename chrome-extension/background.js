// background.js
const CONTEXT_MENU_ID = "emailToIcsSelection";

let emailProcessor = null;
let isReady = false;
let initializationPromise = null;

// Service worker startup logging
console.log('Background service worker starting...');

// Import EmailProcessor synchronously at module level
try {
    console.log('Importing EmailProcessor...');
    importScripts('email-processor.js');
    console.log('EmailProcessor imported successfully');
} catch (error) {
    console.error('Failed to import EmailProcessor:', error);
}

// Initialize EmailProcessor with proper error handling
async function initializeEmailProcessor() {
    // Use singleton pattern with promise caching
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            if (!emailProcessor) {
                // Check if EmailProcessor class is available
                if (typeof EmailProcessor === 'undefined') {
                    throw new Error('EmailProcessor class not available - import failed');
                }
                
                console.log('Creating new EmailProcessor instance...');
                emailProcessor = new EmailProcessor();
                console.log('EmailProcessor created, initializing from storage...');
                await emailProcessor.initializeFromStorage();
                console.log('EmailProcessor initialization completed');
            }
            return emailProcessor;
        } catch (error) {
            console.error('Failed to initialize EmailProcessor:', error);
            emailProcessor = null;
            initializationPromise = null; // Reset for retry
            throw new Error(`EmailProcessor initialization failed: ${error.message}`);
        }
    })();
    
    return initializationPromise;
}

// --- Service Worker Event Listeners ---
chrome.runtime.onStartup.addListener(() => {
    console.log('Service worker onStartup event');
    isReady = true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Service worker onInstalled event');
    isReady = true;
    
    // Create context menu
    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: "Send selection as ICS instructions",
        contexts: ["selection"]
    });
    console.log("Context menu created.");
});

// Set ready state immediately for immediate availability
isReady = true;
console.log('Service worker ready state set to true');

// Add immediate message listener test
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Service worker received message:', message?.action || 'unknown', message);
    
    // Handle ping immediately without any async operations
    if (message.action === 'ping') {
        console.log('Service worker responding to ping');
        sendResponse({ success: true, message: 'Service worker is responsive' });
        return; // Don't return true for sync response
    }
    
    // For all other messages, we'll handle them in the main handler below
    return true; // Keep channel open for async operations
});

console.log('Message listener registered');

// Function to be injected into the page to get selected HTML
function getSelectedHtmlFragment() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        return null; // No selection
    }
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML; // Return the HTML of the selected fragment
}

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const prefix = "Focus on this section exclusively. Use surrounding html for other context, but this is the event we want:\n\n";
        
        try {
            // Inject script to get the HTML fragment
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: getSelectedHtmlFragment
            });

            let selectedContent = info.selectionText; // Fallback to plain text
            if (results && results[0] && results[0].result) {
                selectedContent = results[0].result; // Use HTML fragment if successful
                console.log("Context menu got HTML fragment:", selectedContent);
            } else {
                 console.warn("Could not get HTML fragment, using selection text instead.");
            }
           
            const instructions = prefix + selectedContent; // Combine prefix and content (HTML or text)
            console.log("Context menu storing instructions:", instructions);

            // 1. Store the instructions
            chrome.storage.local.set({ contextMenuInstructions: instructions }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error saving context menu instructions:", chrome.runtime.lastError);
                } else {
                    console.log("Context menu instructions saved.");
                    // 2. Open the popup
                    chrome.action.openPopup({}, (window) => {
                        if (chrome.runtime.lastError) {
                           console.warn("Could not open popup via context menu:", chrome.runtime.lastError.message);
                        } else {
                           console.log("Popup opened via context menu.");
                        }
                    });
                }
            });

        } catch (error) {
            console.error("Error injecting script or processing selection:", error);
            // Optionally, handle the error, maybe fall back to just text?
            // For now, just log it. The popup might open without instructions.
        }
  }
});

// --- Helper to get page content ---
async function getPageContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => ({
        url: window.location.href,
        html: document.documentElement.outerHTML
      })
    });
    // Check if the script executed successfully and returned a result
    if (results && results[0] && results[0].result) {
      return results[0].result;
    } else {
      console.error("Script execution failed or returned no result.", results);
      throw new Error("Could not get page content.");
    }
  } catch (error) {
    console.error("Error executing script:", error);
    // Check for specific Chrome errors like missing permissions or invalid tab
     if (chrome.runtime.lastError) {
        console.error("Chrome runtime error:", chrome.runtime.lastError.message);
        throw new Error(`Failed to get page content: ${chrome.runtime.lastError.message}`);
     }
    throw error; // Re-throw other errors
  }
}

// Helper function definitions
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

// Helper function to scroll (runs in tab context)
function scrollToPosition(x, y) {
    window.scrollTo(x, y);
}

// Updated screenshot logic using zoom and scroll
async function captureVisibleTabScreenshot(tabId) {
    let originalState = {}; 
    let dataUrl = null;

    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) throw new Error(`Tab with id ${tabId} not found.`);

        // Hide the iframe first
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'hide-iframe' });
            // Wait a bit for the hide to take effect
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            // Iframe might not be present, continue anyway
            console.log("Could not hide iframe, continuing with screenshot");
        }

        // 1. Get dimensions and original state
        const [initialResult] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
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
            target: { tabId: tabId },
            func: scrollToPosition,
            args: [0, 0]
        });

        // 3. Calculate zoom
        const zoomX = state.innerWidth / state.scrollWidth;
        const zoomY = state.innerHeight / state.scrollHeight;
        const zoomFactor = Math.min(zoomX, zoomY, 1);

        if (zoomFactor < 1) {
            // 4. Apply zoom
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
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
            throw new Error("captureVisibleTab returned empty result after zoom/scroll (background).");
        }
        
        console.log("Zoomed+Scrolled screenshot captured successfully from background script");
        return dataUrl.split(',')[1]; 

    } catch (error) {
        console.error("Zoomed+Scrolled screenshot capture error (background):", error);
        return null;
    } finally {
        // 7. Cleanup: Always try to restore zoom and scroll
        if (Object.keys(originalState).length > 0) { 
             try {
                // Remove zoom first
                await chrome.scripting.executeScript({
                    target: { tabId: tabId }, 
                    func: removeZoomStyle,
                    args: [originalState.zoom, originalState.transformOrigin]
                });
                // Then restore scroll
                await chrome.scripting.executeScript({
                    target: { tabId: tabId }, 
                    func: scrollToPosition,
                    args: [originalState.scrollX, originalState.scrollY]
                });
            } catch (cleanupError) {
                console.error("Error cleaning up zoom/scroll style (background):", cleanupError);
            }
        }

        // Show the iframe again
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'show-iframe' });
        } catch (e) {
            // Iframe might not be present, ignore
            console.log("Could not show iframe, it might not be present");
        }
    }
}

// Function to get stored base URL (similar to popup.js)
async function getStoredBaseUrl() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['baseUrl'], (result) => {
            resolve(result.baseUrl || 'https://new.justin-c.com/email-to-ics'); // Default if not set
        });
    });
}

// --- Get credentials from storage ---
async function getStoredCredentials() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['username', 'password'], (result) => {
      if (result.username && result.password) {
        const credentials = btoa(`${result.username}:${result.password}`);
        resolve(credentials);
      } else {
        resolve(null);
      }
    });
  });
}

// --- Get saved preferences ---
async function getStoredPreferences() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['takeScreenshots', 'defaultModel'], (result) => {
      resolve({
        takeScreenshots: result.takeScreenshots !== false, // Default to true if not set
        defaultModel: result.defaultModel || null
      });
    });
  });
}

// --- Send request from context menu ---
async function handleContextMenuAction(instructions, tab) {
  let notificationId = `ics-notify-${Date.now()}`;
  try {
    // Show "Processing" notification
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Email to ICS',
        message: 'Processing selected text...',
        priority: 1
    });

    // Get credentials and base URL from storage
    const credentials = await getStoredCredentials();
    const baseUrl = await getStoredBaseUrl();
    const targetUrl = `${baseUrl}/?display=email`; // Construct target URL

    if (!credentials) {
      throw new Error('Credentials not configured. Please open the extension popup and set your username and password.');
    }

    // Get user preferences
    const preferences = await getStoredPreferences();
    
    // Gather page content
    const pageData = await getPageContent(tab.id);

    // Prepare request body
    const body = new URLSearchParams({
      url: pageData.url,
      html: pageData.html,
      instructions: instructions,
      fromExtension: '1'
    });

    // Add model if specified in preferences
    if (preferences.defaultModel) {
      body.append('model', preferences.defaultModel);
    }

    // Add screenshot if enabled in preferences
    if (preferences.takeScreenshots) {
      chrome.notifications.update(notificationId, {
        message: 'Capturing page screenshot...'
      });
      
      // Call the updated function
      const screenshot = await captureVisibleTabScreenshot(tab.id);
      if (screenshot) {
        body.append('screenshot', screenshot);
      }
    }

    chrome.notifications.update(notificationId, {
      message: 'Sending to server...'
    });

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: body
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error ${response.status}: ${errorText.substring(0, 100)}`); // Limit error length
    }

    // Update notification to "Success"
     chrome.notifications.update(notificationId, {
        title: 'Email to ICS',
        message: 'Success! ICS sent to email.'
     });

  } catch (error) {
    console.error("Error sending context menu request:", error);
    // Update notification to "Error"
     chrome.notifications.update(notificationId, {
        title: 'Email to ICS - Error',
        message: `Failed: ${error.message}`
     });
  }
}

// --- Message handlers ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message.action, message);
  
  // Check if background script is ready
  if (!isReady) {
    console.warn('Background script not ready for action:', message.action);
    sendResponse({ success: false, error: 'Background script not ready' });
    return;
  }
  
  // Add timeout handler to prevent hanging connections
  const timeout = setTimeout(() => {
    console.warn('Message handler timeout for action:', message.action);
    if (sendResponse) {
      sendResponse({ success: false, error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout
  
  // Wrapper to clear timeout and send response
  const safeResponse = (response) => {
    clearTimeout(timeout);
    try {
      sendResponse(response);
    } catch (error) {
      console.error('Error sending response:', error);
    }
  };
  
  if (message.action === 'ping') {
    // Simple connectivity test
    console.log('Background script received ping');
    safeResponse({ success: true, message: 'Background script is responsive' });
    return true;
  } else if (message.action === 'savePreferences') {
    chrome.storage.sync.set({
      takeScreenshots: message.takeScreenshots,
      defaultModel: message.defaultModel
    }, () => {
      safeResponse({ success: true });
    });
    return true; // Keep the channel open for sendResponse
  } else if (message.action === 'captureScreenshot') {
    // Handle screenshot request from popup iframe
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        if (tabs[0]) {
          const screenshot = await captureVisibleTabScreenshot(tabs[0].id);
          if (screenshot) {
            safeResponse({ success: true, screenshot: screenshot });
          } else {
            safeResponse({ success: false, error: 'Screenshot capture returned null' });
          }
        } else {
          safeResponse({ success: false, error: 'No active tab found' });
        }
      } catch (error) {
        console.error('Screenshot capture error:', error);
        safeResponse({ success: false, error: error.message });
      }
    });
    return true; // Keep channel open for async response
  } else if (message.action === 'processContent') {
    // Handle content processing request
    handleProcessContentRequest(message, safeResponse);
    return true;
  } else if (message.action === 'getModels') {
    // Handle models request
    handleGetModelsRequest(safeResponse);
    return true;
  } else if (message.action === 'confirmEvent') {
    // Handle event confirmation
    handleConfirmEventRequest(message, safeResponse);
    return true;
  } else if (message.action === 'saveSettings') {
    // Handle settings save
    handleSaveSettingsRequest(message, safeResponse);
    return true;
  } else if (message.action === 'getSettings') {
    // Handle settings retrieval
    handleGetSettingsRequest(safeResponse);
    return true;
  } else {
    // Unknown action
    console.warn('Unknown message action:', message.action);
    safeResponse({ success: false, error: 'Unknown action: ' + message.action });
  }
});

// Handler functions
async function handleProcessContentRequest(message, sendResponse) {
  console.log('handleProcessContentRequest called with:', message);
  
  try {
    // Ensure we always send a response
    if (!sendResponse) {
      console.error('No sendResponse function provided');
      return;
    }

    console.log('Initializing EmailProcessor...');
    const processor = await initializeEmailProcessor();
    
    if (!processor) {
      throw new Error('Failed to initialize EmailProcessor');
    }
    
    console.log('EmailProcessor initialized successfully');
    
    // Get active tab for URL and HTML content
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      throw new Error('No active tab found');
    }
    
    const activeTab = tabs[0];
    
    // Get current tab URL if not provided
    if (!message.params.url) {
      message.params.url = activeTab.url;
      console.log('Using current tab URL:', activeTab.url);
    }
    
    // Get HTML content if not provided
    if (!message.params.html) {
      console.log('Getting HTML content from current tab...');
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => document.documentElement.outerHTML
        });
        if (results && results[0] && results[0].result) {
          message.params.html = results[0].result;
          console.log('HTML content captured successfully');
        } else {
          console.warn('Could not get HTML content from tab');
        }
      } catch (htmlError) {
        console.warn('Failed to get HTML content:', htmlError);
        // Continue without HTML content
      }
    }
    
    // Handle screenshot if requested
    if (message.params && message.params.takeScreenshot) {
      console.log('Taking screenshot for content processing...');
      
      try {
        const screenshot = await captureVisibleTabScreenshot(activeTab.id);
        if (screenshot) {
          message.params.screenshot = screenshot;
          console.log('Screenshot captured and added to params');
        } else {
          console.warn('Screenshot capture returned null');
        }
      } catch (screenshotError) {
        console.warn('Screenshot capture failed:', screenshotError);
        // Continue without screenshot
      }
    }
    
    console.log('Processing content with params:', Object.keys(message.params || {}));
    const result = await processor.processContent(message.params);
    console.log('Content processing completed successfully');
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Error in handleProcessContentRequest:', error);
    console.error('Error stack:', error.stack);
    
    // Always send a response, even on error
    try {
      sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
    }
  }
}

async function handleGetModelsRequest(sendResponse) {
  try {
    const processor = await initializeEmailProcessor();
    const models = await processor.loadAvailableModels();
    sendResponse({ success: true, models });
  } catch (error) {
    console.error('Error getting models:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleConfirmEventRequest(message, sendResponse) {
  try {
    const processor = await initializeEmailProcessor();
    const result = await processor.confirmEvent(message.confirmationToken);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Error confirming event:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveSettingsRequest(message, sendResponse) {
  try {
    const processor = await initializeEmailProcessor();
    await processor.saveSettings(message.settings);
    // Reinitialize to pick up new settings
    emailProcessor = null;
    await initializeEmailProcessor();
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetSettingsRequest(sendResponse) {
  try {
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'openRouterKey', 'postmarkApiKey', 'fromEmail', 
        'inboundConfirmedEmail', 'toTentativeEmail', 'toConfirmedEmail', 'aiModel'
      ], resolve);
    });
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- Handle extension icon click ---
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-iframe' });
  } catch (error) {
    console.error('Error sending message to content script:', error);
    // If content script is not loaded, inject it first
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Try sending the message again
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-iframe' });
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
    }
  }
}); 