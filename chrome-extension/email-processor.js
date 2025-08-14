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
            { id: 'openai/gpt-5', name: 'GPT-5' },
            { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
            { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1' },
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
        // Strip tracking parameters from URL
        const cleanUrl = url ? this.stripTrackingParameters(url) : url;
        
        const multiDayInstructions = multiday ? 
            `MULTI-DAY MODE ENABLED: Extract ALL related performances/sessions as SEPARATE events.

When you see multiple performances like:
- "Friday, October 3, 2025 at 7:30PM"
- "Saturday, October 4, 2025 at 7:30PM" 
- "Sunday, October 5, 2025 at 2:00PM"

Create SEPARATE events for each performance, each with:
- Same summary/title (e.g., "Gimeno Conducts Tchaikovsky 5")
- Same location and description
- Different start_date, start_time, end_date, end_time for each performance
- Same timezone

RETURN FORMAT FOR MULTI-DAY MODE: Return an ARRAY of event objects: [{event1}, {event2}, {event3}]

This applies to:
- Multiple concert performances  
- Conference sessions across days
- Festival events on different dates
- Any scheduled performances of the same show` :
            `SINGLE EVENT MODE: Focus on extracting ONLY the main/primary event. Ignore secondary or related events.`;
            
        const basePrompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

CRITICAL: You must respond with valid JSON only. No markdown, no explanations, just pure JSON.

# PRIMARY EVENT IDENTIFICATION
Your primary task is to identify and extract events described in the content.

${multiDayInstructions}

# OUTPUT FORMAT
${multiday ? 
    `Return an ARRAY of event objects (one for each performance):
[
    {
        "summary": "Event 1 title",
        "location": "Event location",
        "start_date": "2025-10-03",
        "start_time": "19:30",
        "end_date": "2025-10-03", 
        "end_time": "21:30",
        "description": "Event 1 description",
        "timezone": "America/Los_Angeles",
        "url": "Event URL"
    },
    {
        "summary": "Event 2 title", 
        "location": "Event location",
        "start_date": "2025-10-04",
        "start_time": "19:30",
        "end_date": "2025-10-04",
        "end_time": "21:30", 
        "description": "Event 2 description",
        "timezone": "America/Los_Angeles",
        "url": "Event URL"
    }
]` :
    `Return a single event object:
{
    "summary": "Event title",
    "location": "Event location or empty string",
    "start_date": "YYYY-MM-DD",
    "start_time": "HH:MM" or null for all-day,
    "end_date": "YYYY-MM-DD", 
    "end_time": "HH:MM" or null for all-day,
    "description": "Event description",
    "timezone": "America/New_York",
    "url": "Event URL or source URL"
}`
}

Guidelines:
- Use ISO 8601 date format (YYYY-MM-DD)
- Use 24-hour time format (HH:MM)
- If no end time specified, make reasonable estimate (2h default, 3h opera)
- Default timezone is America/Los_Angeles unless specified
- For all-day events, set start_time and end_time to null
- Event status: ${tentative ? 'Tentative' : 'Confirmed'}
- IMPORTANT: If a source URL is provided, include it in the "url" field
- IMPORTANT: If a source URL is provided, also add it at the bottom of the description field with text "\\n\\nSource: [URL]"

${instructions ? `Special instructions: ${instructions}\n` : ''}

${cleanUrl ? `Source URL: ${cleanUrl}\n` : ''}

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