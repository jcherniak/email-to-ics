export type EventData = {
  summary: string;
  description?: string;
  htmlDescription?: string;
  location?: string;
  dtstart: string;
  dtend?: string;
  timezone?: string;
  isAllDay?: boolean;
  status?: 'confirmed' | 'tentative';
  url?: string;
};

type IcsConfig = {
  method?: 'PUBLISH' | 'REQUEST';
  includeHtmlDescription?: boolean;
};

export class BrowserIcsGenerator {
  generateIcs(events: EventData[], config: IcsConfig = {}): string {
    const method = config.method || 'PUBLISH';
    const includeHtmlDescription = config.includeHtmlDescription !== false;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Email-to-ICS//Chrome Extension//EN',
      `METHOD:${method}`,
      'CALSCALE:GREGORIAN'
    ];

    events.forEach((event, index) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${this.uid(event, index)}`);
      lines.push(`DTSTAMP:${timestamp}`);
      lines.push(`DTSTART${this.datePrefix(event)}:${this.formatDate(event.dtstart, event)}`);
      const end = event.dtend || this.defaultEnd(event.dtstart, event.isAllDay);
      lines.push(`DTEND${this.datePrefix(event)}:${this.formatDate(end, event)}`);
      lines.push(`SUMMARY:${this.escapeText(event.summary)}`);

      if (event.description) lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      if (event.location) lines.push(`LOCATION:${this.escapeText(event.location)}`);
      if (event.url) lines.push(`URL:${event.url}`);
      lines.push(`STATUS:${(event.status || 'confirmed').toUpperCase()}`);
      if (includeHtmlDescription && event.htmlDescription) {
        lines.push(`X-ALT-DESC;FMTTYPE=text/html:${this.escapeText(event.htmlDescription)}`);
      }

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  private uid(event: EventData, index: number): string {
    const slug = event.summary.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    return `${slug || 'event'}-${index}-${Date.now()}@email-to-ics.extension`;
  }

  private datePrefix(event: EventData): string {
    if (event.isAllDay) return ';VALUE=DATE';
    return event.timezone && event.timezone !== 'UTC' ? `;TZID=${event.timezone}` : '';
  }

  private formatDate(value: string, event: EventData): string {
    if (event.isAllDay) return value.slice(0, 10).replace(/-/g, '');
    const [date, time = '00:00:00'] = value.split('T');
    return `${date.replace(/-/g, '')}T${time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')}`;
  }

  private defaultEnd(dtstart: string, isAllDay?: boolean): string {
    if (isAllDay) return dtstart;
    const date = new Date(dtstart);
    date.setHours(date.getHours() + 1);
    return date.toISOString().slice(0, 19);
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')
      .trim();
  }
}
