// Content script for iOS Orion API testing

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      // Extract page content similar to what email-to-ICS extension needs
      const content = {
        title: document.title,
        url: window.location.href,
        textLength: document.body.innerText.length,
        html: document.documentElement.outerHTML,
        // Test email-specific content extraction
        emailContent: extractEmailContent(),
        hasImages: document.images.length > 0,
        hasLinks: document.links.length > 0,
        timestamp: Date.now()
      };
      
      sendResponse(content);
    } catch (error) {
      sendResponse({ error: error.message });
    }
    return true; // Keep message channel open for async response
  }
});

function extractEmailContent() {
  // Look for common email patterns that the main extension would need
  const emailPatterns = {
    // Gmail selectors
    gmail: document.querySelector('[data-message-id]') !== null,
    // Outlook selectors  
    outlook: document.querySelector('[data-app-module="MailCompose"]') !== null,
    // General email indicators
    hasCalendarData: /\b(calendar|meeting|appointment|event)\b/i.test(document.body.innerText),
    hasDateTime: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}:\d{2}\s?(AM|PM)\b/i.test(document.body.innerText),
    hasLocation: /\b(location|address|venue|room)\b/i.test(document.body.innerText)
  };
  
  return emailPatterns;
}

// Test if script loads correctly
console.log('Orion PoC content script loaded on:', window.location.href);