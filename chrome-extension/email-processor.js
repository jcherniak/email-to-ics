// EmailProcessor - Ported from PHP to JavaScript
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
        this.availableModels = [];
        
        // Load settings from storage
        this.initializeFromStorage();
    }

    getOfflineAllowedModels() {
        // Return offline list of allowed models as fallback
        return [
            { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
            { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
            { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)' },
            { id: 'google/gemini-2.5-flash:thinking', name: 'Google Gemini 2.5 Flash (Thinking)' },
            { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
            { id: 'openai/o4-mini-high', name: 'OpenAI O4 Mini High' },
            { id: 'openai/o3', name: 'OpenAI O3' },
            { id: 'openai/gpt-4.1', name: 'OpenAI GPT-4.1' },
            { id: 'openai/o3-pro', name: 'OpenAI O3 Pro' }
        ];
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('Models loading timeout')), 10000))
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

    filterAllowedModels(allModels) {
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
            const fallbackModel = this.getOfflineAllowedModels().find(m => m.id === id);
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
            reviewMode = 'direct'
        } = params;

        try {
            // Build the prompt
            const prompt = this.buildPrompt(html, instructions, url, screenshot, tentative, multiday);
            
            // Call AI model
            const aiResponse = await this.callAiModel(prompt);
            
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

    buildPrompt(html, instructions, url, screenshot, tentative, multiday) {
        const basePrompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

CRITICAL: You must respond with valid JSON only. No markdown, no explanations, just pure JSON.

Extract event details from the provided content and return a JSON object with this exact structure:
{
    "summary": "Event title",
    "location": "Event location or empty string",
    "start_date": "YYYY-MM-DD",
    "start_time": "HH:MM" or null for all-day,
    "end_date": "YYYY-MM-DD", 
    "end_time": "HH:MM" or null for all-day,
    "description": "Event description",
    "timezone": "America/New_York"
}

Guidelines:
- Use ISO 8601 date format (YYYY-MM-DD)
- Use 24-hour time format (HH:MM)
- If no end time specified, make reasonable estimate
- Default timezone is America/New_York unless specified
- For all-day events, set start_time and end_time to null
- Multi-day events: ${multiday ? 'Expected' : 'Not expected'}
- Event status: ${tentative ? 'Tentative' : 'Confirmed'}

${instructions ? `Special instructions: ${instructions}\n` : ''}

${url ? `Source URL: ${url}\n` : ''}

Content to analyze:
${html}`;

        return basePrompt;
    }

    async callAiModel(prompt) {
        if (!this.openRouterKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': chrome.runtime.getURL(''),
                'X-Title': 'Email to ICS Chrome Extension'
            },
            body: JSON.stringify({
                model: this.aiModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: 0.1
            })
        });

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
            
            // Validate required fields
            if (!parsed.summary) {
                throw new Error('Missing required field: summary');
            }
            
            return parsed;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.error('Raw response:', response);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    async generateICS(eventData, tentative, multiday) {
        // Manual ICS generation since ical.js may not be available in service worker
        const uid = this.generateUID();
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Parse dates
        const startDate = new Date(eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : 'T00:00:00'));
        let endDate;
        
        if (eventData.end_date && eventData.end_time) {
            endDate = new Date(eventData.end_date + `T${eventData.end_time}:00`);
        } else if (eventData.end_date) {
            endDate = new Date(eventData.end_date + 'T23:59:59');
        } else if (eventData.start_time === null) {
            // All-day event, end next day
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        } else {
            // Default to 1 hour duration
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
        }
        
        // Format dates for ICS
        const formatDate = (date, allDay = false) => {
            if (allDay) {
                return date.toISOString().split('T')[0].replace(/-/g, '');
            } else {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            }
        };
        
        const isAllDay = eventData.start_time === null;
        const dtstart = isAllDay ? formatDate(startDate, true) : formatDate(startDate);
        const dtend = isAllDay ? formatDate(endDate, true) : formatDate(endDate);
        
        // Escape text for ICS format
        const escapeText = (text) => {
            if (!text) return '';
            return text.replace(/\\/g, '\\\\')
                      .replace(/;/g, '\\;')
                      .replace(/,/g, '\\,')
                      .replace(/\n/g, '\\n')
                      .replace(/\r/g, '');
        };
        
        // Build ICS content
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Email to ICS Extension//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${timestamp}`,
            `CREATED:${timestamp}`,
            `LAST-MODIFIED:${timestamp}`,
            `SUMMARY:${escapeText(eventData.summary)}`,
        ];
        
        // Add optional fields
        if (eventData.description) {
            icsContent.push(`DESCRIPTION:${escapeText(eventData.description)}`);
        }
        
        if (eventData.location) {
            icsContent.push(`LOCATION:${escapeText(eventData.location)}`);
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
        icsContent.push('END:VCALENDAR');
        
        return icsContent.join('\r\n');
    }

    generateUID() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@email-to-ics`;
    }

    generateEmailSubject(eventData) {
        return `Calendar Invite: ${eventData.summary}`;
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

        const emailBody = `Please find the calendar invitation attached.

Event: ${eventData.summary}
${eventData.location ? `Location: ${eventData.location}` : ''}
${eventData.description ? `Description: ${eventData.description}` : ''}

This invitation was generated automatically.`;

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