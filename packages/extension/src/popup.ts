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
import ICAL from 'ical.js';
import $ from 'jquery';
import select2Factory from 'select2';

// select2's CJS export is a factory that must be called to register $.fn.select2
if (typeof select2Factory === 'function') {
  select2Factory(window, $);
}

// Build-time defaults injected from .env.default / .env via build-popup.js
declare const __DEFAULT_TIMEZONE__: string;
declare const __CUSTOM_PROMPT_DEFAULT__: string;

type ModelOption = {
  id: string;
  name: string;
  isPriority?: boolean;
  isSeparator?: boolean;
};

const DEFAULT_MODEL_ID = 'google/gemini-3-pro-preview';
const PRIORITY_MODEL_IDS = [
  'openai/gpt-5.2',
  'openai/gpt-5.2-codex',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
];
const PRIORITY_MODEL_LABELS: Record<string, string> = {
  'openai/gpt-5.2': 'GPT-5.2',
  'openai/gpt-5.2-codex': 'GPT-5.2 Codex',
  'anthropic/claude-opus-4.6': 'Claude Opus 4.6',
  'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'google/gemini-3-pro-preview': 'Gemini 3 Pro',
  'google/gemini-3-flash-preview': 'Gemini 3 Flash',
};

// Global state
let adapters: ReturnType<typeof createBrowserAdapters>;
let icsGenerator: BrowserIcsGenerator;
let availableModels: ModelOption[] = [];
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
        const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
        const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
        const preextractToggle = document.getElementById('preextract-toggle') as HTMLInputElement;
        
        const state = {
            formData: {
                instructions: instructionsInput?.value || '',
                model: selectedModel || '',
                tentative: tentativeToggle?.checked || false,
                multiday: multidayToggle?.checked || false,
                preextract: preextractToggle?.checked ?? true,
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
        } catch (error: any) {
            const msg = (error && (error.message || String(error))) || '';
            if (msg === 'Extension context invalidated.') {
                // Ignore expected teardown errors when the tab/iframe is closed
                return;
            }
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
                const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
                const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
                const preextractToggle = document.getElementById('preextract-toggle') as HTMLInputElement;
                
                if (form.instructions && instructionsInput) instructionsInput.value = form.instructions;
                if (form.model) selectedModel = form.model;
                if (tentativeToggle) tentativeToggle.checked = form.tentative;
                if (multidayToggle) multidayToggle.checked = form.multiday;
                if (preextractToggle && typeof form.preextract === 'boolean') preextractToggle.checked = form.preextract;
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
    const preextractToggle = document.getElementById('preextract-toggle') as HTMLInputElement;
    const tentativeToggle = document.getElementById('tentative-toggle') as HTMLInputElement;
    const multidayToggle = document.getElementById('multiday-toggle') as HTMLInputElement;
    const convertButton = document.getElementById('convert-button') as HTMLButtonElement;
    const refreshModelsButton = document.getElementById('refresh-models') as HTMLButtonElement;
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;
    const rejectButton = document.getElementById('reject-button') as HTMLButtonElement;
    const backToFormButton = document.getElementById('backToFormButton') as HTMLButtonElement;
    const cancelRequestButton = document.getElementById('cancelRequestButton') as HTMLButtonElement;
    const closePopupButton = document.getElementById('close-popup') as HTMLButtonElement;
    
    // Success alert elements
    const successAlert = document.getElementById('success-alert') as HTMLDivElement;
    const successMessage = document.getElementById('success-message') as HTMLSpanElement;
    
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

    function showSuccessAlert(message: string) {
        successMessage.textContent = message;
        successAlert.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideSuccessAlert();
        }, 5000);
    }

    function hideSuccessAlert() {
        if (successAlert) {
            successAlert.style.display = 'none';
        }
    }

    function disableForm(disable = true) {
        instructionsInput.disabled = disable;
        convertButton.disabled = disable;
        if (modelSelect) $(modelSelect).prop('disabled', disable);
        refreshModelsButton.disabled = disable;
        tentativeToggle.disabled = disable;
        if (preextractToggle) preextractToggle.disabled = disable;
        const reviewRadios = document.querySelectorAll('input[name="review-option"]') as NodeListOf<HTMLInputElement>;
        reviewRadios.forEach(radio => radio.disabled = disable);
    }

    function disableReviewButtons(disable = true) {
        sendButton.disabled = disable;
        rejectButton.disabled = disable;
    }

    // Screenshot capture functionality
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
                        const original = 'data:image/jpeg;base64,' + response.screenshot;
                        // Compress to 25% dimensions, JPEG quality 0.6 before sending to model
                        compressImage(original, 0.25, 0.6)
                          .then((compressed) => {
                              try {
                                  const origBytes = Math.round((response.screenshot.length * 3) / 4);
                                  const compBytes = Math.round((compressed.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
                                  console.log('📉 Screenshot compressed', { originalBytes: origBytes, compressedBytes: compBytes });
                              } catch {}
                              resolve(compressed);
                          })
                          .catch(err => {
                              console.warn('Compression failed, using original screenshot:', err);
                              resolve(original);
                          });
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

    // Compress a data URL image by a scale factor and JPEG quality
    function compressImage(dataUrl: string, scale: number, quality: number): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    try {
                        const targetW = Math.max(1, Math.floor(img.width * scale));
                        const targetH = Math.max(1, Math.floor(img.height * scale));
                        const canvas = document.createElement('canvas');
                        canvas.width = targetW;
                        canvas.height = targetH;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error('Canvas 2D context not available'));
                            return;
                        }
                        ctx.drawImage(img, 0, 0, targetW, targetH);
                        const out = canvas.toDataURL('image/jpeg', quality);
                        resolve(out);
                    } catch (e) {
                        reject(e);
                    }
                };
                img.onerror = (e) => reject(new Error('Image load failed'));
                img.src = dataUrl;
            } catch (err) {
                reject(err);
            }
        });
    }

    // Model management
    function normalizeModels(allModels: any[]): ModelOption[] {
        const unique = new Map<string, ModelOption>();
        (allModels || []).forEach(model => {
            const id = model?.id;
            if (!id || unique.has(id)) return;
            unique.set(id, {
                id,
                name: model.name || PRIORITY_MODEL_LABELS[id] || id
            });
        });
        return Array.from(unique.values());
    }

    function getModelLabel(modelId: string | null): string {
        if (!modelId) return '';
        return availableModels.find(m => m.id === modelId)?.name || modelId;
    }

    let select2Initialized = false;

    function initModelSelect2() {
        if (!modelSelect) return;

        if (select2Initialized) {
            $(modelSelect).select2('destroy');
            select2Initialized = false;
        }

        $(modelSelect).select2({
            placeholder: $(modelSelect).data('placeholder') || 'Search or select a model',
            allowClear: true,
            width: '100%'
        });

        $(modelSelect).off('change');
        $(modelSelect).on('change', () => {
            selectedModel = modelSelect.value || null;
        });

        select2Initialized = true;
    }

    function syncModelSelectValue() {
        if (!modelSelect) return;
        const value = selectedModel || '';
        $(modelSelect).val(value).trigger('change');
    }

    function getOfflinePriorityModels(): ModelOption[] {
        return PRIORITY_MODEL_IDS.map(id => ({
            id,
            name: PRIORITY_MODEL_LABELS[id] || id,
            isPriority: true
        }));
    }

    function buildModelOptions(allModels: ModelOption[]): ModelOption[] {
        const normalized = normalizeModels(allModels);
        const seen = new Set<string>();
        const offlinePriority = getOfflinePriorityModels();

        const priorityList = PRIORITY_MODEL_IDS.map(id => {
            const found = normalized.find(m => m.id === id);
            const fallback = offlinePriority.find(m => m.id === id);
            const model = found || fallback;
            if (model && !seen.has(model.id)) {
                seen.add(model.id);
                return { ...model, isPriority: true } as ModelOption;
            }
            return null;
        }).filter(Boolean) as ModelOption[];

        const otherModels = normalized
            .filter(model => !seen.has(model.id))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(model => ({ ...model, isPriority: false }));

        return [...priorityList, ...otherModels];
    }

    function resolveInitialModel(preferredId: string | null | undefined, options: ModelOption[]): string | null {
        const selectable = options;
        const candidates = [preferredId, DEFAULT_MODEL_ID].filter(Boolean) as string[];
        for (const candidate of candidates) {
            if (selectable.some(option => option.id === candidate)) {
                return candidate;
            }
        }
        return selectable[0]?.id || null;
    }

    async function fetchAvailableModels(): Promise<ModelOption[]> {
        try {
            // Use background script to fetch models to avoid CSP issues
            const response = await chrome.runtime.sendMessage({ action: 'listModels' });

            if (!response || !response.success) {
                console.warn('Failed to fetch models from background:', response?.error);
                return getOfflinePriorityModels();
            }

            const normalizedModels = normalizeModels(response.data || []);
            if (normalizedModels.length === 0) {
                console.warn('No models returned from API; using offline priority list');
                return getOfflinePriorityModels();
            }

            console.log("Available models (raw):", normalizedModels);
            return normalizedModels;

        } catch (error) {
            console.error("Error fetching models:", error);
            return getOfflinePriorityModels();
        }
    }

    async function loadModels(forceRefresh = false) {
        if (!forceRefresh && availableModels.length > 0) {
            console.log('Using cached models.');
            const settings = await chrome.storage.sync.get(['defaultModel']);
            const savedModel = settings.defaultModel || DEFAULT_MODEL_ID;
            selectedModel = resolveInitialModel(selectedModel || savedModel, availableModels);
            populateModelDropdown();
            return;
        }

        console.log("Loading AI models...");
        showStatus('Loading AI models...');
        refreshModelsButton.disabled = true;
        if (modelSelect) $(modelSelect).prop('disabled', true);

        try {
            const models = buildModelOptions(await fetchAvailableModels());
            console.log("Received models:", models);

            const settings = await chrome.storage.sync.get(['defaultModel']);
            const savedModel = settings.defaultModel || DEFAULT_MODEL_ID;
            
            availableModels = models;
            selectedModel = resolveInitialModel(selectedModel || savedModel, availableModels);
            console.log("Default model ID:", selectedModel);

            populateModelDropdown();
            hideStatus();
        } catch (error) {
            console.error('Error loading models:', error);
            showStatus('Error loading models', 'error', true);
        } finally {
            refreshModelsButton.disabled = false;
            if (modelSelect) $(modelSelect).prop('disabled', false);
        }
    }

    function populateModelDropdown() {
        if (!modelSelect) return;

        const priorityOptions = availableModels.filter(m => m.isPriority);
        const otherOptions = availableModels.filter(m => !m.isPriority);

        modelSelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '';
        modelSelect.appendChild(placeholder);

        const appendGroup = (label: string, items: ModelOption[]) => {
            if (items.length === 0) return;
            const group = document.createElement('optgroup');
            group.label = label;
            items.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                group.appendChild(option);
            });
            modelSelect.appendChild(group);
        };

        appendGroup('Priority models', priorityOptions);
        appendGroup('All models', otherOptions);

        initModelSelect2();
        syncModelSelectValue();
    }

    // Settings management
    function areRequiredSettingsPresent(settings: any): boolean {
        return Boolean(settings.openRouterKey && settings.postmarkApiKey && settings.fromEmail && 
                       settings.toTentativeEmail && settings.toConfirmedEmail);
    }

    async function loadSettingsIntoUI() {
        const settings = await chrome.storage.sync.get([
            'openRouterKey', 'postmarkApiKey', 'fromEmail',
            'toTentativeEmail', 'toConfirmedEmail', 'defaultModel',
            'defaultTimezone', 'customPrompt'
        ]);

        openRouterKeyInput.value = settings.openRouterKey || '';
        const postmarkApiKeyInput = document.getElementById('postmarkApiKey') as HTMLInputElement;
        postmarkApiKeyInput.value = settings.postmarkApiKey || '';
        fromEmailInput.value = settings.fromEmail || '';
        const toTentativeEmailInput = document.getElementById('toTentativeEmail') as HTMLInputElement;
        toTentativeEmailInput.value = settings.toTentativeEmail || '';
        const toConfirmedEmailInput = document.getElementById('toConfirmedEmail') as HTMLInputElement;
        toConfirmedEmailInput.value = settings.toConfirmedEmail || '';

        const defaultTimezoneSelect = document.getElementById('defaultTimezone') as HTMLSelectElement;
        const customPromptInput = document.getElementById('customPrompt') as HTMLTextAreaElement;
        if (defaultTimezoneSelect) defaultTimezoneSelect.value = settings.defaultTimezone || __DEFAULT_TIMEZONE__;
        if (customPromptInput) customPromptInput.value = settings.customPrompt ?? __CUSTOM_PROMPT_DEFAULT__;

        await populateDefaultModels(settings.defaultModel);
    }

    async function populateDefaultModels(selectedModel?: string) {
        try {
            const models = buildModelOptions(await fetchAvailableModels());
            defaultModelSelect.innerHTML = '';
            
            if (models.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No models available';
                defaultModelSelect.appendChild(option);
                return;
            }

            const priority = models.filter(m => m.isPriority);
            const others = models.filter(m => !m.isPriority);

            const appendOptions = (parent: HTMLOptGroupElement | HTMLSelectElement, items: ModelOption[]) => {
                items.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    if (selectedModel && selectedModel === model.id) {
                        option.selected = true;
                    }
                    parent.appendChild(option);
                });
            };

            if (priority.length) {
                const group = document.createElement('optgroup');
                group.label = 'Priority models';
                appendOptions(group, priority);
                defaultModelSelect.appendChild(group);
            }

            if (others.length) {
                const group = document.createElement('optgroup');
                group.label = 'All models';
                appendOptions(group, others);
                defaultModelSelect.appendChild(group);
            }

            // Set default if none selected
            if (!selectedModel && models.length > 0) {
                const defaultModel = resolveInitialModel(DEFAULT_MODEL_ID, models);
                defaultModel && (defaultModelSelect.value = defaultModel);
            } else if (selectedModel && !models.some(m => !m.isSeparator && m.id === selectedModel)) {
                const fallback = resolveInitialModel(DEFAULT_MODEL_ID, models);
                fallback && (defaultModelSelect.value = fallback);
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
        hideSuccessAlert();
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
        const model = selectedModel;
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
            // Extract main content via service worker
            const contentResponse = await chrome.runtime.sendMessage({ action: 'getPageContent' });
            if (!contentResponse || !contentResponse.success) {
                throw new Error(`Failed to extract page content: ${contentResponse?.error || 'unknown error'}`);
            }
            const pageContent = contentResponse.data;
            console.log('📄 Page content extracted:', {
                url: pageContent.url,
                htmlLength: pageContent.html.length,
                textLength: pageContent.text.length,
                selector: pageContent.selector
            });

            // Auto-check pre-extract if HTML > 200 KB; otherwise leave user's toggle
            const overThreshold = pageContent.html.length > 200 * 1024;
            const preextract = overThreshold ? true : (preextractToggle?.checked ?? false);
            if (preextractToggle && preextractToggle.checked !== preextract) {
                preextractToggle.checked = preextract;
            }
            if (overThreshold) {
                console.log('🧼 Large HTML detected (>200KB). Enabling pre-extraction.');
            }
            
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
            let effectiveHtml = pageContent.html;
            if (preextract) {
                console.log('🧼 Pre-extracting main content...');
                statusMessage.textContent = 'Finding main content...';
                try {
                    const extracted = await extractMainContent(pageContent.url, pageContent.html);
                    if (extracted && extracted.length > 100) {
                        effectiveHtml = extracted;
                        console.log('✅ Main content extracted:', { length: effectiveHtml.length });
                    } else {
                        console.warn('⚠️ Extraction returned too little content; using full HTML');
                    }
                } catch (exErr) {
                    console.warn('⚠️ Extraction failed; using full HTML', exErr);
                }
            }

            let aiResult: { events: any[], emailSubject: string, locationLookup: string };
            try {
                statusMessage.textContent = 'Analyzing content with AI...';
                aiResult = await callAIModel({ ...pageContent, html: effectiveHtml }, instructions, model, tentative, multiday, screenshot);
            } catch (err) {
                if (preextract) {
                    console.warn('⚠️ Parsing failed with extracted content. Retrying with full HTML...');
                    statusMessage.textContent = 'Analyzing content with AI (full HTML fallback)...';
                    aiResult = await callAIModel(pageContent, instructions, model, tentative, multiday, screenshot);
                } else {
                    throw err;
                }
            }
            const events = aiResult.events;
            console.log('🎯 AI model returned events:', { eventCount: events.length, emailSubject: aiResult.emailSubject, events });

            // Generate ICS
            console.log('📅 Generating ICS file...');
            statusMessage.textContent = 'Generating ICS file...';
            const icsContent = await generateICSContent(events, tentative);
            console.log('📅 ICS content generated:', { length: icsContent.length, preview: icsContent.substring(0, 200) + '...' });

            if (reviewFirst) {
                await showReviewSection(events, icsContent, aiResult.emailSubject);
            } else {
                // Direct send - auto-send email, then show completion
                try {
                    statusMessage.textContent = 'Sending email...';
                    await sendEmail(events, icsContent, tentative, aiResult.emailSubject);
                    statusMessage.textContent = 'Email sent. ICS ready to download.';
                } catch (sendErr: any) {
                    console.error('💥 Auto-send failed:', sendErr);
                    statusMessage.textContent = `Email failed: ${sendErr?.message || sendErr}`;
                }
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
                        <h4>✅ ${events.length === 1 ? 'Event' : 'Events'} Created & Email Sent</h4>
                        <h5>${eventSummary}</h5>
                        <p>${eventDetails}</p>
                        <div class=\"mt-3\">
                            <button id=\"download-ics-btn\" class=\"btn btn-primary me-2\">💾 Download ICS</button>
                        </div>
                    </div>
                `;

                // Attach event listeners to comply with MV3 CSP (no inline handlers)
                const downloadBtn = document.getElementById('download-ics-btn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        (window as any).downloadICS(encodeURIComponent(icsContent), events[0].summary);
                    });
                }
                
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
    async function callAIModel(pageData: any, instructions: string, model: string, tentative: boolean, multiday: boolean, screenshot: string | null): Promise<{ events: any[], emailSubject: string, locationLookup: string }> {
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

        // Load configurable prompt settings (runtime overrides build-time defaults)
        const promptSettings = await chrome.storage.sync.get(['defaultTimezone', 'customPrompt']);
        const defaultTimezone = promptSettings.defaultTimezone || __DEFAULT_TIMEZONE__;
        const customPrompt = promptSettings.customPrompt ?? __CUSTOM_PROMPT_DEFAULT__;
        const todayDate = new Date().toISOString().split('T')[0];

        const systemPrompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

# PRIMARY EVENT IDENTIFICATION - READ THIS FIRST
Your primary task is to identify and extract ONLY the MAIN event described in the content.
How to identify the primary event:
- It's typically the most prominently featured and detailed event
- It's often the first event described in detail
- It's usually the subject of the email or central content of the webpage
- For ticketed events, it's the event for which the ticket/confirmation is issued

Explicitly IGNORE these secondary events:
- Events labeled as "Related Events", "You might also like", "Upcoming Events", "Other shows"
- Events in sidebars or supplementary sections
- Events mentioned only in passing or with minimal details
- Any event clearly not the focus of the email/page

EXTREMELY IMPORTANT: IF you find multiple events and are unsure which is primary, choose the event with:
1. The most complete details (date, time, location)
2. The earliest upcoming date
3. The most prominence in the content

# MULTI-DAY EVENT HANDLING
${multiday
    ? `MULTI-EVENT MODE: The user has checked the multi-event flag. Extract ALL related performances/sessions as SEPARATE events. Each different time slot should be a separate event in the events array. Do NOT combine multiple times into a single event. This applies to multiple concert performances, conference sessions across days, festival events on different dates, etc.`
    : `SINGLE EVENT MODE: Extract exactly one event. If multiple times are mentioned, choose the primary/first one or create a single event that encompasses the main timeframe.`}

# DATE PARSING RULES
Today's date is ${todayDate}.
When parsing dates:
1. If the year IS explicitly mentioned, use that year
2. If the year is NOT explicitly mentioned:
   - Use current year if the date is ON or AFTER today
   - Use next year if the date is BEFORE today
3. Use the correct timezone abbreviation based on the date (e.g., PDT vs PST for Pacific)
4. Be aware that many events are scheduled months in advance; carefully check if dates are in the past relative to today
5. If multiple dates are mentioned, prioritize dates that are explicitly associated with the primary event

# TIMEZONE INFERENCE
If a location is specified, infer the appropriate timezone:
- Eastern Time: New York, Boston, Miami, Atlanta, Washington DC, Florida, etc.
- Central Time: Chicago, Dallas, Houston, Memphis, Minneapolis, New Orleans, etc.
- Mountain Time: Denver, Salt Lake City, Phoenix, Albuquerque, etc.
- Pacific Time: Los Angeles, San Francisco, Seattle, Portland, San Diego, etc.
- Hawaii-Aleutian Time: Hawaii, Honolulu, etc.
- Alaska Time: Anchorage, Juneau, etc.
For international locations, determine the appropriate timezone for that region.
If no location is found in the content, default to ${defaultTimezone}.

# FIELD INSTRUCTIONS
- Use ISO 8601 date format (YYYY-MM-DD) and 24-hour time format (HH:MM)
- For all-day events, set start_time and end_time to null and isAllDay to true
- Date/Time: Calculate end time if missing (2h default, 3h for opera, 30m for doctor appointments)
- Event status: ${tentative ? 'Tentative' : 'Confirmed'} (set status field only; do NOT include a "Status:" line in the description)
- description: Concise summary with rich details. Use \\n for newlines. Keep under 1000 chars. DO NOT include raw HTML.
- htmlDescription: HTML formatted version of the description. Use basic HTML tags only (p, a, b, i, ul, ol, li, br). DO NOT include <style> tags or inline style attributes. If a source URL was provided, include it at the bottom as a clickable link.
- location: The venue name or address.
- emailSubject: Use the generated event summary.
- locationLookup: Location string suitable for Google Maps lookup.
- CRITICAL: Always include the event page link in the "url" field using the source URL provided.
- CRITICAL: Always include the event page link at the bottom of the description: "\\n\\nEvent page: [URL]"
- CRITICAL: Always include the event page link at the bottom of the htmlDescription as a clickable <a> tag.
- Important: Do NOT fetch or browse the Source URL or any external resources. Only use the provided HTML under "Content to analyze" and the optional screenshot image. The Source URL is for attribution/reference only.

# SUMMARY FORMATTING
- For concerts, music performances, and similar events, format the summary as: "Artist/Group - Concert/Show Name" (e.g., "Radiohead - In Rainbows Tour", "NY Philharmonic - Beethoven's 9th"). The artist or performing group comes FIRST, followed by the specific concert or program name.

# IGNORE SPONSOR OR POLICY DISCLAIMERS
Do not include details about sponsors or policy disclaimers unless they are explicitly part of the main event content.

# ERROR HANDLING
IF NO DATES ARE FOUND ANYWHERE IN THE CONTENT, set success to false with errorMessage "Content didn't contain dates or times" and return an empty events array.

# USER PREFERENCES
${customPrompt}`;

        const instructionsText = `${instructions ? `Special instructions: ${instructions}\n` : ''}Source URL (MUST be included in the url field AND at the bottom of the description as "Event page: ${cleanUrl}"): ${cleanUrl}`;

        const eventSchema = {
            type: "object",
            properties: {
                success: {
                    type: "boolean",
                    description: "Whether event extraction was successful. False if no dates found."
                },
                errorMessage: {
                    type: "string",
                    description: "Error message if success is false, empty string otherwise"
                },
                emailSubject: {
                    type: "string",
                    description: "Email subject line using the event summary"
                },
                locationLookup: {
                    type: "string",
                    description: "Location string suitable for Google Maps lookup"
                },
                events: {
                    type: "array",
                    description: multiday ? "Array of calendar events (extract ALL distinct event times/sessions as separate events)" : "Array of calendar events (exactly one event when success is true)",
                    items: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "string",
                                description: "Event title"
                            },
                            location: {
                                type: "string",
                                description: "Venue name or address"
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
                                description: "Plain text event description (under 1000 chars). MUST end with Event page: [URL]"
                            },
                            htmlDescription: {
                                type: "string",
                                description: "HTML formatted description using basic tags (p, a, b, i, ul, ol, li, br). No style tags. Include event page link at bottom."
                            },
                            timezone: {
                                type: "string",
                                description: "IANA timezone identifier (e.g., America/Los_Angeles)"
                            },
                            url: {
                                type: "string",
                                description: "Link to the event page (source URL)"
                            },
                            isAllDay: {
                                type: "boolean",
                                description: "Whether this is an all-day event (true when start_time is null)"
                            }
                        },
                        required: ["summary", "location", "start_date", "end_date", "start_time", "end_time", "description", "htmlDescription", "timezone", "url", "isAllDay"],
                        additionalProperties: false
                    }
                }
            },
            required: ["success", "errorMessage", "emailSubject", "locationLookup", "events"],
            additionalProperties: false
        };

        // Build content message (HTML + optional screenshot)
        const contentParts: any[] = [
            { type: 'text', text: `Content to analyze:\n${pageData.html}` }
        ];
        if (screenshot) {
            contentParts.push({ type: 'image_url', image_url: { url: screenshot } });
        }

        const payload = {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: instructionsText
                },
                {
                    role: 'user',
                    content: contentParts
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
            max_tokens: multiday ? 50000 : 20000,
            temperature: 0.1,
            reasoning: {
                effort: "medium",
                exclude: true
            }
        };

        // Log full OpenRouter request payload (excluding secrets; header is added in background)
        console.log('📤 OpenRouter request payload (popup):', payload);

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

    // First-pass content extraction using gpt-5-nano
    async function extractMainContent(url: string, html: string): Promise<string> {
        const system = 'You extract the MAIN CONTENT region from rendered HTML of a web page. Return only the main article/body content as FULL HTML (not plain text), preserving tags and structure, while removing navigation, headers, menus, ads, footers, and unrelated sections. NEVER include <script> tags or JavaScript. Focus on the actual content - articles, event details, descriptions, etc.';
        
        // Strip out script tags and get currently rendered content
        const cleanedHtml = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/gi, '');
            
        const user = `URL: ${url}\n\nRendered HTML (scripts removed):\n${cleanedHtml}`;

        const payload = {
            model: 'google/gemini-2.5-flash-lite',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: [{ type: 'text', text: user }] }
            ],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'main_content',
                    schema: {
                        type: 'object',
                        properties: { content: { type: 'string' } },
                        required: ['content'],
                        additionalProperties: false
                    },
                    strict: true
                }
            },
            max_tokens: 20000,
            temperature: 0.0
        } as any;

        console.log('🔎 Pre-extract request payload:', payload);
        const response = await chrome.runtime.sendMessage({ action: 'callOpenRouter', payload });
        if (!response.success) {
            throw new Error(`Pre-extract failed: ${response.error}`);
        }
        const content = (() => {
            const txt = response.data?.choices?.[0]?.message?.content || '';
            try {
                return JSON.parse(txt)?.content || '';
            } catch {
                return txt;
            }
        })();
        return content;
    }

    function parseAiResponse(response: string): { events: any[], emailSubject: string, locationLookup: string } {
        try {
            let cleaned = response.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleaned);

            // Handle success/error wrapper from AI
            if (parsed.success === false) {
                throw new Error(parsed.errorMessage || 'AI could not extract event data from the content');
            }

            // Support both wrapped { events: [...] } and legacy formats
            const events = Array.isArray(parsed.events) ? parsed.events :
                           Array.isArray(parsed) ? parsed :
                           parsed.eventData ? (Array.isArray(parsed.eventData) ? parsed.eventData : [parsed.eventData]) :
                           null;

            if (!events || events.length === 0) {
                throw new Error('No events found in AI response');
            }

            // Validate each event has required fields
            for (const event of events) {
                if (!event.summary) {
                    throw new Error('Missing required field: summary');
                }
                if (!event.start_date) {
                    throw new Error('Missing required field: start_date');
                }
            }

            return {
                events,
                emailSubject: parsed.emailSubject || events[0]?.summary || 'Calendar Event',
                locationLookup: parsed.locationLookup || events[0]?.location || ''
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    // ICS generation using shared library
    async function generateICSContent(events: any[], tentative: boolean): Promise<string> {
        // Convert events to EventData format
        const sanitizeDescription = (text: string) => {
            if (!text) return '';
            // Remove any lines like "Status: Tentative" or "Status: Confirmed"
            return text.replace(/(^|\n)\s*Status:\s*(Tentative|Confirmed)\s*(?=\n|$)/gi, '$1').trim();
        };

        const promptSettings = await chrome.storage.sync.get(['defaultTimezone']);
        const fallbackTz = promptSettings.defaultTimezone || __DEFAULT_TIMEZONE__;

        const eventDataArray: EventData[] = events.map(eventData => ({
            summary: eventData.summary,
            description: sanitizeDescription(eventData.description || ''),
            location: eventData.location || '',
            dtstart: eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : 'T00:00:00'),
            dtend: eventData.end_date ?
                eventData.end_date + (eventData.end_time ? `T${eventData.end_time}:00` : 'T23:59:59') :
                undefined,
            timezone: eventData.timezone || fallbackTz,
            isAllDay: eventData.isAllDay ?? (eventData.start_time === null),
            status: tentative ? 'tentative' : 'confirmed',
            url: eventData.url
        }));

        // Get fromEmail for organizer
        const settings = await chrome.storage.sync.get(['fromEmail']);

        // Generate ICS content for all events
        return icsGenerator.generateIcs(eventDataArray, {}, settings.fromEmail);
    }

    async function showReviewSection(events: any[], icsContent: string, emailSubject?: string) {
        processingView.style.display = 'none';
        reviewSection.style.display = 'block';

        reviewData = { eventData: events, icsContent, emailSubject };
        
        const reviewContent = document.getElementById('review-content')!;
        const reviewRecipient = document.getElementById('review-recipient')!;
        const reviewSubject = document.getElementById('review-subject')!;
        
        function escapeHtml(s: string) {
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function linkifyAndBreaks(text: string) {
            const escaped = escapeHtml(text || '');
            const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
            return linked.replace(/\n/g, '<br>');
        }

        function parseIcsDescriptions(ics: string) {
            try {
                const jcal = ICAL.parse(ics);
                const comp = new ICAL.Component(jcal);
                const vevents = comp.getAllSubcomponents('vevent') || [];
                const blocks = vevents.map((ve: any, idx: number) => {
                    const ev = new (ICAL as any).Event(ve);
                    const desc = (ev.description || '').toString();
                    const summary = (ev.summary || `Event ${idx + 1}`).toString();
                    const dtstart = ev.startDate?.toJSDate?.() as Date | undefined;
                    const dtend = ev.endDate?.toJSDate?.() as Date | undefined;
                    const loc = ev.location ? ev.location.toString() : undefined;
                    const fmt = (d?: Date) => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '';
                    const dateStr = dtstart ? `${fmt(dtstart)}${dtend ? ` – ${fmt(dtend)}` : ''}` : '';
                    return {
                        title: summary,
                        descriptionHtml: linkifyAndBreaks(desc),
                        date: dateStr,
                        location: loc
                    };
                });
                const subject = vevents.length === 1 ? (new (ICAL as any).Event(vevents[0])).summary?.toString() || 'Calendar Event' : `Calendar Events: ${vevents.length} Events`;
                return { subject, blocks };
            } catch (e) {
                const subject = events.length === 1 ? `Calendar Event: ${events[0].summary}` : `Calendar Events: ${events.length} Events`;
                const blocks = events.map((eventData: any, idx: number) => ({
                    title: eventData.summary || `Event ${idx + 1}`,
                    descriptionHtml: linkifyAndBreaks(eventData.description || ''),
                    date: `${eventData.start_date}${eventData.start_time ? ' ' + eventData.start_time : ''}`,
                    location: eventData.location
                }));
                return { subject, blocks };
            }
        }
        
        // Load stored email settings to show correct recipient
        const settings = await chrome.storage.sync.get(['toTentativeEmail', 'toConfirmedEmail']);
        const recipientEmail = tentativeToggle.checked ? 
            (settings.toTentativeEmail || 'tentative@example.com') : 
            (settings.toConfirmedEmail || 'confirmed@example.com');
        reviewRecipient.textContent = recipientEmail;
        
        const parsed = parseIcsDescriptions(icsContent);
        reviewSubject.textContent = parsed.subject;
        reviewContent.innerHTML = parsed.blocks.map((b: any, idx: number) => `
            <div class="ics-details mb-3">
                <h6>${parsed.blocks.length > 1 ? `Event ${idx + 1}: ` : ''}${escapeHtml(b.title)}</h6>
                ${b.date ? `<p><strong>Date:</strong> ${escapeHtml(b.date)}</p>` : ''}
                ${b.location ? `<p><strong>Location:</strong> ${escapeHtml(b.location)}</p>` : ''}
                <div><strong>Description:</strong><br>${b.descriptionHtml || '<em>(none)</em>'}</div>
            </div>
        `).join('');
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

        // Clear server response section
        const responseAccordion = document.getElementById('responseAccordion');
        const responseData = document.getElementById('responseData');
        if (responseAccordion) {
            responseAccordion.classList.add('d-none');
        }
        if (responseData) {
            responseData.innerHTML = '';
        }
    });
    
    sendButton?.addEventListener('click', async () => {
        if (reviewData) {
            console.log('📧 Send button clicked, sending email...');
            showReviewStatus('Sending email...', 'loading');
            disableReviewButtons(true);
            
            try {
                await sendEmail(reviewData.eventData, reviewData.icsContent, tentativeToggle.checked, reviewData.emailSubject);
                console.log('✅ Email sent successfully from review section');
                hideReviewStatus();
                reviewSection.style.display = 'none';
                formSection.style.display = 'block';
                showSuccessAlert('Email sent successfully!');
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
        const defaultModel = defaultModelSelect.value || DEFAULT_MODEL_ID;
        const defaultTimezoneSelect = document.getElementById('defaultTimezone') as HTMLSelectElement;
        const defaultTimezone = defaultTimezoneSelect?.value || __DEFAULT_TIMEZONE__;
        const customPromptInput = document.getElementById('customPrompt') as HTMLTextAreaElement;
        const customPrompt = customPromptInput?.value ?? __CUSTOM_PROMPT_DEFAULT__;

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
            defaultModel,
            defaultTimezone,
            customPrompt
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
    async function sendEmail(events: any[], icsContent: string, tentative: boolean, emailSubject?: string) {
        console.log('📬 sendEmail function called:', {
            eventCount: events.length,
            icsLength: icsContent.length,
            tentative,
            emailSubject
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

            console.log('📧 Email details:', {
                recipientEmail,
                fromEmail: settings.fromEmail,
                eventCount: events.length,
                tentative
            });

            const sanitizeDescription = (text: string) => {
                if (!text) return '';
                return text.replace(/(^|\n)\s*Status:\s*(Tentative|Confirmed)\s*(?=\n|$)/gi, '$1').trim();
            };

            // Always use a loop, whether single or multiple events
            console.log(`📨 Sending ${events.length} email(s)...`);
            const results = [];

            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                console.log(`📧 Sending email ${i + 1}/${events.length} for event: ${event.summary}`);

                // Generate individual ICS content for this single event
                const singleEventIcs = await generateICSContent([event], tentative);

                // Use AI-generated emailSubject for single events, per-event subject for multi
                const subject = (events.length === 1 && emailSubject)
                    ? `Calendar Event: ${emailSubject}`
                    : `Calendar Event: ${event.summary}`;
                const cleanDesc = sanitizeDescription(event.description || '');
                const emailBody = `Please find the calendar invitation attached.\n\nEvent: ${event.summary}\n${event.location ? `Location: ${event.location}\n` : ''}${cleanDesc ? `Description: ${cleanDesc}` : ''}`;

                const emailPayload: any = {
                    From: settings.fromEmail,
                    To: recipientEmail,
                    Subject: subject,
                    TextBody: emailBody,
                    Attachments: [
                        {
                            Name: 'invite.ics',
                            Content: btoa(unescape(encodeURIComponent(singleEventIcs))),
                            ContentType: 'text/calendar'
                        }
                    ]
                };

                // Add HTML body if htmlDescription is available from AI
                if (event.htmlDescription) {
                    emailPayload.HtmlBody = event.htmlDescription;
                }

                console.log(`📤 Sending email ${i + 1}/${events.length} payload to background script:`, {
                    from: emailPayload.From,
                    to: emailPayload.To,
                    subject: emailPayload.Subject,
                    bodyLength: emailPayload.TextBody.length,
                    hasHtmlBody: !!emailPayload.HtmlBody,
                    attachmentSize: emailPayload.Attachments[0].Content.length
                });

                const response = await chrome.runtime.sendMessage({
                    action: 'sendEmail',
                    payload: emailPayload
                });

                console.log(`📥 Email ${i + 1}/${events.length} send response:`, response);

                if (response.success) {
                    console.log(`✅ Email ${i + 1}/${events.length} sent successfully:`, response.data);
                    results.push({ success: true, event: event.summary });
                } else {
                    console.error(`❌ Email ${i + 1}/${events.length} send failed:`, response.error);
                    results.push({ success: false, event: event.summary, error: response.error });
                }
            }

            // Check if all emails were sent successfully
            const failedCount = results.filter(r => !r.success).length;
            if (failedCount > 0) {
                const failedEvents = results.filter(r => !r.success).map(r => r.event).join(', ');
                throw new Error(`Failed to send ${failedCount} out of ${events.length} email(s). Failed events: ${failedEvents}`);
            }

            const successMessage = events.length === 1
                ? 'Calendar invite sent successfully!'
                : `All ${events.length} calendar invites sent successfully!`;

            console.log(`✅ ${successMessage}`);
            return { message: successMessage };

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
            showSuccessAlert('Email sent successfully!');
        } catch (error) {
            console.error('💥 Global sendEmail error:', error);
            showStatus(`Failed to send email: ${error.message}`, 'error', true);
        }
    };

    // Initialize
    await initializeExtension();
});
