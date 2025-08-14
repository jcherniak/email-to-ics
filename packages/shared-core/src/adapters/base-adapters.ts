import { TimeAdapter, LoggerAdapter } from '../types/adapters';

/**
 * Base time adapter using standard Date APIs
 */
export class BaseTimeAdapter implements TimeAdapter {
  now(): number {
    return Date.now();
  }

  toISOString(date: Date): string {
    return date.toISOString();
  }

  parseDate(dateString: string, timezone?: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    
    // TODO: Proper timezone handling with a library like date-fns-tz
    // For now, assume dates are in the specified timezone
    return date;
  }

  formatForICS(date: Date, timezone?: string): string {
    if (timezone && timezone !== 'UTC') {
      // Format with timezone info: YYYYMMDDTHHMMSS
      return date.toISOString().replace(/[-:]/g, '').split('.')[0];
    } else {
      // UTC format: YYYYMMDDTHHMMSSZ
      return date.toISOString().replace(/[-:]/g, '').replace('.000', '');
    }
  }
}

/**
 * Console-based logger adapter
 */
export class ConsoleLoggerAdapter implements LoggerAdapter {
  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    if (error) {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}