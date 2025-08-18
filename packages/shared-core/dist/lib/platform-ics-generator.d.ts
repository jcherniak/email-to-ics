/**
 * Platform-agnostic ICS Generator
 * Uses Node.js ical-generator in Node.js environment, browser implementation in browser
 */
import { EventData, IcsConfig } from '../types/event.js';
import { PlatformAdapters } from '../types/adapters.js';
import { IcsValidationResult } from './browser-ics-generator.js';
/**
 * Platform-agnostic ICS generator that works in both Node.js and browser environments
 */
export declare class PlatformIcsGenerator {
    private adapters;
    private browserGenerator;
    constructor(adapters: PlatformAdapters);
    /**
     * Generate ICS content from events
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
    /**
     * Generate ICS using Node.js ical-generator (when available)
     */
    private generateIcsNode;
    /**
     * Add event to Node.js calendar
     */
    private addEventToNodeCalendar;
    /**
     * Check if we're in a Node.js environment
     */
    private isNodeEnvironment;
    /**
     * Check if ical-generator is available (Node.js only)
     */
    private hasIcalGenerator;
}
