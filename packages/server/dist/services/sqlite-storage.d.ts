import { StorageAdapter } from '@email-to-ics/shared-core';
export interface CacheItem {
    key: string;
    value: string;
    expires_at: number;
    created_at: number;
    updated_at: number;
}
/**
 * SQLite storage adapter implementation for Node.js server using sqlite3
 */
export declare class SqliteStorageAdapter implements StorageAdapter {
    private db;
    private dbRun;
    private dbGet;
    private dbAll;
    constructor(dbPath: string);
    private initializeSchema;
    private setupOptimizations;
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    /**
     * Clean up expired entries
     */
    cleanup(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        total: number;
        expired: number;
        size: number;
    }>;
    /**
     * Close database connection
     */
    close(): void;
}
