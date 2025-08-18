// EmailProcessor - Ported from PHP to JavaScript
// Shared model configuration will be imported by background.js before this script

class EmailProcessor {
    constructor() {
        this.openRouterKey = '';
        this.postmarkApiKey = '';
        this.fromEmail = '';
        this.inboundConfirmedEmail = '';
        this.toTentativeEmail = '';
        this.toConfirmedEmail = '';
        this.aiModel = 'google/gemini-2.5-pro';
        this.maxTokens = 20000;
        this.requestTimeout = 120000; // 2 minutes timeout
        this.availableModels = [];
        
        // Load settings from storage
        this.initializeFromStorage();
    }

    getOfflineAllowedModels() {
        if (typeof ALLOWED_MODELS === 'undefined') {
            throw new Error('Shared model configuration not loaded - models-config.js import failed');
        }
        return ALLOWED_MODELS;
    }

    async initializeFromStorage() {
        try {
            console.log('EmailProcessor: Loading settings from storage...');
            const settings = await this.getStoredSettings();
            console.log('EmailProcessor: Settings loaded:', Object.keys(settings || {}));
            
            if (settings) {
                this.openRouterKey = settings.openRouterKey || '';
                this.postmarkApiKey = settings.postmarkApiKey || '';
                this.fromEmail = settings.fromEmail || '';
                this.inboundConfirmedEmail = settings.inboundConfirmedEmail || '';
                this.toTentativeEmail = settings.toTentativeEmail || '';
                this.toConfirmedEmail = settings.toConfirmedEmail || '';
                this.aiModel = settings.aiModel || 'google/gemini-2.5-pro';
            }
            
            console.log('EmailProcessor: Loading available models...');
            // Load available models with timeout
            this.availableModels = await Promise.race([
                this.loadAvailableModels(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Models loading timeout')), 30000))
            ]);
            console.log('EmailProcessor: Models loaded successfully, count:', this.availableModels.length);
        } catch (error) {
            console.error('EmailProcessor: Initialization error:', error);
            // Use fallback models on error
            this.availableModels = this.getOfflineAllowedModels();
            console.log('EmailProcessor: Using fallback models, count:', this.availableModels.length);
        }
    }

    async getStoredSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'openRouterKey', 'postmarkApiKey', 'fromEmail', 
                'inboundConfirmedEmail', 'toTentativeEmail', 'toConfirmedEmail', 'aiModel'
            ], resolve);
        });
    }

    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, resolve);
        });
    }

    async loadAvailableModels() {
        try {
            // Check cache first
            const cached = await this.getCachedModels();
            if (cached && cached.timestamp && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
                return this.filterAllowedModels(cached.models || []);
            }

            if (!this.openRouterKey) {
                console.warn('No OpenRouter API key configured');
                return this.getAllowedModelsOffline();
            }

            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.openRouterKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const allModels = data.data || [];

            // Cache the results
            await this.setCachedModels(allModels);
            
            // Filter to only allowed models
            return this.filterAllowedModels(allModels);
        } catch (error) {
            console.error('Error loading models:', error);
            return this.getAllowedModelsOffline();
        }
    }

    getAllowedModelsOffline() {
        return this.getOfflineAllowedModels();
    }

    filterAllowedModels(allModels) {
        if (typeof ALLOWED_MODEL_IDS === 'undefined' || typeof PREFERRED_ORDER === 'undefined') {
            throw new Error('Shared model configuration not loaded - models-config.js import failed');
        }

        // Filter models to only include allowed ones
        const filteredModels = allModels.filter(model => 
            ALLOWED_MODEL_IDS.includes(model.id)
        );

        // Add any missing models with fallback names
        const foundIds = filteredModels.map(m => m.id);
        const missingIds = ALLOWED_MODEL_IDS.filter(id => !foundIds.includes(id));
        
        missingIds.forEach(id => {
            const fallbackModel = ALLOWED_MODELS.find(m => m.id === id);
            if (fallbackModel) {
                filteredModels.push(fallbackModel);
            }
        });

        // Sort models with preferred order
        return filteredModels.sort((a, b) => {
            const aIndex = PREFERRED_ORDER.indexOf(a.id);
            const bIndex = PREFERRED_ORDER.indexOf(b.id);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }

    async getCachedModels() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['modelsCache'], (result) => {
                resolve(result.modelsCache || null);
            });
        });
    }

    async setCachedModels(models) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                modelsCache: {
                    models: models,
                    timestamp: Date.now()
                }
            }, resolve);
        });
    }

    async processContent(params) {
        const {
            url,
            html,
            instructions = '',
            screenshot = null,
            tentative = true,
            multiday = false,
            reviewMode = 'direct',
            aiModel = null
        } = params;

        try {
            // Use the model from params if provided, otherwise use stored model
            const modelToUse = aiModel || this.aiModel;
            console.log('🤖 Using AI model:', modelToUse);
            
            // Build the prompt
            const prompt = this.buildPrompt(html, instructions, url, screenshot, tentative, multiday);
            
            // Call AI model with the specified model
            const aiResponse = await this.callAiModel(prompt, modelToUse, multiday);
            
            // Parse and validate response
            const parsedData = this.parseAiResponse(aiResponse);
            
            // Generate ICS
            const icsContent = await this.generateICS(parsedData, tentative, multiday);
            
            // Determine recipient email
            const recipientEmail = tentative ? this.toTentativeEmail : this.toConfirmedEmail;
            
            if (reviewMode === 'review') {
                // Return for review
                const confirmationToken = this.generateConfirmationToken();
                await this.storeConfirmationData(confirmationToken, {
                    icsContent,
                    recipientEmail,
                    emailSubject: this.generateEmailSubject(parsedData),
                    parsedData
                });
                
                return {
                    needsReview: true,
                    confirmationToken,
                    icsContent,
                    recipientEmail,
                    emailSubject: this.generateEmailSubject(parsedData)
                };
            } else {
                // Send directly
                await this.sendEmail(recipientEmail, this.generateEmailSubject(parsedData), icsContent, parsedData);
                return {
                    message: 'Calendar invite sent successfully!',
                    icsContent
                };
            }
        } catch (error) {
            console.error('Error processing content:', error);
            throw error;
        }
    }

    stripTrackingParameters(url) {
        if (!url) return url;
        
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            
            // List of tracking parameters to remove
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
                'fbclid', 'gclid', 'dclid', 'msclkid',
                'mc_cid', 'mc_eid', // Mailchimp
                '_ga', '_gid', '_gac', // Google Analytics
                'ref', 'referer', 'referrer'
            ];
            
            // Remove tracking parameters
            let hasChanges = false;
            for (const param of trackingParams) {
                if (params.has(param)) {
                    params.delete(param);
                    hasChanges = true;
                }
            }
            
            // Only rebuild if we removed something
            if (hasChanges) {
                urlObj.search = params.toString();
                return urlObj.toString();
            }
            
            return url;
        } catch (error) {
            console.error('Error stripping tracking parameters:', error);
            return url;
        }
    }
    
    buildPrompt(html, instructions, url, screenshot, tentative, multiday) {
        console.log('🔧 EmailProcessor buildPrompt v3.0 - System prompt separation');
        console.log('📅 Multi-day mode:', multiday);
        
        // Strip tracking parameters from URL
        const cleanUrl = url ? this.stripTrackingParameters(url) : url;
        
        // Build user content that will be sent separately from system prompt
        let userContent = '';
        
        // Add mode-specific instructions
        if (multiday) {
            userContent += 'MULTI-DAY MODE: Extract ALL related performances/sessions as SEPARATE events.\n\n';
        } else {
            userContent += 'SINGLE EVENT MODE: Focus on extracting ONLY the main/primary event.\n\n';
        }
        
        // Add event status
        userContent += `Event status: ${tentative ? 'Tentative' : 'Confirmed'}\n\n`;
        
        // Add special instructions if provided
        if (instructions) {
            userContent += `Special instructions: ${instructions}\n\n`;
        }
        
        // Add source URL if provided
        if (cleanUrl) {
            userContent += `Source URL: ${cleanUrl}\n\n`;
        }
        
        // Add the main content to analyze
        userContent += 'Content to analyze:\n' + html;

        return userContent;
    }

    async callAiModel(prompt, modelToUse = null, multiday = false) {
        if (!this.openRouterKey) {
            throw new Error('OpenRouter API key not configured');
        }
        
        const model = modelToUse || this.aiModel;
        console.log('🔧 callAiModel - Sending system + user messages to model:', model);
        console.log('📅 Multi-day mode in callAiModel:', multiday);

        // Use the injected system prompt from build time
        const systemPrompt = INJECTED_SYSTEM_PROMPT;
        console.log('✅ System prompt loaded from build injection, length:', systemPrompt.length);
        
        // Format the user content with the specific parameters
        const userContent = `${prompt}`;

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Request timed out after ${this.requestTimeout}ms`)), this.requestTimeout)
        );
        
        // Create fetch promise
        const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': chrome.runtime.getURL(''),
                'X-Title': 'Email to ICS Chrome Extension'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user', 
                        content: userContent
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: 0.1,
                response_format: { 
                    type: "json_schema",
                    json_schema: {
                        name: "chrome_extension_response",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                "events": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "summary": { "type": "string" },
                                            "location": { "type": "string" },
                                            "start_date": { "type": "string" },
                                            "start_time": { "type": ["string", "null"] },
                                            "end_date": { "type": "string" },
                                            "end_time": { "type": ["string", "null"] },
                                            "description": { "type": "string" },
                                            "timezone": { "type": "string" },
                                            "url": { "type": "string" }
                                        },
                                        "required": ["summary", "location", "start_date", "end_date", "description", "timezone", "url"],
                                        "additionalProperties": false
                                    },
                                    "minItems": 1,
                                    "maxItems": multiday ? 50 : 1
                                }
                            },
                            required: ["events"],
                            additionalProperties: false
                        }
                    }
                }
            })
        });
        
        console.log(`🕒 Making API request to ${model} with ${this.requestTimeout/1000}s timeout...`);
        const startTime = Date.now();
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const duration = Date.now() - startTime;
        console.log(`⚡ API request completed in ${duration}ms`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    parseAiResponse(response) {
        try {
            // Clean up response - remove any markdown formatting
            let cleaned = response.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
            }
            
            const parsed = JSON.parse(cleaned);
            
            // Expect "events" array in all cases
            if (!parsed.events) {
                throw new Error('Missing required field: events');
            }
            
            if (!Array.isArray(parsed.events)) {
                throw new Error('events field must be an array');
            }
            
            if (parsed.events.length === 0) {
                throw new Error('events array cannot be empty');
            }
            
            // Validate each event
            for (const event of parsed.events) {
                if (!event.summary) {
                    throw new Error('Missing required field: summary in event');
                }
                if (!event.location) {
                    throw new Error('Missing required field: location in event');
                }
                if (!event.start_date) {
                    throw new Error('Missing required field: start_date in event');
                }
                if (!event.end_date) {
                    throw new Error('Missing required field: end_date in event');
                }
                if (!event.description) {
                    throw new Error('Missing required field: description in event');
                }
                if (!event.timezone) {
                    throw new Error('Missing required field: timezone in event');
                }
                if (!event.url) {
                    throw new Error('Missing required field: url in event');
                }
            }
            
            return parsed.events;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.error('Raw response:', response);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    async generateICS(eventData, tentative, multiday) {
        console.log('🎫 EmailProcessor generateICS v2.0 - Multi-day ICS generation');
        console.log('📊 Event data received:', eventData);
        console.log('🔢 Is array?', Array.isArray(eventData));
        console.log('📝 Event count:', Array.isArray(eventData) ? eventData.length : 1);
        
        // Handle both single events and arrays of events
        const events = Array.isArray(eventData) ? eventData : [eventData];
        
        // Helper functions
        const escapeText = (text) => {
            if (!text) return '';
            return text.replace(/\\/g, '\\\\')
                      .replace(/;/g, '\\;')
                      .replace(/,/g, '\\,')
                      .replace(/\n/g, '\\n')
                      .replace(/\r/g, '');
        };
        
        const formatDate = (date, allDay = false) => {
            if (allDay) {
                return date.toISOString().split('T')[0].replace(/-/g, '');
            } else {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            }
        };
        
        // Start building ICS content
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Email to ICS Extension//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST'
        ];
        
        // Add each event
        for (const singleEvent of events) {
            const uid = this.generateUID();
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            
            // Parse dates
            const startDate = new Date(singleEvent.start_date + (singleEvent.start_time ? `T${singleEvent.start_time}:00` : 'T00:00:00'));
            let endDate;
            
            if (singleEvent.end_date && singleEvent.end_time) {
                endDate = new Date(singleEvent.end_date + `T${singleEvent.end_time}:00`);
            } else if (singleEvent.end_date) {
                endDate = new Date(singleEvent.end_date + 'T23:59:59');
            } else if (singleEvent.start_time === null) {
                // All-day event, end next day
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
            } else {
                // Default to 1 hour duration
                endDate = new Date(startDate);
                endDate.setHours(endDate.getHours() + 1);
            }
            
            const isAllDay = singleEvent.start_time === null;
            const dtstart = isAllDay ? formatDate(startDate, true) : formatDate(startDate);
            const dtend = isAllDay ? formatDate(endDate, true) : formatDate(endDate);
            
            // Add event to ICS
            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${uid}`);
            icsContent.push(`DTSTAMP:${timestamp}`);
            icsContent.push(`CREATED:${timestamp}`);
            icsContent.push(`LAST-MODIFIED:${timestamp}`);
            icsContent.push(`SUMMARY:${escapeText(singleEvent.summary)}`);
            
            // Add optional fields
            if (singleEvent.description) {
                icsContent.push(`DESCRIPTION:${escapeText(singleEvent.description)}`);
            }
            
            if (singleEvent.location) {
                icsContent.push(`LOCATION:${escapeText(singleEvent.location)}`);
            }
            
            if (singleEvent.url) {
                icsContent.push(`URL:${escapeText(singleEvent.url)}`);
            }
            
            // Add dates
            if (isAllDay) {
                icsContent.push(`DTSTART;VALUE=DATE:${dtstart}`);
                icsContent.push(`DTEND;VALUE=DATE:${dtend}`);
            } else {
                icsContent.push(`DTSTART:${dtstart}`);
                icsContent.push(`DTEND:${dtend}`);
            }
            
            // Add status
            if (tentative) {
                icsContent.push('STATUS:TENTATIVE');
            } else {
                icsContent.push('STATUS:CONFIRMED');
            }
            
            // Add organizer if configured
            if (this.fromEmail) {
                icsContent.push(`ORGANIZER:mailto:${this.fromEmail}`);
            }
            
            icsContent.push('END:VEVENT');
        }
        
        icsContent.push('END:VCALENDAR');
        
        return icsContent.join('\r\n');
    }

    generateUID() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@email-to-ics`;
    }

    generateEmailSubject(eventData) {
        // eventData is now always an array of events
        const events = Array.isArray(eventData) ? eventData : [eventData];
        if (events.length === 1) {
            return `Calendar Invite: ${events[0].summary}`;
        } else {
            return `Calendar Invites: ${events.length} events`;
        }
    }

    generateConfirmationToken() {
        return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async storeConfirmationData(token, data) {
        return new Promise((resolve) => {
            const storageKey = `confirmation_${token}`;
            chrome.storage.local.set({ [storageKey]: data }, resolve);
        });
    }

    async getConfirmationData(token) {
        return new Promise((resolve) => {
            const storageKey = `confirmation_${token}`;
            chrome.storage.local.get([storageKey], (result) => {
                console.log('Getting confirmation data for key:', storageKey);
                console.log('Storage result:', result);
                resolve(result[storageKey] || null);
            });
        });
    }

    async sendEmail(recipientEmail, subject, icsContent, eventData) {
        if (!this.postmarkApiKey) {
            throw new Error('Postmark API key not configured');
        }

        // eventData is now always an array of events
        const events = Array.isArray(eventData) ? eventData : [eventData];
        
        let emailBody = `Please find the calendar invitation${events.length > 1 ? 's' : ''} attached.\n\n`;
        
        if (events.length === 1) {
            const event = events[0];
            emailBody += `Event: ${event.summary}\n`;
            emailBody += event.location ? `Location: ${event.location}\n` : '';
            emailBody += event.description ? `Description: ${event.description}\n` : '';
        } else {
            emailBody += `Events (${events.length}):\n`;
            events.forEach((event, index) => {
                emailBody += `\n${index + 1}. ${event.summary}\n`;
                emailBody += event.location ? `   Location: ${event.location}\n` : '';
                emailBody += event.start_date ? `   Date: ${event.start_date}\n` : '';
            });
        }
        
        emailBody += '\nThis invitation was generated automatically.';

        const response = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': this.postmarkApiKey
            },
            body: JSON.stringify({
                From: this.fromEmail,
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
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Postmark API error: ${response.status} ${errorText}`);
        }

        return await response.json();
    }

    async confirmEvent(confirmationToken) {
        const data = await this.getConfirmationData(confirmationToken);
        if (!data) {
            throw new Error('Invalid or expired confirmation token');
        }

        await this.sendEmail(data.recipientEmail, data.emailSubject, data.icsContent, data.parsedData);
        
        // Clean up confirmation data
        const storageKey = `confirmation_${confirmationToken}`;
        chrome.storage.local.remove([storageKey]);
        
        return {
            message: 'Calendar invite sent successfully!',
            icsContent: data.icsContent
        };
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailProcessor;
}

// Make globally available for service worker importScripts
console.log('EmailProcessor: Setting up global exports...');
console.log('EmailProcessor: typeof self =', typeof self);
console.log('EmailProcessor: typeof globalThis =', typeof globalThis);
console.log('EmailProcessor: self === globalThis =', self === globalThis);

// Robust global assignment with error handling
try {
    // In service workers, self is the primary global object
    if (typeof self !== 'undefined') {
        self.EmailProcessor = EmailProcessor;
        console.log('EmailProcessor: ✅ Assigned to self.EmailProcessor');
    }
    
    if (typeof globalThis !== 'undefined') {
        globalThis.EmailProcessor = EmailProcessor;
        console.log('EmailProcessor: ✅ Assigned to globalThis.EmailProcessor');
    }
    
    if (typeof global !== 'undefined') {
        global.EmailProcessor = EmailProcessor;
        console.log('EmailProcessor: ✅ Assigned to global.EmailProcessor');
    }
    
    // Immediate verification after assignment
    const selfAssigned = typeof self?.EmailProcessor === 'function';
    const globalThisAssigned = typeof globalThis?.EmailProcessor === 'function';
    const anyAssigned = selfAssigned || globalThisAssigned;
    
    console.log('EmailProcessor: Assignment verification:');
    console.log('  - self.EmailProcessor:', selfAssigned ? '✅ function' : '❌ ' + typeof (self?.EmailProcessor));
    console.log('  - globalThis.EmailProcessor:', globalThisAssigned ? '✅ function' : '❌ ' + typeof (globalThis?.EmailProcessor));
    console.log('  - Any assignment successful:', anyAssigned ? '✅ YES' : '❌ NO');
    
    if (!anyAssigned) {
        throw new Error('Failed to assign EmailProcessor to any global object');
    }
    
} catch (error) {
    console.error('EmailProcessor: ❌ Global assignment failed:', error);
    // Still throw to make the error visible
    throw error;
}