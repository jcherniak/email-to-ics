/**
 * Base time adapter using standard Date APIs
 */
export class BaseTimeAdapter {
    now() {
        return Date.now();
    }
    toISOString(date) {
        return date.toISOString();
    }
    parseDate(dateString, timezone) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date string: ${dateString}`);
        }
        // TODO: Proper timezone handling with a library like date-fns-tz
        // For now, assume dates are in the specified timezone
        return date;
    }
    formatForICS(date, timezone) {
        if (timezone && timezone !== 'UTC') {
            // Format with timezone info: YYYYMMDDTHHMMSS
            return date.toISOString().replace(/[-:]/g, '').split('.')[0];
        }
        else {
            // UTC format: YYYYMMDDTHHMMSSZ
            return date.toISOString().replace(/[-:]/g, '').replace('.000', '');
        }
    }
}
/**
 * Console-based logger adapter
 */
export class ConsoleLoggerAdapter {
    debug(message, ...args) {
        console.debug(`[DEBUG] ${message}`, ...args);
    }
    info(message, ...args) {
        console.info(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
    error(message, error, ...args) {
        if (error) {
            console.error(`[ERROR] ${message}`, error, ...args);
        }
        else {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}
