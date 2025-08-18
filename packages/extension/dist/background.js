/**
 * Background script for self-hosting Email-to-ICS Extension
 * Handles icon clicks and context menu
 */

// Set up context menu when extension starts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "email-to-ics-extract",
    title: "Extract Calendar Event",
    contexts: ["page", "selection"]
  });
  
  chrome.contextMenus.create({
    id: "email-to-ics-settings",
    title: "Settings",
    contexts: ["action"]
  });
});

// Handle extension icon clicks - toggle iframe
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Send message to content script to toggle iframe
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-iframe' });
  } catch (error) {
    console.warn('Failed to toggle iframe:', error);
    // Fallback: open popup in new tab or window
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html'),
      active: true
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "email-to-ics-extract") {
    try {
      // Toggle iframe for context menu extraction
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggle-iframe',
        selectedText: info.selectionText 
      });
    } catch (error) {
      console.warn('Failed to toggle iframe from context menu:', error);
    }
  } else if (info.menuItemId === "email-to-ics-settings") {
    // Open settings in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html?settings=true'),
      active: true
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    // Content script is ready, could auto-create dialog if needed
    sendResponse({ createDialog: false });
  } else if (request.action === 'storeSelectedText') {
    // Store selected text for later use
    chrome.storage.local.set({
      selectedText: request.text,
      selectedPageUrl: request.pageUrl
    });
    sendResponse({ success: true });
  } else if (request.action === 'getSelectedText') {
    // Retrieve stored selected text
    chrome.storage.local.get(['selectedText', 'selectedPageUrl'], (result) => {
      sendResponse({
        text: result.selectedText || '',
        pageUrl: result.selectedPageUrl || ''
      });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'openSettings') {
    // Open settings in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html?settings=true'),
      active: true
    });
    sendResponse({ success: true });
  } else if (request.action === 'captureScreenshot') {
    // Privileged screenshot capture with zoom functionality
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          sendResponse({ success: false, error: 'No active tab' });
          return;
        }

        let dataUrl = null;
        let originalState = {};

        try {
          // 1. Get page dimensions and original state
          const [dimensionsResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              return {
                scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight,
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                originalZoom: document.body.style.zoom || '',
                originalTransformOrigin: document.body.style.transformOrigin || '',
                scrollX: window.scrollX,
                scrollY: window.scrollY
              };
            }
          });

          const state = dimensionsResult.result;
          originalState = {
            zoom: state.originalZoom,
            transformOrigin: state.originalTransformOrigin,
            scrollX: state.scrollX,
            scrollY: state.scrollY
          };

          // 2. Calculate zoom factor to fit entire page
          const zoomX = state.innerWidth / state.scrollWidth;
          const zoomY = state.innerHeight / state.scrollHeight;
          const zoomFactor = Math.min(zoomX, zoomY, 1);

          if (zoomFactor < 1) {
            // 3. Apply zoom and scroll to top
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (zoom) => {
                document.body.style.zoom = zoom.toString();
                document.body.style.transformOrigin = '0 0';
                window.scrollTo(0, 0);
              },
              args: [zoomFactor]
            });

            // 4. Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 250));
          }

          // 5. Capture the visible area
          dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
          });

        } finally {
          // 6. Always restore original state
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (state) => {
                document.body.style.zoom = state.zoom || '';
                document.body.style.transformOrigin = state.transformOrigin || '';
                window.scrollTo(state.scrollX, state.scrollY);
              },
              args: [originalState]
            });
          } catch (restoreError) {
            console.warn('Failed to restore original state:', restoreError);
          }
        }

        if (dataUrl) {
          // Return base64 without data URL prefix
          const base64 = dataUrl.split(',')[1];
          sendResponse({ success: true, screenshot: base64 });
        } else {
          sendResponse({ success: false, error: 'Screenshot capture failed' });
        }
      } catch (error) {
        console.error('Screenshot error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});