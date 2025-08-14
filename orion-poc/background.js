// Background script for iOS Orion API testing

// Test service worker lifecycle on iOS Orion
console.log('Orion PoC background script loaded at:', new Date().toISOString());

// Test runtime API
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details);
  
  // Test storage on install
  chrome.storage.local.set({
    installTime: Date.now(),
    version: chrome.runtime.getManifest().version,
    platform: 'testing'
  });
});

// Test message passing between popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'backgroundTest') {
    sendResponse({
      success: true,
      timestamp: Date.now(),
      tabId: sender.tab?.id,
      url: sender.tab?.url
    });
  }
});

// Test alarm API (may not work on iOS)
try {
  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);
  });
  
  // Create a test alarm
  chrome.alarms.create('testAlarm', { delayInMinutes: 1 });
} catch (error) {
  console.log('Alarms API not available:', error);
}

// Test action/browserAction API
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
});

// Keep service worker alive (testing iOS lifecycle)
const keepAlive = () => {
  console.log('Background script heartbeat:', new Date().toISOString());
};

// Test if setInterval works in iOS service worker context
try {
  setInterval(keepAlive, 30000); // 30 seconds
} catch (error) {
  console.log('setInterval not available in service worker context');
}