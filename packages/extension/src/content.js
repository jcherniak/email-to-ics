// Content script for Email to ICS Helper
// Runs on all web pages to capture content when needed

// Function to capture page content
function capturePageContent() {
  return {
    title: document.title,
    url: window.location.href,
    html: document.documentElement.outerHTML,
    selectedText: window.getSelection().toString()
  };
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureContent') {
    const content = capturePageContent();
    sendResponse(content);
  }
});

// Notify background that content script is ready
chrome.runtime.sendMessage({action: 'contentScriptReady'});