// settings.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    const statusMessage = document.getElementById('statusMessage');
    const testConnectionBtn = document.getElementById('testConnection');
    const clearSettingsBtn = document.getElementById('clearSettings');
    
    // Load existing settings
    loadSettings();
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });
    
    // Test connection
    testConnectionBtn.addEventListener('click', function() {
        testConnection();
    });
    
    // Clear settings
    clearSettingsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all settings? This cannot be undone.')) {
            clearSettings();
        }
    });
    
    async function loadSettings() {
        try {
            const settings = await chrome.storage.sync.get([
                'openRouterKey', 'postmarkApiKey', 'fromEmail', 
                'toTentativeEmail', 'toConfirmedEmail', 'aiModel'
            ]);
            
            document.getElementById('openRouterKey').value = settings.openRouterKey || '';
            document.getElementById('postmarkApiKey').value = settings.postmarkApiKey || '';
            document.getElementById('fromEmail').value = settings.fromEmail || '';
            document.getElementById('toTentativeEmail').value = settings.toTentativeEmail || '';
            document.getElementById('toConfirmedEmail').value = settings.toConfirmedEmail || '';
            document.getElementById('aiModel').value = settings.aiModel || 'google/gemini-2.5-pro';
            
            // Load available models
            loadAvailableModels();
            
        } catch (error) {
            showStatus('Error loading settings: ' + error.message, 'error');
        }
    }
    
    async function saveSettings() {
        try {
            showStatus('Saving settings...', 'info');
            
            const settings = {
                openRouterKey: document.getElementById('openRouterKey').value.trim(),
                postmarkApiKey: document.getElementById('postmarkApiKey').value.trim(),
                fromEmail: document.getElementById('fromEmail').value.trim(),
                toTentativeEmail: document.getElementById('toTentativeEmail').value.trim(),
                toConfirmedEmail: document.getElementById('toConfirmedEmail').value.trim(),
                aiModel: document.getElementById('aiModel').value
            };
            
            // Validate required fields
            if (!settings.openRouterKey) {
                throw new Error('OpenRouter API Key is required');
            }
            if (!settings.postmarkApiKey) {
                throw new Error('Postmark API Key is required');
            }
            if (!settings.fromEmail) {
                throw new Error('From Email is required');
            }
            if (!settings.toTentativeEmail) {
                throw new Error('Tentative Events Recipient is required');
            }
            if (!settings.toConfirmedEmail) {
                throw new Error('Confirmed Events Recipient is required');
            }
            
            // Validate email formats
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(settings.fromEmail)) {
                throw new Error('Invalid From Email format');
            }
            if (!emailRegex.test(settings.toTentativeEmail)) {
                throw new Error('Invalid Tentative Events Recipient email format');
            }
            if (!emailRegex.test(settings.toConfirmedEmail)) {
                throw new Error('Invalid Confirmed Events Recipient email format');
            }
            
            // Save to storage and notify background script
            await chrome.storage.sync.set(settings);
            
            // Show success immediately since storage.sync.set already worked
            showStatus('Settings saved successfully!', 'success');
            
            // Try to notify background script of settings change (optional)
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'saveSettings',
                    settings: settings
                });
                
                if (response && !response.success) {
                    console.warn('Background script reported error:', response.error);
                }
            } catch (messageError) {
                // Background script communication failed, but settings are already saved
                console.warn('Background script communication failed (settings still saved):', messageError);
            }
            
            // Notify any open popups to refresh
            chrome.runtime.sendMessage({ action: 'settingsUpdated' });
            
            // Close settings window after 1.5 seconds
            setTimeout(() => {
                window.close();
            }, 1500);
            
        } catch (error) {
            showStatus('Error saving settings: ' + error.message, 'error');
        }
    }
    
    async function testConnection() {
        try {
            showStatus('Testing API connections...', 'info');
            testConnectionBtn.disabled = true;
            
            // Test OpenRouter connection
            const openRouterKey = document.getElementById('openRouterKey').value.trim();
            if (!openRouterKey) {
                throw new Error('OpenRouter API Key is required for testing');
            }
            
            // Define allowed models list
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
            
            let availableAllowedModels = [];
            
            // Test OpenRouter API directly
            try {
                const response = await fetch('https://openrouter.ai/api/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const allModels = data.data || [];
                
                // Filter to allowed models
                availableAllowedModels = allModels.filter(model => 
                    allowedModelIds.includes(model.id)
                );
                
                showStatus(`OpenRouter API connection successful! Found ${availableAllowedModels.length} of ${allowedModelIds.length} allowed models available.`, 'success');
                
            } catch (apiError) {
                throw new Error(`OpenRouter API test failed: ${apiError.message}`);
            }
            
            // Test Postmark connection
            const postmarkKey = document.getElementById('postmarkApiKey').value.trim();
            if (!postmarkKey) {
                showStatus('OpenRouter API test passed. Postmark API Key not provided - email sending will not work.', 'warning');
                return;
            }
            
            showStatus('OpenRouter API test passed. Testing Postmark API...', 'info');
            
            try {
                const response = await fetch('https://api.postmarkapp.com/server', {
                    headers: {
                        'X-Postmark-Server-Token': postmarkKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Postmark API returned ${response.status}: ${response.statusText}`);
                }
                
                const serverInfo = await response.json();
                showStatus(`Both API connections successful! OpenRouter: ${availableAllowedModels.length}/${allowedModelIds.length} models. Postmark: Server "${serverInfo.Name}" ready.`, 'success');
                
            } catch (postmarkError) {
                throw new Error(`Postmark API test failed: ${postmarkError.message}`);
            }
            
        } catch (error) {
            showStatus('Connection test failed: ' + error.message, 'error');
        } finally {
            testConnectionBtn.disabled = false;
        }
    }
    
    async function clearSettings() {
        try {
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            
            // Clear form
            form.reset();
            document.getElementById('aiModel').value = 'google/gemini-2.5-pro';
            
            showStatus('All settings cleared successfully.', 'success');
            
        } catch (error) {
            showStatus('Error clearing settings: ' + error.message, 'error');
        }
    }
    
    async function loadAvailableModels() {
        try {
            // Define allowed models as specified
            const allowedModels = [
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
            
            const modelSelect = document.getElementById('aiModel');
            const currentValue = modelSelect.value;
            
            // Clear existing options
            modelSelect.innerHTML = '';
            
            // Add allowed models
            allowedModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
            
            // Restore selected value or set default
            if (currentValue && allowedModels.find(m => m.id === currentValue)) {
                modelSelect.value = currentValue;
            } else {
                modelSelect.value = 'google/gemini-2.5-pro';
            }
            
        } catch (error) {
            console.error('Error loading models:', error);
            // Fallback to default model
            const modelSelect = document.getElementById('aiModel');
            modelSelect.innerHTML = '<option value="google/gemini-2.5-pro">Gemini 2.5 Pro (fallback)</option>';
        }
    }
    
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message status-' + type;
        statusMessage.style.display = 'block';
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
    }
});