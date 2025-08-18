/**
 * Content script for Email-to-ICS Extension
 * Runs on all web pages to help with event extraction
 */

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    // Extract page content for event processing
    const content = {
      html: document.documentElement.outerHTML,
      text: document.body.innerText,
      title: document.title,
      url: window.location.href
    };
    sendResponse(content);
  }
});


// Add visual indicator that extension is active
console.log('Email-to-ICS extension content script loaded');