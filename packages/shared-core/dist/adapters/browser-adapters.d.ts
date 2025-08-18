import { HttpClient, HttpOptions, HttpResponse, StorageAdapter, CryptoAdapter, PlatformAdapters } from '../types/adapters.js';
/**
 * Browser HTTP client using fetch API
 */
export declare class BrowserHttpClient implements HttpClient {
    post<T = any>(url: string, data: any, options?: HttpOptions): Promise<HttpResponse<T>>;
    get<T = any>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;
    private request;
}
/**
 * Chrome extension storage adapter using chrome.storage.local
 */
export declare class ChromeStorageAdapter implements StorageAdapter {
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Browser crypto adapter using Web Crypto API
 */
export declare class BrowserCryptoAdapter implements CryptoAdapter {
    randomUUID(): string;
    hash(data: string, algorithm?: 'SHA-256' | 'SHA-1'): Promise<string>;
    get subtle(): SubtleCrypto | undefined;
}
/**
 * Create browser platform adapters for Chrome extension
 */
export declare function createBrowserAdapters(): PlatformAdapters;
