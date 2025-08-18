/**
 * Background script for Email-to-ICS Extension
 */

// Set up context menu when extension starts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "email-to-ics-extract",
    title: "Extract Calendar Event",
    contexts: ["page", "selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "email-to-ics-extract") {
    // Open the popup or trigger event extraction
    chrome.action.openPopup();
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractEvent') {
    // Forward to popup or handle directly
    sendResponse({success: true});
  }
});