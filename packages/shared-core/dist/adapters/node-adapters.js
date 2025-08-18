import { BaseTimeAdapter, ConsoleLoggerAdapter } from './base-adapters.js';
/**
 * Node.js HTTP client using fetch (Node 18+)
 */
export class NodeHttpClient {
    async post(url, data, options = {}) {
        return this.request('POST', url, data, options);
    }
    async get(url, options = {}) {
        return this.request('GET', url, undefined, options);
    }
    async request(method, url, data, options = {}) {
        const controller = new AbortController();
        const timeout = options.timeout || 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: data ? JSON.stringify(data) : undefined,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseData = await response.json();
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            return {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (options.retries && options.retries > 0) {
                const retryOptions = { ...options, retries: options.retries - 1 };
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
                return this.request(method, url, data, retryOptions);
            }
            throw error;
        }
    }
}
/**
 * SQLite-based storage adapter (requires better-sqlite3)
 * Note: This is a placeholder - actual implementation would be in the server package
 */
export class NodeSqliteStorageAdapter {
    db; // Will be better-sqlite3 Database instance
    constructor(dbPath) {
        // This will be implemented in the server package with better-sqlite3
        console.warn('NodeSqliteStorageAdapter is a placeholder - implement in server package');
    }
    async get(key) {
        // Placeholder implementation
        return null;
    }
    async set(key, value, ttl) {
        // Placeholder implementation
    }
    async delete(key) {
        // Placeholder implementation
    }
    async clear() {
        // Placeholder implementation
    }
}
/**
 * Node.js crypto adapter using built-in crypto module
 */
export class NodeCryptoAdapter {
    randomUUID() {
        return crypto.randomUUID();
    }
    async hash(data, algorithm = 'SHA-256') {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    get subtle() {
        return crypto.subtle;
    }
}
/**
 * Create Node.js platform adapters
 */
export function createNodeAdapters(dbPath) {
    return {
        http: new NodeHttpClient(),
        storage: new NodeSqliteStorageAdapter(dbPath || './cache.db'),
        crypto: new NodeCryptoAdapter(),
        logger: new ConsoleLoggerAdapter(),
        time: new BaseTimeAdapter()
    };
}
