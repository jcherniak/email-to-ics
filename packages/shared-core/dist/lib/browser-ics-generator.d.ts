/**
 * Browser-compatible ICS Generator
 * Pure JavaScript implementation without Node.js dependencies
 */
import { EventData, IcsConfig } from '../types/event.js';
export interface IcsValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Browser-compatible ICS generator using pure JavaScript
 */
export declare class BrowserIcsGenerator {
    /**
     * Generate ICS content from events
     */
    generateIcs(events: EventData[], config?: Partial<IcsConfig>, fromEmail?: string): string;
    /**
     * Validate ICS content
     */
    validateIcs(icsContent: string): IcsValidationResult;
    /**
     * Generate unique event ID
     */
    private generateEventId;
    /**
     * Format date/time for ICS
     */
    private formatDateTime;
    /**
     * Get date/time prefix for ICS property
     */
    private getDateTimePrefix;
    /**
     * Escape text for ICS format
     */
    private escapeText;
    /**
     * Parse existing ICS content (basic parser)
     */
    parseIcs(icsContent: string): EventData[];
    /**
     * Parse individual event from ICS content
     */
    private parseEvent;
    /**
     * Unescape ICS text
     */
    private unescapeText;
    /**
     * Parse ICS date/time string
     */
    private parseIcsDateTime;
}
