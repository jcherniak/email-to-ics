/**
 * Chrome Extension Popup - Matching full-chrome-extension branch exactly
 * Self-hosting with shared core libraries
 */

import { 
  createBrowserAdapters,
  BrowserIcsGenerator,
  EventData
} from '@email-to-ics/shared-core';
import 'bootstrap';

// Global state
let adapters: ReturnType<typeof createBrowserAdapters>;
let icsGenerator: BrowserIcsGenerator;
let availableModels: any[] = [];
let selectedModel: string | null = null;
let serverUrl = '';
let isAuthenticated = false;
let debugMode = false;
let lastSubmitParams: any = null;
let reviewData: any = null;
let currentTabId: number | null = null;

// Tab State Manager
class TabStateManager {
    tabId: number | null = null;
    stateKey: string | null = null;

    async initialize() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            this.tabId = tab.id!;
            this.stateKey = `tab_${this.tabId}_state`;
            currentTabId = this.tabId;
            
            await this.restoreState();
            window.addEventListener('beforeunload', () => this.saveState());
        } catch (error) {
            console.error('Error initializing tab state manager:', error);
        }
    }
    
    async saveState() {
        if (!this.tabId || !this.stateKey) return;
        
        const instructionsInput = document.getElementById('instructions') as HTMLTextAreaElement;
        const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
        const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
        const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
        
        const state = {
            formData: {
                instructions: instructionsInput?.value || '',
                model: modelSelect?.value || '',
                tentative: tentativeToggle?.checked || false,
                multiday: multidayToggle?.checked || false,
                reviewOption: (document.querySelector('input[name="review-option"]:checked') as HTMLInputElement)?.value || 'direct'
            },
            processingState: {
                isProcessing: document.getElementById('processingView')?.style.display === 'block',
                hasResults: document.getElementById('responseData')?.textContent || ''
            },
            timestamp: Date.now()
        };
        
        try {
            await chrome.storage.local.set({[this.stateKey]: state});
            console.log('Saved state for tab', this.tabId);
        } catch (error) {
            console.error('Error saving tab state:', error);
        }
    }
    
    async restoreState() {
        if (!this.tabId || !this.stateKey) return;
        
        try {
            const result = await chrome.storage.local.get([this.stateKey]);
            const state = result[this.stateKey];
            
            if (state && (Date.now() - state.timestamp) < 3600000) {
                const form = state.formData;
                const instructionsInput = document.getElementById('instructions') as HTMLTextAreaElement;
                const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
                const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
                const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
                
                if (form.instructions && instructionsInput) instructionsInput.value = form.instructions;
                if (form.model && modelSelect) modelSelect.value = form.model;
                if (tentativeToggle) tentativeToggle.checked = form.tentative;
                if (multidayToggle) multidayToggle.checked = form.multiday;
                if (form.reviewOption) {
                    const radio = document.querySelector(`input[name="review-option"][value="${form.reviewOption}"]`) as HTMLInputElement;
                    if (radio) radio.checked = true;
                }
                
                console.log('Restored state for tab', this.tabId);
            }
        } catch (error) {
            console.error('Error restoring tab state:', error);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize platform adapters
    adapters = createBrowserAdapters();
    icsGenerator = new BrowserIcsGenerator();
    
    // Check if we're running in an iframe
    const isInIframe = window.self !== window.top;
    
    // Initialize tab state manager
    const tabStateManager = new TabStateManager();
    await tabStateManager.initialize();
    
    // DOM elements
    const statusDiv = document.getElementById('status')!;
    const reviewStatusDiv = document.getElementById('review-status')!;
    const settingsSection = document.getElementById('settings-section')!;
    const formSection = document.getElementById('form-section')!;
    const reviewSection = document.getElementById('review-section')!;
    const processingView = document.getElementById('processingView')!;
    const instructionsInput = document.getElementById('instructions') as HTMLTextAreaElement;
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
    const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
    const convertButton = document.getElementById('convert-button') as HTMLButtonElement;
    const refreshModelsButton = document.getElementById('refresh-models') as HTMLButtonElement;
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;
    const rejectButton = document.getElementById('reject-button') as HTMLButtonElement;
    const backToFormButton = document.getElementById('backToFormButton') as HTMLButtonElement;
    const cancelRequestButton = document.getElementById('cancelRequestButton') as HTMLButtonElement;
    const closePopupButton = document.getElementById('close-popup') as HTMLButtonElement;
    
    // Settings elements
    const openSettingsButton = document.getElementById('open-settings') as HTMLButtonElement;
    const saveSettingsButton = document.getElementById('save-settings') as HTMLButtonElement;
    const testConnectionButton = document.getElementById('test-connection') as HTMLButtonElement;
    const openRouterKeyInput = document.getElementById('openRouterKey') as HTMLInputElement;
    const defaultModelSelect = document.getElementById('defaultModel') as HTMLSelectElement;
    const fromEmailInput = document.getElementById('fromEmail') as HTMLInputElement;

    // Hide cancel button by default
    if (cancelRequestButton) {
        cancelRequestButton.style.display = 'none';
    }

    // Utility functions
    function showStatus(message: string, type = 'loading', isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
        statusDiv.style.display = 'block';
        if (isError) { 
            document.body.classList.add('error-state');
        } else {
            document.body.classList.remove('error-state');
        }
    }

    function hideStatus() {
        statusDiv.style.display = 'none';
        statusDiv.textContent = '';
        document.body.classList.remove('error-state');
    }

    function showReviewStatus(message: string, type = 'loading') {
        reviewStatusDiv.textContent = message;
        reviewStatusDiv.className = `status-${type}`;
        reviewStatusDiv.style.display = 'block';
    }

    function hideReviewStatus() {
        reviewStatusDiv.style.display = 'none';
        reviewStatusDiv.textContent = '';
    }

    function disableForm(disable = true) {
        instructionsInput.disabled = disable;
        convertButton.disabled = disable;
        modelSelect.disabled = disable;
        refreshModelsButton.disabled = disable;
        tentativeToggle.disabled = disable;
        const reviewRadios = document.querySelectorAll('input[name="review-option"]') as NodeListOf<HTMLInputElement>;
        reviewRadios.forEach(radio => radio.disabled = disable);
    }

    function disableReviewButtons(disable = true) {
        sendButton.disabled = disable;
        rejectButton.disabled = disable;
    }

    // Screenshot capture functionality
    async function getActiveTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
            return tabs[0];
        } else {
            throw new Error("Could not get active tab.");
        }
    }

    async function captureVisibleTabScreenshot(): Promise<string | null> {
        if (isInIframe) {
            // We're in an iframe, request screenshot from background
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Screenshot message error:', chrome.runtime.lastError.message);
                        resolve(null);
                        return;
                    }
                    
                    if (response && response.success && response.screenshot) {
                        resolve('data:image/jpeg;base64,' + response.screenshot);
                    } else {
                        console.error('Screenshot request failed:', response?.error || 'Unknown error');
                        resolve(null);
                    }
                });
            });
        }
        
        // Original popup logic (not used in iframe mode)
        return null;
    }

    // Model management
    async function fetchAvailableModels(): Promise<any[]> {
        try {
            // Use background script to fetch models to avoid CSP issues
            const response = await chrome.runtime.sendMessage({ action: 'listModels' });
            
            if (!response.success) {
                console.warn('Failed to fetch models from background:', response.error);
                return getOfflineAllowedModels();
            }
            
            const allModels = response.data || [];
            const filteredModels = filterAllowedModels(allModels);
            console.log("Available models:", filteredModels);
            return filteredModels;
            
        } catch (error) {
            console.error("Error fetching models:", error);
            return getOfflineAllowedModels();
        }
    }

    function getOfflineAllowedModels() {
        return [
            { id: 'openai/gpt-5', name: 'GPT-5' },
            { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano' },
            { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
            { id: 'openai/o3', name: 'OpenAI o3' },
            { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1' },
            { id: 'openai/o4-mini-high', name: 'OpenAI o4 Mini High' }
        ];
    }

    function filterAllowedModels(allModels: any[]) {
        const allowedModelIds = [
            'openai/gpt-5',
            'openai/gpt-5-nano',
            'google/gemini-2.5-pro', 
            'anthropic/claude-sonnet-4',
            'openai/o3',
            'anthropic/claude-opus-4.1',
            'openai/o4-mini-high'
        ];

        const filteredModels = allModels.filter(model => 
            allowedModelIds.includes(model.id)
        );

        const foundIds = filteredModels.map(m => m.id);
        const missingIds = allowedModelIds.filter(id => !foundIds.includes(id));
        
        missingIds.forEach(id => {
            const fallbackModel = getOfflineAllowedModels().find(m => m.id === id);
            if (fallbackModel) {
                filteredModels.push(fallbackModel);
            }
        });

        return filteredModels.sort((a, b) => {
            const aIndex = allowedModelIds.indexOf(a.id);
            const bIndex = allowedModelIds.indexOf(b.id);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }

    async function loadModels(forceRefresh = false) {
        if (!forceRefresh && availableModels.length > 0) {
            console.log('Using cached models.');
            populateModelDropdown();
            return;
        }

        console.log("Loading AI models...");
        showStatus('Loading AI models...');
        modelSelect.disabled = true;
        refreshModelsButton.disabled = true;

        try {
            const models = await fetchAvailableModels();
            console.log("Received models:", models);

            const settings = await chrome.storage.sync.get(['defaultModel']);
            const savedModel = settings.defaultModel || 'openai/gpt-5';
            
            availableModels = models.map(model => ({
                id: model.id,
                name: model.name || model.id,
                default: model.id === savedModel
            }));

            selectedModel = availableModels.find(m => m.default)?.id || (availableModels.length > 0 ? availableModels[0].id : null);
            console.log("Default model ID:", selectedModel);

            populateModelDropdown();
            hideStatus();
        } catch (error) {
            console.error('Error loading models:', error);
            showStatus('Error loading models', 'error', true);
        } finally {
            modelSelect.disabled = false;
            refreshModelsButton.disabled = false;
        }
    }

    function populateModelDropdown() {
        if (!modelSelect || availableModels.length === 0) return;

        modelSelect.innerHTML = '';
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            if (model.default || model.id === selectedModel) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    }

    // Settings management
    function areRequiredSettingsPresent(settings: any): boolean {
        return Boolean(settings.openRouterKey && settings.postmarkApiKey && settings.fromEmail && 
                       settings.toTentativeEmail && settings.toConfirmedEmail);
    }

    async function loadSettingsIntoUI() {
        const settings = await chrome.storage.sync.get([
            'openRouterKey', 'postmarkApiKey', 'fromEmail', 
            'toTentativeEmail', 'toConfirmedEmail', 'defaultModel'
        ]);
        
        openRouterKeyInput.value = settings.openRouterKey || '';
        const postmarkApiKeyInput = document.getElementById('postmarkApiKey') as HTMLInputElement;
        postmarkApiKeyInput.value = settings.postmarkApiKey || '';
        fromEmailInput.value = settings.fromEmail || '';
        const toTentativeEmailInput = document.getElementById('toTentativeEmail') as HTMLInputElement;
        toTentativeEmailInput.value = settings.toTentativeEmail || '';
        const toConfirmedEmailInput = document.getElementById('toConfirmedEmail') as HTMLInputElement;
        toConfirmedEmailInput.value = settings.toConfirmedEmail || '';
        
        await populateDefaultModels(settings.defaultModel);
    }

    async function populateDefaultModels(selectedModel?: string) {
        try {
            const models = await fetchAvailableModels();
            defaultModelSelect.innerHTML = '';
            
            if (models.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No models available';
                defaultModelSelect.appendChild(option);
                return;
            }

            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (selectedModel && selectedModel === model.id) {
                    option.selected = true;
                }
                defaultModelSelect.appendChild(option);
            });

            // Set default if none selected
            if (!selectedModel && models.length > 0) {
                const defaultModel = models.find(m => m.id === 'openai/gpt-5') || models[0];
                defaultModel && (defaultModelSelect.value = defaultModel.id);
            }
        } catch (error) {
            console.error('Error loading models for settings:', error);
            defaultModelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    }

    async function showSettings() {
        await loadSettingsIntoUI();
        settingsSection.style.display = 'block';
        formSection.style.display = 'none';
        reviewSection.style.display = 'none';
        processingView.style.display = 'none';
    }

    async function showForm() {
        settingsSection.style.display = 'none';
        formSection.style.display = 'block';
        reviewSection.style.display = 'none';
        processingView.style.display = 'none';
        await loadModels();
    }

    async function initializeExtension() {
        const settings = await chrome.storage.sync.get([
            'openRouterKey', 'postmarkApiKey', 'fromEmail', 
            'toTentativeEmail', 'toConfirmedEmail', 'defaultModel'
        ]);
        
        if (!areRequiredSettingsPresent(settings)) {
            await showSettings();
        } else {
            await showForm();
        }
    }

    // Main ICS generation
    async function generateICS() {
        console.log('🚀 Generate ICS Started');
        
        const instructions = instructionsInput.value.trim();
        const model = modelSelect.value;
        const tentative = tentativeToggle.checked;
        const multiday = multidayToggle.checked;
        const reviewFirst = (document.querySelector('input[name="review-option"]:checked') as HTMLInputElement)?.value === 'review';

        console.log('📋 Form values:', {
            instructions,
            model,
            tentative,
            multiday,
            reviewFirst
        });

        if (!model) {
            console.error('❌ No model selected');
            showStatus('Please select an AI model', 'error', true);
            return;
        }

        try {
            // Show processing view
            formSection.style.display = 'none';
            processingView.style.display = 'block';
            
            const requestData = document.getElementById('requestData')!;
            const statusMessage = document.getElementById('statusMessage')!;
            
            // Get current page content and URL
            console.log('📄 Getting page content...');
            statusMessage.textContent = 'Getting page content...';
            const tab = await getActiveTab();
            console.log('🔍 Active tab:', { id: tab.id, url: tab.url });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                func: () => ({
                    url: window.location.href,
                    html: document.documentElement.outerHTML,
                    text: document.body.innerText
                })
            });
            const pageContent = results[0].result;
            console.log('📄 Page content extracted:', {
                url: pageContent.url,
                htmlLength: pageContent.html.length,
                textLength: pageContent.text.length
            });
            
            // Update request details
            requestData.textContent = JSON.stringify({
                url: pageContent.url,
                instructions: instructions || 'None',
                model: model,
                tentative: tentative,
                multiday: multiday,
                reviewFirst: reviewFirst
            }, null, 2);
            
            // Capture screenshot
            console.log('📸 Capturing screenshot...');
            statusMessage.textContent = 'Capturing screenshot...';
            const screenshot = await captureVisibleTabScreenshot();
            console.log('📸 Screenshot captured:', { hasScreenshot: !!screenshot, length: screenshot?.length || 0 });

            // Call AI model
            console.log('🤖 Calling AI model...');
            statusMessage.textContent = 'Analyzing content with AI...';
            const events = await callAIModel(pageContent, instructions, model, tentative, multiday, screenshot);
            console.log('🎯 AI model returned events:', { eventCount: events.length, events });
            
            // Generate ICS
            console.log('📅 Generating ICS file...');
            statusMessage.textContent = 'Generating ICS file...';
            const icsContent = await generateICSContent(events, tentative);
            console.log('📅 ICS content generated:', { length: icsContent.length, preview: icsContent.substring(0, 200) + '...' });
            
            if (reviewFirst) {
                await showReviewSection(events, icsContent);
            } else {
                // Direct send - show completion
                statusMessage.textContent = 'Complete! ICS file generated.';
                const responseAccordion = document.getElementById('responseAccordion')!;
                const responseData = document.getElementById('responseData')!;
                
                const eventSummary = events.length === 1 ? 
                    `${events[0].summary}` : 
                    `${events.length} Events`;
                
                const eventDetails = events.length === 1 ?
                    `${events[0].start_date}${events[0].start_time ? ' at ' + events[0].start_time : ' (All day)'}` :
                    `${events[0].start_date} - ${events[events.length - 1].end_date || events[events.length - 1].start_date}`;
                
                responseAccordion.classList.remove('d-none');
                responseData.innerHTML = `
                    <div class=\"alert alert-success\">
                        <h4>✅ ${events.length === 1 ? 'Event' : 'Events'} Created Successfully</h4>
                        <h5>${eventSummary}</h5>
                        <p>${eventDetails}</p>
                        <div class=\"mt-3\">
                            <button class=\"btn btn-primary me-2\" onclick=\"downloadICS('${encodeURIComponent(icsContent)}', '${events[0].summary}')\">💾 Download ICS</button>
                            <button class=\"btn btn-success\" onclick=\"sendEmail('${encodeURIComponent(JSON.stringify(events))}', '${encodeURIComponent(icsContent)}')\">📧 Send Email</button>
                        </div>
                    </div>
                `;
                
                const closeButton = document.getElementById('closeButton')!;
                closeButton.style.display = 'block';
            }
            
        } catch (error) {
            console.error('💥 Error generating ICS:', error);
            console.error('💥 Error stack:', error.stack);
            showStatus(`Error: ${error.message}`, 'error', true);
            processingView.style.display = 'none';
            formSection.style.display = 'block';
        }
        
        console.log('🏁 Generate ICS process completed');
    }

    // AI model calling
    async function callAIModel(pageData: any, instructions: string, model: string, tentative: boolean, multiday: boolean, screenshot: string | null): Promise<any> {
        console.log('🤖 AI Request Starting...', {
            model,
            url: pageData.url,
            htmlLength: pageData.html?.length || 0,
            hasScreenshot: !!screenshot,
            instructions: instructions.substring(0, 100) + '...',
            tentative,
            multiday
        });
        
        const cleanUrl = stripTrackingParameters(pageData.url);
        
        const prompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

Extract event details from the provided content. Pay attention to:
- Use ISO 8601 date format (YYYY-MM-DD) and 24-hour time format (HH:MM)
- For all-day events, set start_time and end_time to null
- If no end time specified, make reasonable estimate
- Default timezone is America/New_York unless specified
- Multi-day events: ${multiday ? 'Focus on the PRIMARY event mentioned on the page. Only if there is no clear primary event, extract multiple events' : 'Extract exactly one event'}
- Event status: ${tentative ? 'Tentative' : 'Confirmed'}
- CRITICAL: Always include the source URL in the "url" field
- CRITICAL: Always add the source URL at the end of the description with format: "\\n\\nSource: [URL]"

${instructions ? `Special instructions: ${instructions}\n` : ''}

Source URL (MUST be included in url field and description): ${cleanUrl}

Content to analyze:
${pageData.html}`;

        const eventSchema = {
            type: "object",
            properties: {
                events: {
                    type: "array",
                    description: multiday ? "Array of calendar events (focus on primary event, multiple only if no clear primary)" : "Array of calendar events (must contain exactly one event)",
                    minItems: 1,
                    maxItems: multiday ? 50 : 1,
                    items: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "string",
                                description: "Event title"
                            },
                            location: {
                                type: "string",
                                description: "Event location or empty string"
                            },
                            start_date: {
                                type: "string",
                                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                                description: "Start date in YYYY-MM-DD format"
                            },
                            start_time: {
                                type: ["string", "null"],
                                pattern: "^\\d{2}:\\d{2}$",
                                description: "Start time in HH:MM format or null for all-day"
                            },
                            end_date: {
                                type: "string", 
                                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                                description: "End date in YYYY-MM-DD format"
                            },
                            end_time: {
                                type: ["string", "null"],
                                pattern: "^\\d{2}:\\d{2}$",
                                description: "End time in HH:MM format or null for all-day"
                            },
                            description: {
                                type: "string",
                                description: "Event description"
                            },
                            timezone: {
                                type: "string",
                                default: "America/New_York",
                                description: "Timezone for the event"
                            },
                            url: {
                                type: "string",
                                description: "Event URL or source URL"
                            }
                        },
                        required: ["summary", "location", "start_date", "end_date", "start_time", "end_time", "description", "timezone", "url"],
                        additionalProperties: false
                    }
                }
            },
            required: ["events"],
            additionalProperties: false
        };

        // Use background script to make API call to avoid CSP issues
        const payload = {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "calendar_event",
                    schema: eventSchema,
                    strict: true
                }
            },
            max_tokens: 20000,
            temperature: 0.1
        };

        console.log('📤 Sending message to background script:', {
            action: 'callOpenRouter',
            model,
            promptLength: prompt.length,
            payloadSize: JSON.stringify(payload).length
        });

        const response = await chrome.runtime.sendMessage({
            action: 'callOpenRouter',
            payload: payload
        });

        console.log('📥 Background script response:', {
            success: response.success,
            hasData: !!response.data,
            error: response.error,
            choices: response.data?.choices?.length || 0
        });

        if (!response.success) {
            console.error('❌ AI Request Failed:', response.error);
            throw new Error(`OpenRouter API error: ${response.error}`);
        }

        const aiResponse = response.data.choices[0]?.message?.content || '';
        console.log('✅ AI Request Completed:', {
            responseLength: aiResponse.length,
            responsePreview: aiResponse.substring(0, 200) + '...'
        });
        
        return parseAiResponse(aiResponse);
    }

    function parseAiResponse(response: string): any[] {
        try {
            let cleaned = response.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
            }
            
            const parsed = JSON.parse(cleaned);
            
            if (!parsed.events || !Array.isArray(parsed.events)) {
                throw new Error('Response must contain an events array');
            }
            
            if (parsed.events.length === 0) {
                throw new Error('Events array cannot be empty');
            }
            
            // Validate each event has required fields
            for (const event of parsed.events) {
                if (!event.summary) {
                    throw new Error('Missing required field: summary');
                }
                if (!event.start_date) {
                    throw new Error('Missing required field: start_date');
                }
            }
            
            return parsed.events;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    // ICS generation using shared library
    async function generateICSContent(events: any[], tentative: boolean): Promise<string> {
        // Convert events to EventData format
        const eventDataArray: EventData[] = events.map(eventData => ({
            summary: eventData.summary,
            description: eventData.description || '',
            location: eventData.location || '',
            dtstart: eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : 'T00:00:00'),
            dtend: eventData.end_date ? 
                eventData.end_date + (eventData.end_time ? `T${eventData.end_time}:00` : 'T23:59:59') : 
                undefined,
            timezone: eventData.timezone || 'America/New_York',
            isAllDay: eventData.start_time === null,
            status: tentative ? 'tentative' : 'confirmed',
            url: eventData.url
        }));

        // Get fromEmail for organizer
        const settings = await chrome.storage.sync.get(['fromEmail']);
        
        // Generate ICS content for all events
        return icsGenerator.generateIcs(eventDataArray, {}, settings.fromEmail);
    }

    async function showReviewSection(events: any[], icsContent: string) {
        processingView.style.display = 'none';
        reviewSection.style.display = 'block';
        
        reviewData = { eventData: events, icsContent };
        
        const reviewContent = document.getElementById('review-content')!;
        const reviewRecipient = document.getElementById('review-recipient')!;
        const reviewSubject = document.getElementById('review-subject')!;
        
        // Load stored email settings to show correct recipient
        const settings = await chrome.storage.sync.get(['toTentativeEmail', 'toConfirmedEmail']);
        const recipientEmail = tentativeToggle.checked ? 
            (settings.toTentativeEmail || 'tentative@example.com') : 
            (settings.toConfirmedEmail || 'confirmed@example.com');
        reviewRecipient.textContent = recipientEmail;
        
        if (events.length === 1) {
            const eventData = events[0];
            reviewSubject.textContent = `Calendar Event: ${eventData.summary}`;
            
            reviewContent.innerHTML = `
                <div class=\"ics-details\">
                    <h6>${eventData.summary}</h6>
                    <p><strong>Date:</strong> ${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ' (All day)'}</p>
                    ${eventData.location ? `<p><strong>Location:</strong> ${eventData.location}</p>` : ''}
                    ${eventData.description ? `<p><strong>Description:</strong> ${eventData.description.substring(0, 200)}...</p>` : ''}
                </div>
            `;
        } else {
            reviewSubject.textContent = `Calendar Events: ${events.length} Events`;
            
            const eventsHtml = events.map((eventData, index) => `
                <div class=\"ics-details mb-3\">
                    <h6>Event ${index + 1}: ${eventData.summary}</h6>
                    <p><strong>Date:</strong> ${eventData.start_date}${eventData.start_time ? ' at ' + eventData.start_time : ' (All day)'}</p>
                    ${eventData.location ? `<p><strong>Location:</strong> ${eventData.location}</p>` : ''}
                    ${eventData.description ? `<p><strong>Description:</strong> ${eventData.description.substring(0, 100)}...</p>` : ''}
                </div>
            `).join('');
            
            reviewContent.innerHTML = eventsHtml;
        }
    }

    function stripTrackingParameters(url: string): string {
        if (!url) return url;
        
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
                'fbclid', 'gclid', 'dclid', 'msclkid',
                'mc_cid', 'mc_eid',
                '_ga', '_gid', '_gac',
                'ref', 'referer', 'referrer'
            ];
            
            let hasChanges = false;
            for (const param of trackingParams) {
                if (params.has(param)) {
                    params.delete(param);
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                urlObj.search = params.toString();
                return urlObj.toString();
            }
            
            return url;
        } catch (error) {
            return url;
        }
    }

    // Event listeners
    convertButton?.addEventListener('click', generateICS);
    
    refreshModelsButton?.addEventListener('click', () => loadModels(true));
    
    backToFormButton?.addEventListener('click', () => {
        processingView.style.display = 'none';
        reviewSection.style.display = 'none';
        formSection.style.display = 'block';
    });
    
    sendButton?.addEventListener('click', async () => {
        if (reviewData) {
            console.log('📧 Send button clicked, sending email...');
            showReviewStatus('Sending email...', 'loading');
            disableReviewButtons(true);
            
            try {
                await sendEmail(reviewData.eventData, reviewData.icsContent, tentativeToggle.checked);
                console.log('✅ Email sent successfully from review section');
                hideReviewStatus();
                reviewSection.style.display = 'none';
                formSection.style.display = 'block';
                showStatus('Email sent successfully!', 'success');
            } catch (error) {
                console.error('💥 Error sending email from review section:', error);
                showReviewStatus(`Failed to send email: ${error.message}`, 'error');
            } finally {
                disableReviewButtons(false);
            }
        }
    });
    
    rejectButton?.addEventListener('click', () => {
        reviewData = null;
        reviewSection.style.display = 'none';
        formSection.style.display = 'block';
    });

    closePopupButton?.addEventListener('click', () => {
        if (isInIframe) {
            window.parent.postMessage({ type: 'CLOSE_IFRAME' }, '*');
        } else {
            window.close();
        }
    });

    // Settings event handlers
    openSettingsButton?.addEventListener('click', () => {
        showSettings();
    });

    saveSettingsButton?.addEventListener('click', async () => {
        const openRouterKey = openRouterKeyInput.value.trim();
        const postmarkApiKeyInput = document.getElementById('postmarkApiKey') as HTMLInputElement;
        const postmarkApiKey = postmarkApiKeyInput.value.trim();
        const fromEmail = fromEmailInput.value.trim();
        const toTentativeEmailInput = document.getElementById('toTentativeEmail') as HTMLInputElement;
        const toTentativeEmail = toTentativeEmailInput.value.trim();
        const toConfirmedEmailInput = document.getElementById('toConfirmedEmail') as HTMLInputElement;
        const toConfirmedEmail = toConfirmedEmailInput.value.trim();
        const defaultModel = defaultModelSelect.value;

        if (!openRouterKey) {
            showStatus('OpenRouter API key is required', 'error', true);
            return;
        }
        
        if (!postmarkApiKey) {
            showStatus('Postmark API key is required', 'error', true);
            return;
        }
        
        if (!fromEmail) {
            showStatus('From email is required', 'error', true);
            return;
        }
        
        if (!toTentativeEmail) {
            showStatus('Tentative email recipient is required', 'error', true);
            return;
        }
        
        if (!toConfirmedEmail) {
            showStatus('Confirmed email recipient is required', 'error', true);
            return;
        }

        await chrome.storage.sync.set({
            openRouterKey,
            postmarkApiKey,
            fromEmail,
            toTentativeEmail,
            toConfirmedEmail,
            defaultModel
        });

        showStatus('Settings saved successfully!', 'success');
        
        if (areRequiredSettingsPresent({ openRouterKey, postmarkApiKey, fromEmail, toTentativeEmail, toConfirmedEmail })) {
            setTimeout(showForm, 1000);
        }
    });

    testConnectionButton?.addEventListener('click', async () => {
        const openRouterKey = openRouterKeyInput.value.trim();
        const postmarkApiKeyInput = document.getElementById('postmarkApiKey') as HTMLInputElement;
        const postmarkKey = postmarkApiKeyInput.value.trim();
        
        if (!openRouterKey) {
            alert('Please enter an OpenRouter API key first');
            return;
        }

        testConnectionButton.disabled = true;
        testConnectionButton.textContent = 'Testing...';
        
        try {
            // Test OpenRouter API via background script
            const openRouterResponse = await chrome.runtime.sendMessage({ action: 'listModels' });
            
            if (!openRouterResponse.success) {
                throw new Error(`OpenRouter API test failed: ${openRouterResponse.error}`);
            }
            
            const modelCount = openRouterResponse.data?.length || 0;
            
            if (!postmarkKey) {
                alert(`✅ OpenRouter API test passed! Found ${modelCount} models.\n\nPostmark API Key not provided - email sending will not work.`);
                await populateDefaultModels(defaultModelSelect.value);
                return;
            }
            
            // Test Postmark API
            try {
                const response = await fetch('https://api.postmarkapp.com/server', {
                    headers: {
                        'X-Postmark-Server-Token': postmarkKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                alert(`✅ Both APIs tested successfully! Found ${modelCount} models.`);
                await populateDefaultModels(defaultModelSelect.value);
            } catch (postmarkError) {
                throw new Error(`Postmark API test failed: ${postmarkError.message}`);
            }
            
        } catch (error) {
            console.error('Connection test failed:', error);
            alert(`❌ Connection test failed: ${error.message}`);
        } finally {
            testConnectionButton.disabled = false;
            testConnectionButton.textContent = 'Test Connection';
        }
    });

    // Listen for iframe initialization
    if (isInIframe) {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'INIT_FROM_CONTENT') {
                if (instructionsInput && event.data.data.selectedText) {
                    instructionsInput.value = `Focus on this section exclusively. Use surrounding HTML for context, but this is the event we want:\n\n${event.data.data.selectedText}`;
                }
            }
        });
    }

    // Global functions for HTML onclick handlers
    (window as any).downloadICS = (content: string, filename: string) => {
        const decoded = decodeURIComponent(content);
        const blob = new Blob([decoded], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Email sending function using Postmark API via background script
    async function sendEmail(events: any[], icsContent: string, tentative: boolean) {
        console.log('📬 sendEmail function called:', {
            eventCount: events.length,
            icsLength: icsContent.length,
            tentative
        });
        
        try {
            console.log('⚙️ Loading email settings...');
            const settings = await chrome.storage.sync.get([
                'fromEmail', 'toTentativeEmail', 'toConfirmedEmail'
            ]);
            console.log('⚙️ Email settings loaded:', {
                hasFromEmail: !!settings.fromEmail,
                hasToTentative: !!settings.toTentativeEmail,
                hasToConfirmed: !!settings.toConfirmedEmail,
                tentative
            });
            
            const recipientEmail = tentative ? settings.toTentativeEmail : settings.toConfirmedEmail;
            const isMultiple = Array.isArray(events) && events.length > 1;
            
            console.log('📧 Email details:', {
                recipientEmail,
                fromEmail: settings.fromEmail,
                isMultiple,
                tentative
            });
            
            let subject: string;
            let emailBody: string;
            
            if (isMultiple) {
                subject = `Calendar Events: ${events.length} Events`;
                const eventsList = events.map((event: any, index: number) => 
                    `${index + 1}. ${event.summary} - ${event.start_date}${event.start_time ? ' at ' + event.start_time : ''}`
                ).join('\n');
                emailBody = `Please find the attached calendar events.\n\n${eventsList}\n\nThis invitation was generated automatically.`;
            } else {
                const event = events[0];
                subject = `Calendar Event: ${event.summary}`;
                emailBody = `Please find the calendar invitation attached.\n\nEvent: ${event.summary}\n${event.location ? `Location: ${event.location}\n` : ''}${event.description ? `Description: ${event.description}\n` : ''}\nThis invitation was generated automatically.`;
            }
            
            const emailPayload = {
                From: settings.fromEmail,
                To: recipientEmail,
                Subject: subject,
                TextBody: emailBody,
                Attachments: [
                    {
                        Name: 'invite.ics',
                        Content: btoa(unescape(encodeURIComponent(icsContent))),
                        ContentType: 'text/calendar'
                    }
                ]
            };
            
            console.log('📤 Sending email payload to background script:', {
                from: emailPayload.From,
                to: emailPayload.To,
                subject: emailPayload.Subject,
                bodyLength: emailPayload.TextBody.length,
                attachmentSize: emailPayload.Attachments[0].Content.length
            });
            
            const response = await chrome.runtime.sendMessage({
                action: 'sendEmail',
                payload: emailPayload
            });
            
            console.log('📥 Email send response:', response);
            
            if (response.success) {
                console.log('✅ Email sent successfully:', response.data);
                return { message: 'Calendar invite sent successfully!' };
            } else {
                console.error('❌ Email send failed:', response.error);
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('💥 Email sending error:', error);
            throw error;
        }
    }
    
    // Global sendEmail function for backward compatibility and review section
    (window as any).sendEmail = async (eventData: string, icsContent: string) => {
        console.log('🌐 Global sendEmail called from HTML onclick');
        try {
            const events = JSON.parse(decodeURIComponent(eventData));
            console.log('📧 Calling internal sendEmail function:', { eventCount: events.length });
            await sendEmail(events, icsContent, tentativeToggle.checked);
            console.log('✅ Global sendEmail completed successfully');
            showStatus('Email sent successfully!', 'success');
        } catch (error) {
            console.error('💥 Global sendEmail error:', error);
            showStatus(`Failed to send email: ${error.message}`, 'error', true);
        }
    };

    // Initialize
    await initializeExtension();
});