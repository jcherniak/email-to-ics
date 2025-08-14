import { HttpClient, HttpOptions, HttpResponse, StorageAdapter, CryptoAdapter, PlatformAdapters } from '../types/adapters';
/**
 * Node.js HTTP client using fetch (Node 18+)
 */
export declare class NodeHttpClient implements HttpClient {
    post<T = any>(url: string, data: any, options?: HttpOptions): Promise<HttpResponse<T>>;
    get<T = any>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;
    private request;
}
/**
 * SQLite-based storage adapter (requires better-sqlite3)
 * Note: This is a placeholder - actual implementation would be in the server package
 */
export declare class NodeSqliteStorageAdapter implements StorageAdapter {
    private db;
    constructor(dbPath: string);
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Node.js crypto adapter using built-in crypto module
 */
export declare class NodeCryptoAdapter implements CryptoAdapter {
    randomUUID(): string;
    hash(data: string, algorithm?: 'SHA-256' | 'SHA-1'): Promise<string>;
    get subtle(): SubtleCrypto;
}
/**
 * Create Node.js platform adapters
 */
export declare function createNodeAdapters(dbPath?: string): PlatformAdapters;
