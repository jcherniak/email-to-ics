// Popup script for Orion Browser with compatibility fallbacks
// Based on popup.js but adapted for Orion's API differences

// Browser compatibility layer
const isOrion = typeof browser !== 'undefined';
const extensionAPI = isOrion ? browser : chrome;

// Orion-specific compatibility helpers
const orionCompat = {
  // Storage operations with localStorage fallback
  storage: {
    get: async (keys) => {
      try {
        if (extensionAPI.storage && extensionAPI.storage.sync) {
          return await new Promise((resolve) => {
            extensionAPI.storage.sync.get(keys, resolve);
          });
        } else {
          // Fallback to localStorage for Orion iOS
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
        } else {
          // Fallback to localStorage for Orion iOS
          Object.keys(data).forEach(key => {
            localStorage.setItem(`orion_fallback_${key}`, JSON.stringify(data[key]));
          });
        }
      } catch (error) {
        console.warn('Storage set fallback:', error);
      }
    }
  },

  // Message passing with error handling
  sendMessage: async (message) => {
    try {
      if (extensionAPI.runtime && extensionAPI.runtime.sendMessage) {
        return await new Promise((resolve, reject) => {
          extensionAPI.runtime.sendMessage(message, (response) => {
            if (extensionAPI.runtime.lastError) {
              reject(new Error(extensionAPI.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } else {
        throw new Error('Message passing not available');
      }
    } catch (error) {
      console.error('Message sending failed:', error);
      throw error;
    }
  },

  // Tab management with fallbacks
  getCurrentTab: async () => {
    try {
      if (extensionAPI.tabs && extensionAPI.tabs.query) {
        return await new Promise((resolve) => {
          extensionAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs[0] || null);
          });
        });
      } else {
        return null;
      }
    } catch (error) {
      console.warn('Tab query failed:', error);
      return null;
    }
  }
};

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Orion popup loaded');
  
  // Initialize form elements
  const form = document.getElementById('icsForm');
  const submitBtn = document.getElementById('submitBtn');
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const modelSelect = document.getElementById('model');
  const statusDiv = document.getElementById('status');
  
  // Show browser compatibility info
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="font-size: 11px; color: #666; margin-bottom: 10px;">
        Running on: ${isOrion ? 'Orion Browser' : 'Chrome/Chromium'}<br>
        API Support: ${extensionAPI.storage ? '✓' : '✗'} Storage, ${extensionAPI.tabs ? '✓' : '✗'} Tabs
      </div>
    `;
  }

  // Check authentication/setup status
  try {
    await checkAuthStatus();
  } catch (error) {
    console.error('Auth check failed:', error);
    showSetupRequired();
  }

  // Load available models with fallback
  try {
    await loadAvailableModels();
  } catch (error) {
    console.error('Model loading failed:', error);
    // Always populate with allowed models on error
    await populateModelsWithFallback();
  }

  // Auto-fill current tab URL with error handling
  try {
    const currentTab = await orionCompat.getCurrentTab();
    if (currentTab && currentTab.url) {
      const urlInput = document.getElementById('url');
      if (urlInput) {
        urlInput.value = currentTab.url;
      }
    }
  } catch (error) {
    console.warn('Could not get current tab:', error);
  }

  // Form submission handler
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Settings button handler
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      try {
        if (extensionAPI.tabs && extensionAPI.tabs.create) {
          extensionAPI.tabs.create({ url: extensionAPI.runtime.getURL('settings.html') });
        } else {
          // Fallback: open in same window
          window.location.href = 'settings.html';
        }
      } catch (error) {
        console.error('Could not open settings:', error);
        alert('Settings not available in this browser configuration');
      }
    });
  }
});

async function checkAuthStatus() {
  try {
    const settings = await orionCompat.storage.get(['openRouterKey', 'postmarkApiKey']);
    
    if (!settings.openRouterKey || !settings.postmarkApiKey) {
      showSetupRequired();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Auth status check failed:', error);
    showSetupRequired();
    return false;
  }
}

function showSetupRequired() {
  const form = document.getElementById('icsForm');
  const setupDiv = document.getElementById('setup-required') || createSetupDiv();
  
  if (form) form.style.display = 'none';
  setupDiv.style.display = 'block';
}

function createSetupDiv() {
  const setupDiv = document.createElement('div');
  setupDiv.id = 'setup-required';
  setupDiv.innerHTML = `
    <div class="alert">
      <h3>Setup Required</h3>
      <p>Please configure your API keys in the settings to use this extension.</p>
      <button id="openSettings">Open Settings</button>
    </div>
  `;
  
  const openSettingsBtn = setupDiv.querySelector('#openSettings');
  openSettingsBtn.addEventListener('click', () => {
    try {
      if (extensionAPI.tabs && extensionAPI.tabs.create) {
        extensionAPI.tabs.create({ url: extensionAPI.runtime.getURL('settings.html') });
      } else {
        window.location.href = 'settings.html';
      }
    } catch (error) {
      alert('Settings not available in this browser configuration');
    }
  });
  
  document.body.appendChild(setupDiv);
  return setupDiv;
}

async function loadAvailableModels() {
  try {
    // Get OpenRouter API key from storage
    const settings = await orionCompat.storage.get(['openRouterKey']);
    
    if (!settings.openRouterKey) {
      console.warn('No OpenRouter API key found, using offline models');
      await populateModelsWithFallback();
      return;
    }
    
    // Fetch models directly from OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${settings.openRouterKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const allModels = data.data || [];
    
    // Filter to allowed models only
    const filteredModels = filterAllowedModels(allModels);
    await populateModelDropdown(filteredModels);
    
  } catch (error) {
    console.error('Failed to load models:', error);
    await populateModelsWithFallback();
  }
}

function getOfflineAllowedModels() {
  // Return allowed models even when offline
  return [
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
    { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)' },
    { id: 'google/gemini-2.5-flash:thinking', name: 'Gemini 2.5 Flash (Thinking)' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'openai/o4-mini-high', name: 'GPT-4 Mini High' },
    { id: 'openai/o3', name: 'GPT-O3' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
    { id: 'openai/o3-pro', name: 'GPT-O3 Pro' }
  ];
}

function filterAllowedModels(allModels) {
  // Define allowed models
  const allowedModelIds = [
    'anthropic/claude-3.7-sonnet:thinking',
    'google/gemini-2.5-flash:thinking',
    'google/gemini-2.5-flash',
    'openai/o4-mini-high',
    'openai/o3',
    'openai/gpt-4.1',
    'google/gemini-2.5-pro',
    'anthropic/claude-opus-4',
    'openai/o3-pro'
  ];

  // Filter models to only include allowed ones
  const filteredModels = allModels.filter(model => 
    allowedModelIds.includes(model.id)
  );

  // Add any missing models with fallback names
  const foundIds = filteredModels.map(m => m.id);
  const missingIds = allowedModelIds.filter(id => !foundIds.includes(id));
  
  missingIds.forEach(id => {
    const fallbackModel = getOfflineAllowedModels().find(m => m.id === id);
    if (fallbackModel) {
      filteredModels.push(fallbackModel);
    }
  });

  // Sort models with preferred order
  const preferredOrder = [
    'google/gemini-2.5-pro',
    'anthropic/claude-opus-4',
    'anthropic/claude-3.7-sonnet:thinking',
    'google/gemini-2.5-flash:thinking',
    'google/gemini-2.5-flash',
    'openai/o4-mini-high',
    'openai/o3',
    'openai/gpt-4.1',
    'openai/o3-pro'
  ];

  return filteredModels.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.id);
    const bIndex = preferredOrder.indexOf(b.id);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

async function populateModelDropdown(models) {
  const modelSelect = document.getElementById('model');
  if (!modelSelect) return;
  
  modelSelect.innerHTML = '';
  
  if (models.length === 0) {
    modelSelect.innerHTML = '<option value="">No models available</option>';
    return;
  }
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name || model.id;
    modelSelect.appendChild(option);
  });
  
  // Set default from settings
  try {
    const settings = await orionCompat.storage.get(['aiModel']);
    const savedModel = settings.aiModel || 'google/gemini-2.5-pro';
    modelSelect.value = savedModel;
  } catch (error) {
    console.warn('Could not get saved model, using default:', error);
    modelSelect.value = 'google/gemini-2.5-pro';
  }
}

async function populateModelsWithFallback() {
  const allowedModels = getOfflineAllowedModels();
  await populateModelDropdown(allowedModels);
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  
  // Update UI state
  if (submitBtn) submitBtn.disabled = true;
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (resultDiv) resultDiv.style.display = 'none';
  
  try {
    // Get form data
    const formData = new FormData(event.target);
    const requestData = {
      action: 'processContent',
      url: formData.get('url'),
      html: formData.get('content'),
      instructions: formData.get('instructions'),
      tentative: formData.get('tentative') === 'on',
      multiday: formData.get('multiday') === 'on',
      reviewMode: formData.get('reviewMode') || 'direct',
      aiModel: formData.get('model'),
      takeScreenshot: formData.get('screenshot') === 'on'
    };
    
    console.log('Submitting request with Orion compatibility:', requestData);
    
    // Send processing request
    const response = await orionCompat.sendMessage(requestData);
    
    if (!response) {
      showError('No response from background script. Please check extension status and try again.');
      return;
    }
    
    if (response.success) {
      showResult(response.result);
    } else {
      showError(response.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showError(`Error: ${error.message}`);
  } finally {
    // Reset UI state
    if (submitBtn) submitBtn.disabled = false;
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

function showResult(result) {
  const resultDiv = document.getElementById('result');
  if (!resultDiv) return;
  
  if (result.needsReview) {
    // Show review interface
    resultDiv.innerHTML = `
      <div class="review-section">
        <h3>Review Event Details</h3>
        <div class="event-preview">
          <p><strong>Event:</strong> ${result.emailSubject || 'Untitled Event'}</p>
          <p><strong>Recipient:</strong> ${result.recipientEmail}</p>
        </div>
        <div class="review-actions">
          <button id="confirmEvent" class="primary">Confirm & Send</button>
          <button id="cancelEvent">Cancel</button>
        </div>
      </div>
    `;
    
    // Add event listeners for review actions
    document.getElementById('confirmEvent').addEventListener('click', async () => {
      try {
        const confirmResponse = await orionCompat.sendMessage({
          action: 'confirmEvent',
          token: result.confirmationToken
        });
        
        if (!confirmResponse) {
          showError('No response from background script. Please check extension status and try again.');
          return;
        }
        
        if (confirmResponse.success) {
          showResult({ message: confirmResponse.result.message });
        } else {
          showError(confirmResponse.error);
        }
      } catch (error) {
        showError(`Confirmation failed: ${error.message}`);
      }
    });
    
    document.getElementById('cancelEvent').addEventListener('click', () => {
      resultDiv.style.display = 'none';
    });
  } else {
    // Show success message
    resultDiv.innerHTML = `
      <div class="success-message">
        <h3>✓ Success</h3>
        <p>${result.message}</p>
      </div>
    `;
  }
  
  resultDiv.style.display = 'block';
}

function showError(errorMessage) {
  const resultDiv = document.getElementById('result');
  if (!resultDiv) return;
  
  resultDiv.innerHTML = `
    <div class="error-message">
      <h3>✗ Error</h3>
      <p>${errorMessage}</p>
      <small>Note: Some features may be limited in Orion Browser</small>
    </div>
  `;
  resultDiv.style.display = 'block';
}

// Add Orion-specific debugging
console.log('Orion popup compatibility:', {
  isOrion: isOrion,
  hasStorage: !!(extensionAPI.storage && extensionAPI.storage.sync),
  hasTabs: !!(extensionAPI.tabs),
  hasRuntime: !!(extensionAPI.runtime)
});