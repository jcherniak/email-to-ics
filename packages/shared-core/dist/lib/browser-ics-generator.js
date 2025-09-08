/**
 * Browser-compatible ICS Generator
 * Pure JavaScript implementation without Node.js dependencies
 */
/**
 * Browser-compatible ICS generator using pure JavaScript
 */
export class BrowserIcsGenerator {
    /**
     * Generate ICS content from events
     */
    generateIcs(events, config = {}, fromEmail) {
        const { method = 'PUBLISH', includeHtmlDescription = true, filename = 'events' } = config;
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Email-to-ICS//Chrome Extension//EN',
            `METHOD:${method}`,
            'CALSCALE:GREGORIAN'
        ];
        events.forEach((event, index) => {
            const eventId = this.generateEventId(event, index);
            const startDate = this.formatDateTime(new Date(event.dtstart), event.timezone, event.isAllDay);
            const endDate = event.dtend ?
                this.formatDateTime(new Date(event.dtend), event.timezone, event.isAllDay) :
                this.formatDateTime(new Date(new Date(event.dtstart).getTime() + 3600000), event.timezone, event.isAllDay); // +1 hour default
            ics.push('BEGIN:VEVENT');
            ics.push(`UID:${eventId}`);
            ics.push(`DTSTAMP:${timestamp}`);
            ics.push(`DTSTART${this.getDateTimePrefix(event.timezone, event.isAllDay)}:${startDate}`);
            ics.push(`DTEND${this.getDateTimePrefix(event.timezone, event.isAllDay)}:${endDate}`);
            ics.push(`SUMMARY:${this.escapeText(event.summary)}`);
            if (event.description) {
                ics.push(`DESCRIPTION:${this.escapeText(event.description)}`);
            }
            if (event.location) {
                ics.push(`LOCATION:${this.escapeText(event.location)}`);
            }
            if (event.url) {
                ics.push(`URL:${event.url}`);
            }
            // Add status
            const status = event.status?.toUpperCase() || 'CONFIRMED';
            ics.push(`STATUS:${status}`);
            // Add organizer if fromEmail is provided
            if (fromEmail) {
                ics.push(`ORGANIZER:mailto:${fromEmail}`);
            }
            // Add HTML description if enabled and available
            if (includeHtmlDescription && event.htmlDescription) {
                ics.push(`X-ALT-DESC;FMTTYPE=text/html:${this.escapeText(event.htmlDescription)}`);
            }
            ics.push('END:VEVENT');
        });
        ics.push('END:VCALENDAR');
        return ics.join('\r\n') + '\r\n';
    }
    /**
     * Validate ICS content
     */
    validateIcs(icsContent) {
        const errors = [];
        // Basic validation
        if (!icsContent.includes('BEGIN:VCALENDAR')) {
            errors.push('Missing BEGIN:VCALENDAR');
        }
        if (!icsContent.includes('END:VCALENDAR')) {
            errors.push('Missing END:VCALENDAR');
        }
        if (!icsContent.includes('VERSION:2.0')) {
            errors.push('Missing VERSION:2.0');
        }
        // Count VEVENT blocks
        const beginEvents = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
        const endEvents = (icsContent.match(/END:VEVENT/g) || []).length;
        if (beginEvents !== endEvents) {
            errors.push('Mismatched VEVENT blocks');
        }
        if (beginEvents === 0) {
            errors.push('No events found');
        }
        // Check for required VEVENT properties
        const events = icsContent.split('BEGIN:VEVENT').slice(1);
        events.forEach((event, index) => {
            if (!event.includes('UID:')) {
                errors.push(`Event ${index + 1}: Missing UID`);
            }
            if (!event.includes('DTSTART')) {
                errors.push(`Event ${index + 1}: Missing DTSTART`);
            }
            if (!event.includes('SUMMARY:')) {
                errors.push(`Event ${index + 1}: Missing SUMMARY`);
            }
        });
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Generate unique event ID
     */
    generateEventId(event, index) {
        const baseId = `${event.summary.replace(/\s+/g, '-').toLowerCase()}-${index}`;
        const timestamp = new Date().getTime();
        return `${baseId}-${timestamp}@email-to-ics.extension`;
    }
    /**
     * Format date/time for ICS
     */
    formatDateTime(date, timezone, isAllDay) {
        if (isAllDay) {
            return date.toISOString().split('T')[0].replace(/-/g, '');
        }
        // If timezone is specified, format as local time without 'Z' suffix
        // We need to format the time as it is, not convert to UTC
        if (timezone && timezone !== 'UTC') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        }
        // For UTC times, include 'Z' suffix
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    /**
     * Get date/time prefix for ICS property
     */
    getDateTimePrefix(timezone, isAllDay) {
        if (isAllDay) {
            return ';VALUE=DATE';
        }
        if (timezone && timezone !== 'UTC') {
            return `;TZID=${timezone}`;
        }
        return '';
    }
    /**
     * Escape text for ICS format
     */
    escapeText(text) {
        return text
            .replace(/\\\\/g, '\\\\\\\\') // Escape backslashes
            .replace(/;/g, '\\\\;') // Escape semicolons
            .replace(/\\n/g, '\\\\n') // Escape newlines
            .replace(/\\r/g, '') // Remove carriage returns
            .trim();
    }
    /**
     * Parse existing ICS content (basic parser)
     */
    parseIcs(icsContent) {
        const events = [];
        const eventBlocks = icsContent.split('BEGIN:VEVENT').slice(1);
        eventBlocks.forEach(block => {
            const endIndex = block.indexOf('END:VEVENT');
            if (endIndex === -1)
                return;
            const eventContent = block.substring(0, endIndex);
            const event = this.parseEvent(eventContent);
            if (event) {
                events.push(event);
            }
        });
        return events;
    }
    /**
     * Parse individual event from ICS content
     */
    parseEvent(eventContent) {
        const lines = eventContent.split('\\n').map(line => line.trim()).filter(line => line);
        let event = {};
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1)
                return;
            const property = line.substring(0, colonIndex);
            const value = line.substring(colonIndex + 1);
            switch (property.split(';')[0]) {
                case 'SUMMARY':
                    event.summary = this.unescapeText(value);
                    break;
                case 'DESCRIPTION':
                    event.description = this.unescapeText(value);
                    break;
                case 'LOCATION':
                    event.location = this.unescapeText(value);
                    break;
                case 'DTSTART':
                    event.dtstart = this.parseIcsDateTime(value);
                    event.isAllDay = property.includes('VALUE=DATE');
                    break;
                case 'DTEND':
                    event.dtend = this.parseIcsDateTime(value);
                    break;
                case 'URL':
                    event.url = value;
                    break;
                case 'STATUS':
                    event.status = value.toLowerCase();
                    break;
            }
        });
        // Validate required fields
        if (!event.summary || !event.dtstart) {
            return null;
        }
        return event;
    }
    /**
     * Unescape ICS text
     */
    unescapeText(text) {
        return text
            .replace(/\\\\n/g, '\\n')
            .replace(/\\\\,/g, ',')
            .replace(/\\\\;/g, ';')
            .replace(/\\\\\\\\/g, '\\\\');
    }
    /**
     * Parse ICS date/time string
     */
    parseIcsDateTime(value) {
        // Handle all-day dates (YYYYMMDD)
        if (value.length === 8) {
            const year = value.substring(0, 4);
            const month = value.substring(4, 6);
            const day = value.substring(6, 8);
            return `${year}-${month}-${day}T00:00:00.000Z`;
        }
        // Handle date-time (YYYYMMDDTHHMMSSZ)
        if (value.length >= 15) {
            const year = value.substring(0, 4);
            const month = value.substring(4, 6);
            const day = value.substring(6, 8);
            const hour = value.substring(9, 11);
            const minute = value.substring(11, 13);
            const second = value.substring(13, 15);
            return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        }
        return new Date().toISOString();
    }
}
