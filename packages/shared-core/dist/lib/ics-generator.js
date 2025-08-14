import ical from 'ical-generator';
/**
 * ICS Generator that maintains parity with PHP IcalGenerator.php
 * Supports single events, multi-day events, and HTML descriptions
 */
export class IcsGenerator {
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
    }
    /**
     * Convert event data to ICS string - matches PHP convertJsonToIcs method
     */
    async generateIcs(eventData, config = {}, fromEmail) {
        try {
            // Determine if we have single or multiple events
            const isMultipleEvents = Array.isArray(eventData);
            const events = isMultipleEvents ? eventData : [eventData];
            // Create calendar with proper config
            const calendar = ical({
                name: 'Email-to-ICS Calendar',
                prodId: config.prodId || '-//Email-to-ICS//Node.js//EN',
                timezone: config.timezone || 'America/Los_Angeles'
            });
            // Set method separately if specified
            if (config.method) {
                calendar.method(config.method);
            }
            // Process each event
            for (const event of events) {
                await this.addEventToCalendar(calendar, event, fromEmail, config);
            }
            return calendar.toString();
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.adapters.logger.error('Error generating ICS', err);
            throw new Error(`Error creating iCalendar: ${err.message}`);
        }
    }
    /**
     * Add single event to calendar - matches PHP createEventFromData method
     */
    async addEventToCalendar(calendar, eventData, fromEmail, config) {
        const tzid = eventData.timezone || 'America/Los_Angeles';
        if (!eventData.summary || !eventData.dtstart) {
            throw new Error('Missing required event data (summary, dtstart)');
        }
        const isAllDay = eventData.isAllDay || false;
        // Generate UID if not provided (matches PHP logic)
        const uid = eventData.uid || await this.generateUID(eventData);
        // Parse dates with timezone handling
        const startDate = this.adapters.time.parseDate(eventData.dtstart, tzid);
        let endDate;
        if (eventData.dtend) {
            endDate = this.adapters.time.parseDate(eventData.dtend, tzid);
        }
        else {
            // Calculate default duration (matches PHP logic)
            endDate = new Date(startDate);
            if (!isAllDay) {
                let durationHours = 2; // default
                const summary = eventData.summary.toLowerCase();
                if (summary.includes('opera'))
                    durationHours = 3;
                else if (summary.includes('doctor') || summary.includes('appointment'))
                    durationHours = 0.5;
                endDate.setTime(endDate.getTime() + (durationHours * 60 * 60 * 1000));
            }
        }
        // Create event
        const event = calendar.createEvent({
            uid,
            start: startDate,
            end: endDate,
            allDay: isAllDay,
            summary: eventData.summary,
            timezone: isAllDay ? undefined : tzid,
        });
        // Set description (plain text)
        if (eventData.description) {
            const description = eventData.description.replace(/\\n/g, '\n');
            event.description(description);
        }
        // Add HTML description if available (matches PHP X-ALT-DESC)
        if (config.includeHtmlDescription && eventData.htmlDescription) {
            const htmlDescription = eventData.htmlDescription.trim();
            // ical-generator supports HTML via htmlDescription
            event.htmlDescription(htmlDescription);
        }
        // Set location
        if (eventData.location) {
            event.location(eventData.location);
        }
        // Set URL
        if (eventData.url) {
            event.url(eventData.url);
        }
        // Set organizer
        if (eventData.organizer) {
            event.organizer({
                name: eventData.organizer.name || 'Email-to-ICS',
                email: eventData.organizer.email
            });
        }
        else {
            event.organizer({
                name: 'Email-to-ICS',
                email: fromEmail
            });
        }
        // Set status (matches PHP logic)
        const status = eventData.status === 'tentative' ? 'tentative' : 'confirmed';
        event.status(status);
        // Add timestamp
        event.timestamp(new Date());
    }
    /**
     * Generate stable UID for event (deterministic based on content)
     */
    async generateUID(eventData) {
        // Create deterministic hash based on event content
        const content = `${eventData.summary}${eventData.dtstart}${eventData.location || ''}`;
        const hash = await this.adapters.crypto.hash(content);
        return `${hash.substring(0, 16)}@email-to-ics.local`;
    }
    /**
     * Validate generated ICS string
     */
    validateIcs(icsString) {
        const errors = [];
        // Basic validation checks
        if (!icsString.includes('BEGIN:VCALENDAR')) {
            errors.push('Missing VCALENDAR begin');
        }
        if (!icsString.includes('END:VCALENDAR')) {
            errors.push('Missing VCALENDAR end');
        }
        if (!icsString.includes('BEGIN:VEVENT')) {
            errors.push('Missing VEVENT begin');
        }
        if (!icsString.includes('DTSTART')) {
            errors.push('Missing DTSTART');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
