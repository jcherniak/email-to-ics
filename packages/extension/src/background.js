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
  } else if (request.action === 'listModels') {
    // List available models from OpenRouter
    (async () => {
      console.log('📋 Background: Starting models list request');
      let controller = new AbortController();
      
      try {
        const { openRouterKey } = await chrome.storage.sync.get(['openRouterKey']);
        
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: openRouterKey ? {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json'
          } : {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Background: Models list completed:', { modelCount: data.data?.length || 0 });
        sendResponse({ success: true, data: data.data || [] });
      } catch (error) {
        console.error('💥 Background: Models list error:', error);
        sendResponse({ success: false, error: error.message });
      } finally {
        if (controller) {
          controller.abort();
          controller = null;
        }
        console.log('🧹 Background: Models request cleanup completed');
      }
    })();
    return true; // Keep message channel open for async response
  } else if (request.action === 'callOpenRouter') {
    // Make OpenRouter API call for event extraction
    (async () => {
      console.log('🔄 Background: Starting OpenRouter API call');
      const startTime = Date.now();
      let controller = new AbortController();
      
      try {
        const { openRouterKey } = await chrome.storage.sync.get(['openRouterKey']);
        
        if (!openRouterKey) {
          console.error('❌ Background: No OpenRouter API key found');
          sendResponse({ success: false, error: 'OpenRouter API key not found in storage' });
          return;
        }

        // Log the full request payload without sensitive headers
        try {
          const hasImage = Array.isArray(request.payload?.messages?.[0]?.content) && request.payload.messages[0].content.some(p => p.type === 'image_url');
          console.log('📦 OpenRouter request (background):', {
            model: request.payload?.model,
            hasImage,
            messageContentTypes: Array.isArray(request.payload?.messages?.[0]?.content) ? request.payload.messages[0].content.map(p => p.type) : typeof request.payload?.messages?.[0]?.content,
            payload: request.payload
          });
        } catch (logErr) {
          console.warn('⚠️ Failed to log OpenRouter request payload:', logErr);
        }

        console.log('📤 Background: Making fetch request to OpenRouter...');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://chrome-extension://email-to-ics',
            'X-Title': 'Email to ICS Chrome Extension'
          },
          body: JSON.stringify(request.payload),
          signal: controller.signal
        });

        console.log('📥 Background: Response received:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error('❌ Background: API error response:', errorText);
          throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        // Log raw response before parsing
        const responseText = await response.text();
        console.debug('📦 Raw OpenRouter response (background):', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('📦 OpenRouter response JSON (background):', data);
        } catch (parseError) {
          console.error('💥 Failed to parse JSON response:', parseError);
          console.error('Raw response length:', responseText.length);
          console.error('Full raw response:', responseText);
          throw parseError;
        }
        const endTime = Date.now();
        console.log('✅ Background: API call completed successfully:', {
          duration: `${endTime - startTime}ms`,
          choices: data.choices?.length || 0,
          usage: data.usage
        });
        
        sendResponse({ success: true, data });
      } catch (error) {
        const endTime = Date.now();
        console.error('💥 Background: OpenRouter API error:', {
          error: error.message,
          duration: `${endTime - startTime}ms`,
          stack: error.stack
        });
        sendResponse({ success: false, error: error.message });
      } finally {
        // Ensure the controller is cleaned up
        if (controller) {
          controller.abort();
          controller = null;
        }
        console.log('🧹 Background: Request cleanup completed');
      }
    })();
    return true; // Keep message channel open for async response
  } else if (request.action === 'sendEmail') {
    // Send email via Postmark API
    (async () => {
      console.log('📧 Background: Starting email send request');
      let controller = new AbortController();
      
      try {
        const { postmarkApiKey } = await chrome.storage.sync.get(['postmarkApiKey']);
        
        if (!postmarkApiKey) {
          console.error('❌ Background: No Postmark API key found');
          sendResponse({ success: false, error: 'Postmark API key not found in storage' });
          return;
        }

        console.log('📤 Background: Making fetch request to Postmark...');
        const response = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': postmarkApiKey
          },
          body: JSON.stringify(request.payload),
          signal: controller.signal
        });

        console.log('📥 Background: Email response received:', {
          status: response.status,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error('❌ Background: Email API error response:', errorText);
          throw new Error(`Postmark API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Background: Email sent successfully:', data);
        sendResponse({ success: true, data });
      } catch (error) {
        console.error('💥 Background: Email send error:', error);
        sendResponse({ success: false, error: error.message });
      } finally {
        if (controller) {
          controller.abort();
          controller = null;
        }
        console.log('🧹 Background: Email request cleanup completed');
      }
    })();
    return true; // Keep message channel open for async response
  }
});
