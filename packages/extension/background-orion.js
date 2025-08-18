// Background script for Orion Browser - with compatibility fallbacks
// Based on background.js but with Orion-specific adaptations

// Import EmailProcessor with compatibility checks
let EmailProcessor;
try {
  // Try to load the email processor
  importScripts('email-processor.js');
  EmailProcessor = (typeof module !== 'undefined' && module.exports) ? module.exports : window.EmailProcessor;
} catch (error) {
  console.error('Failed to load EmailProcessor:', error);
}

// Orion compatibility: Check for API availability
const isOrion = typeof browser !== 'undefined';
const extensionAPI = isOrion ? browser : chrome;

// Fallback for missing APIs
const compatibilityFallbacks = {
  // Orion may not support all chrome.tabs features
  captureVisibleTab: async (windowId, options) => {
    try {
      if (extensionAPI.tabs && extensionAPI.tabs.captureVisibleTab) {
        return await new Promise((resolve, reject) => {
          extensionAPI.tabs.captureVisibleTab(windowId, options, (dataUrl) => {
            if (extensionAPI.runtime.lastError) {
              reject(new Error(extensionAPI.runtime.lastError.message));
            } else {
              resolve(dataUrl);
            }
          });
        });
      } else {
        throw new Error('Screenshot capture not supported in this browser');
      }
    } catch (error) {
      console.warn('Screenshot capture failed:', error);
      return null;
    }
  },

  // Fallback for storage APIs
  storage: {
    get: async (keys) => {
      try {
        if (extensionAPI.storage && extensionAPI.storage.sync) {
          return await new Promise((resolve) => {
            extensionAPI.storage.sync.get(keys, resolve);
          });
        } else if (localStorage) {
          // Fallback to localStorage
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(key => {
            const value = localStorage.getItem(`orion_fallback_${key}`);
            if (value) {
              try {
                result[key] = JSON.parse(value);
              } catch {
                result[key] = value;
              }
            }
          });
          return result;
        }
        return {};
      } catch (error) {
        console.warn('Storage get fallback:', error);
        return {};
      }
    },

    set: async (data) => {
      try {
        if (extensionAPI.storage && extensionAPI.storage.sync) {
          return await new Promise((resolve) => {
            extensionAPI.storage.sync.set(data, resolve);
          });
        } else if (localStorage) {
          // Fallback to localStorage
          Object.keys(data).forEach(key => {
            localStorage.setItem(`orion_fallback_${key}`, JSON.stringify(data[key]));
          });
        }
      } catch (error) {
        console.warn('Storage set fallback:', error);
      }
    }
  }
};

// Initialize processor
let processor = null;

async function initializeProcessor() {
  if (!EmailProcessor) {
    console.error('EmailProcessor not available');
    return;
  }
  
  try {
    processor = new EmailProcessor();
    // Override storage methods with fallbacks for Orion
    const originalGetStoredSettings = processor.getStoredSettings;
    processor.getStoredSettings = async function() {
      try {
        return await originalGetStoredSettings.call(this);
      } catch (error) {
        console.warn('Using storage fallback for settings');
        return await compatibilityFallbacks.storage.get([
          'openRouterKey', 'postmarkApiKey', 'fromEmail', 
          'inboundConfirmedEmail', 'toTentativeEmail', 'toConfirmedEmail', 'aiModel'
        ]);
      }
    };

    await processor.initializeFromStorage();
    console.log('EmailProcessor initialized for Orion');
  } catch (error) {
    console.error('Failed to initialize EmailProcessor:', error);
  }
}

// Initialize on startup
initializeProcessor();

// Context menu setup with error handling
function setupContextMenu() {
  try {
    if (extensionAPI.contextMenus) {
      extensionAPI.contextMenus.create({
        id: 'email-to-ics-convert',
        title: 'Convert to ICS Calendar Event',
        contexts: ['selection', 'page']
      });
    }
  } catch (error) {
    console.warn('Context menu setup failed (may not be supported):', error);
  }
}

// Handle extension installation/startup
if (extensionAPI.runtime && extensionAPI.runtime.onInstalled) {
  extensionAPI.runtime.onInstalled.addListener(setupContextMenu);
} else if (extensionAPI.runtime && extensionAPI.runtime.onStartup) {
  extensionAPI.runtime.onStartup.addListener(setupContextMenu);
}

// Message handling with enhanced error checking
if (extensionAPI.runtime && extensionAPI.runtime.onMessage) {
  extensionAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async response
  });
}

async function handleMessage(message, sender, sendResponse) {
  try {
    console.log('Orion background received message:', message.action);

    if (!processor) {
      sendResponse({ error: 'EmailProcessor not initialized' });
      return;
    }

    switch (message.action) {
      case 'processContent':
        try {
          // Enhanced screenshot handling for Orion
          if (message.takeScreenshot && sender.tab) {
            console.log('Taking screenshot with Orion compatibility...');
            
            // Hide iframe before screenshot
            try {
              await extensionAPI.tabs.sendMessage(sender.tab.id, { action: 'hide-iframe' });
            } catch (error) {
              console.warn('Could not hide iframe:', error);
            }

            // Capture screenshot with fallback
            const screenshotDataUrl = await compatibilityFallbacks.captureVisibleTab(
              sender.tab.windowId, 
              { format: 'png', quality: 90 }
            );

            // Show iframe after screenshot
            try {
              await extensionAPI.tabs.sendMessage(sender.tab.id, { action: 'show-iframe' });
            } catch (error) {
              console.warn('Could not show iframe:', error);
            }

            message.screenshot = screenshotDataUrl;
          }

          const result = await processor.processContent(message);
          sendResponse({ success: true, result });
        } catch (error) {
          console.error('Process content error:', error);
          sendResponse({ error: error.message });
        }
        break;

      case 'getModels':
        try {
          const models = await processor.loadAvailableModels();
          sendResponse({ success: true, models });
        } catch (error) {
          console.error('Get models error:', error);
          sendResponse({ error: error.message });
        }
        break;

      case 'confirmEvent':
        try {
          const result = await processor.confirmEvent(message.token);
          sendResponse({ success: true, result });
        } catch (error) {
          console.error('Confirm event error:', error);
          sendResponse({ error: error.message });
        }
        break;

      case 'saveSettings':
        try {
          await compatibilityFallbacks.storage.set(message.settings);
          // Reinitialize processor with new settings
          await processor.initializeFromStorage();
          sendResponse({ success: true });
        } catch (error) {
          console.error('Save settings error:', error);
          sendResponse({ error: error.message });
        }
        break;

      case 'getSettings':
        try {
          const settings = await compatibilityFallbacks.storage.get([
            'openRouterKey', 'postmarkApiKey', 'fromEmail', 
            'inboundConfirmedEmail', 'toTentativeEmail', 'toConfirmedEmail', 'aiModel'
          ]);
          sendResponse({ success: true, settings });
        } catch (error) {
          console.error('Get settings error:', error);
          sendResponse({ error: error.message });
        }
        break;

      default:
        sendResponse({ error: 'Unknown action: ' + message.action });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ error: error.message });
  }
}

// Context menu click handler with error handling
if (extensionAPI.contextMenus && extensionAPI.contextMenus.onClicked) {
  extensionAPI.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      if (info.menuItemId === 'email-to-ics-convert') {
        // Get selected text or page content
        const selectedText = info.selectionText || '';
        
        // Send message to content script to show form with pre-filled data
        if (extensionAPI.tabs && extensionAPI.tabs.sendMessage) {
          try {
            await extensionAPI.tabs.sendMessage(tab.id, {
              action: 'show-form',
              selectedText: selectedText,
              url: tab.url
            });
          } catch (error) {
            console.warn('Could not communicate with content script:', error);
          }
        }
      }
    } catch (error) {
      console.error('Context menu click error:', error);
    }
  });
}

// Browser compatibility logging
console.log('Email to ICS Extension loaded for Orion Browser');
console.log('Browser detection:', {
  isOrion: isOrion,
  hasChrome: typeof chrome !== 'undefined',
  hasBrowser: typeof browser !== 'undefined',
  apiFeatures: {
    storage: !!(extensionAPI.storage && extensionAPI.storage.sync),
    tabs: !!(extensionAPI.tabs),
    contextMenus: !!(extensionAPI.contextMenus),
    runtime: !!(extensionAPI.runtime)
  }
});