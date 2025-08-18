/**
 * Platform-agnostic ICS Generator
 * Uses Node.js ical-generator in Node.js environment, browser implementation in browser
 */
import { BrowserIcsGenerator } from './browser-ics-generator.js';
/**
 * Platform-agnostic ICS generator that works in both Node.js and browser environments
 */
export class PlatformIcsGenerator {
    adapters;
    browserGenerator;
    constructor(adapters) {
        this.adapters = adapters;
        this.browserGenerator = new BrowserIcsGenerator();
    }
    /**
     * Generate ICS content from events
     */
    async generateIcs(events, config = {}, fromEmail) {
        try {
            // Normalize to array
            const eventsArray = Array.isArray(events) ? events : [events];
            // Check if we're in a Node.js environment and ical-generator is available
            if (this.isNodeEnvironment() && await this.hasIcalGenerator()) {
                return this.generateIcsNode(eventsArray, config, fromEmail);
            }
            else {
                // Use browser implementation
                return this.browserGenerator.generateIcs(eventsArray, config, fromEmail);
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.adapters.logger.error('Error generating ICS:', err);
            throw new Error(`Error creating iCalendar: ${err.message}`);
        }
    }
    /**
     * Validate ICS content
     */
    validateIcs(icsContent) {
        return this.browserGenerator.validateIcs(icsContent);
    }
    /**
     * Parse ICS content to events
     */
    parseIcs(icsContent) {
        return this.browserGenerator.parseIcs(icsContent);
    }
    /**
     * Generate ICS using Node.js ical-generator (when available)
     */
    async generateIcsNode(events, config, fromEmail) {
        const finalConfig = {
            method: 'PUBLISH',
            includeHtmlDescription: true,
            prodId: '-//Email-to-ICS//Node.js//EN',
            timezone: 'America/Los_Angeles',
            ...config
        };
        try {
            // Dynamic import of ical-generator (only works in Node.js)
            const ical = await import('ical-generator');
            const calendar = ical.default({
                name: 'Email-to-ICS Calendar',
                prodId: finalConfig.prodId,
                timezone: finalConfig.timezone
            });
            calendar.method(finalConfig.method);
            // Add events to calendar
            for (const event of events) {
                await this.addEventToNodeCalendar(calendar, event, finalConfig, fromEmail);
            }
            return calendar.toString();
        }
        catch (error) {
            // Fall back to browser implementation if Node.js version fails
            this.adapters.logger.warn('Node.js ICS generation failed, falling back to browser implementation');
            return this.browserGenerator.generateIcs(events, config, fromEmail);
        }
    }
    /**
     * Add event to Node.js calendar
     */
    async addEventToNodeCalendar(calendar, event, config, fromEmail) {
        const calEvent = calendar.createEvent({
            start: new Date(event.dtstart),
            end: event.dtend ? new Date(event.dtend) : new Date(new Date(event.dtstart).getTime() + 3600000),
            summary: event.summary,
            description: event.description || '',
            location: event.location || '',
            url: event.url || '',
            allDay: event.isAllDay || false,
            status: event.status === 'tentative' ? 'tentative' : 'confirmed'
        });
        // Set timezone if specified
        if (event.timezone) {
            calEvent.timezone(event.timezone);
        }
        // Add organizer if fromEmail provided
        if (fromEmail) {
            calEvent.organizer({
                name: 'Email-to-ICS',
                email: fromEmail
            });
        }
        // Add HTML description if enabled
        if (config.includeHtmlDescription && event.htmlDescription) {
            calEvent.x('X-ALT-DESC', `FMTTYPE=text/html:${event.htmlDescription}`);
        }
    }
    /**
     * Check if we're in a Node.js environment
     */
    isNodeEnvironment() {
        try {
            return typeof process !== 'undefined' &&
                process.versions != null &&
                process.versions.node != null;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if ical-generator is available (Node.js only)
     */
    async hasIcalGenerator() {
        try {
            await import('ical-generator');
            return true;
        }
        catch {
            return false;
        }
    }
}
