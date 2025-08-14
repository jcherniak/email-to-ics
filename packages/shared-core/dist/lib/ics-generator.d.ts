import { EventData, MultiDayEvents, IcsConfig } from '../types/event';
import { PlatformAdapters } from '../types/adapters';
/**
 * ICS Generator that maintains parity with PHP IcalGenerator.php
 * Supports single events, multi-day events, and HTML descriptions
 */
export declare class IcsGenerator {
    private adapters;
    constructor(adapters: PlatformAdapters);
    /**
     * Convert event data to ICS string - matches PHP convertJsonToIcs method
     */
    generateIcs(eventData: EventData | MultiDayEvents, config: Partial<IcsConfig> | undefined, fromEmail: string): Promise<string>;
    /**
     * Add single event to calendar - matches PHP createEventFromData method
     */
    private addEventToCalendar;
    /**
     * Generate stable UID for event (deterministic based on content)
     */
    private generateUID;
    /**
     * Validate generated ICS string
     */
    validateIcs(icsString: string): {
        valid: boolean;
        errors: string[];
    };
}
