import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
/**
 * SQLite storage adapter implementation for Node.js server using sqlite3
 */
export class SqliteStorageAdapter {
    db;
    dbRun;
    dbGet;
    dbAll;
    constructor(dbPath) {
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new sqlite3.Database(dbPath);
        // Promisify database methods
        this.dbRun = promisify(this.db.run.bind(this.db));
        this.dbGet = promisify(this.db.get.bind(this.db));
        this.dbAll = promisify(this.db.all.bind(this.db));
        this.initializeSchema();
        this.setupOptimizations();
    }
    async initializeSchema() {
        // Create cache table if it doesn't exist
        await this.dbRun(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at)');
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_cache_updated_at ON cache(updated_at)');
    }
    async setupOptimizations() {
        try {
            // Enable WAL mode for better concurrency
            await this.dbRun('PRAGMA journal_mode = WAL');
            // Set synchronous to NORMAL for better performance
            await this.dbRun('PRAGMA synchronous = NORMAL');
            // Set busy timeout
            await this.dbRun('PRAGMA busy_timeout = 5000');
            // Enable foreign keys
            await this.dbRun('PRAGMA foreign_keys = ON');
        }
        catch (error) {
            console.warn('Some SQLite optimizations failed:', error);
        }
    }
    async get(key) {
        const now = Date.now();
        try {
            const row = await this.dbGet('SELECT value FROM cache WHERE key = ? AND expires_at > ?', key, now);
            if (!row) {
                return null;
            }
            return JSON.parse(row.value);
        }
        catch (error) {
            console.error('Failed to get cached value:', error);
            // Remove corrupted entry
            await this.delete(key);
            return null;
        }
    }
    async set(key, value, ttl = 3600) {
        const now = Date.now();
        const expiresAt = now + (ttl * 1000);
        const serializedValue = JSON.stringify(value);
        try {
            await this.dbRun(`INSERT OR REPLACE INTO cache 
         (key, value, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`, key, serializedValue, expiresAt, now, now);
        }
        catch (error) {
            console.error('Failed to set cached value:', error);
            throw error;
        }
    }
    async delete(key) {
        try {
            await this.dbRun('DELETE FROM cache WHERE key = ?', key);
        }
        catch (error) {
            console.error('Failed to delete cached value:', error);
            throw error;
        }
    }
    async clear() {
        try {
            await this.dbRun('DELETE FROM cache');
        }
        catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    }
    /**
     * Clean up expired entries
     */
    async cleanup() {
        const now = Date.now();
        try {
            const result = await this.dbRun('DELETE FROM cache WHERE expires_at <= ?', now);
            console.log('Cache cleanup completed');
        }
        catch (error) {
            console.error('Cache cleanup failed:', error);
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const now = Date.now();
        try {
            const totalRow = await this.dbGet('SELECT COUNT(*) as count FROM cache');
            const expiredRow = await this.dbGet('SELECT COUNT(*) as count FROM cache WHERE expires_at <= ?', now);
            // Get database size (simplified)
            const sizeRow = await this.dbGet('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
            return {
                total: totalRow.count,
                expired: expiredRow.count,
                size: sizeRow?.size || 0
            };
        }
        catch (error) {
            console.error('Failed to get cache stats:', error);
            return { total: 0, expired: 0, size: 0 };
        }
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Failed to close database:', err);
            }
        });
    }
}
