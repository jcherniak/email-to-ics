/**
 * Browser-only Platform ICS Generator
 * Uses only browser-compatible implementation, no Node.js dependencies
 */
import { EventData, IcsConfig } from '../types/event.js';
import { PlatformAdapters } from '../types/adapters.js';
import { IcsValidationResult } from './browser-ics-generator.js';
/**
 * Browser-only ICS generator that never attempts Node.js imports
 * Used by Chrome extension to avoid bundling Node.js dependencies
 */
export declare class BrowserPlatformIcsGenerator {
    private adapters;
    private browserGenerator;
    constructor(adapters: PlatformAdapters);
    /**
     * Generate ICS content from events (browser-only)
     */
    generateIcs(events: EventData | EventData[], config?: Partial<IcsConfig>, fromEmail?: string): Promise<string>;
    /**
     * Validate ICS content
     */
    validateIcs(icsContent: string): IcsValidationResult;
    /**
     * Parse ICS content to events
     */
    parseIcs(icsContent: string): EventData[];
}
