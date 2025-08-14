import { TimeAdapter, LoggerAdapter } from '../types/adapters';
/**
 * Base time adapter using standard Date APIs
 */
export declare class BaseTimeAdapter implements TimeAdapter {
    now(): number;
    toISOString(date: Date): string;
    parseDate(dateString: string, timezone?: string): Date;
    formatForICS(date: Date, timezone?: string): string;
}
/**
 * Console-based logger adapter
 */
export declare class ConsoleLoggerAdapter implements LoggerAdapter {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, error?: Error, ...args: any[]): void;
}
