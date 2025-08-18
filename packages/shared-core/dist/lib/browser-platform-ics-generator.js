/**
 * Browser-only Platform ICS Generator
 * Uses only browser-compatible implementation, no Node.js dependencies
 */
import { BrowserIcsGenerator } from './browser-ics-generator.js';
/**
 * Browser-only ICS generator that never attempts Node.js imports
 * Used by Chrome extension to avoid bundling Node.js dependencies
 */
export class BrowserPlatformIcsGenerator {
    adapters;
    browserGenerator;
    constructor(adapters) {
        this.adapters = adapters;
        this.browserGenerator = new BrowserIcsGenerator();
    }
    /**
     * Generate ICS content from events (browser-only)
     */
    async generateIcs(events, config = {}, fromEmail) {
        try {
            // Normalize to array
            const eventsArray = Array.isArray(events) ? events : [events];
            // Always use browser implementation
            return this.browserGenerator.generateIcs(eventsArray, config, fromEmail);
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
}
