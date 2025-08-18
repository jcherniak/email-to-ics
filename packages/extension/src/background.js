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

// Handle extension icon clicks - create in-page dialog
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Send message to content script to create in-page dialog
    await chrome.tabs.sendMessage(tab.id, { action: 'createInPageDialog' });
  } catch (error) {
    console.warn('Failed to create in-page dialog:', error);
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
      // Create in-page dialog for context menu extraction
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'createInPageDialog',
        selectedText: info.selectionText 
      });
    } catch (error) {
      console.warn('Failed to create in-page dialog from context menu:', error);
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
    // Capture screenshot for content script
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          sendResponse({ success: false, error: 'No active tab' });
          return;
        }

        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: 'jpeg',
          quality: 90
        });

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