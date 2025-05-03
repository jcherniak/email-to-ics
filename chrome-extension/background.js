// background.js
const CONTEXT_MENU_ID = "emailToIcsSelection";

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Send selection as ICS instructions",
    contexts: ["selection"] // Only show when text is selected
  });
  console.log("Context menu created.");
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    console.log("Context menu clicked with selection:", info.selectionText);
    handleContextMenuAction(info.selectionText, tab);
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

// --- Save preferences when popup changes them ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'savePreferences') {
    chrome.storage.sync.set({
      takeScreenshots: message.takeScreenshots,
      defaultModel: message.defaultModel
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep the channel open for sendResponse
  }
}); 