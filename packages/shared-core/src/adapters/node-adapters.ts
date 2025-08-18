import { 
  HttpClient, 
  HttpOptions, 
  HttpResponse, 
  StorageAdapter, 
  CryptoAdapter,
  PlatformAdapters 
} from '../types/adapters.js';
import { BaseTimeAdapter, ConsoleLoggerAdapter } from './base-adapters.js';

/**
 * Node.js HTTP client using fetch (Node 18+)
 */
export class NodeHttpClient implements HttpClient {
  async post<T = any>(url: string, data: any, options: HttpOptions = {}): Promise<HttpResponse<T>> {
    return this.request('POST', url, data, options);
  }

  async get<T = any>(url: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
    return this.request('GET', url, undefined, options);
  }

  private async request<T>(
    method: string, 
    url: string, 
    data?: any, 
    options: HttpOptions = {}
  ): Promise<HttpResponse<T>> {
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

      const responseData = await response.json() as T;
      
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers
      };
    } catch (error) {
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
export class NodeSqliteStorageAdapter implements StorageAdapter {
  private db: any; // Will be better-sqlite3 Database instance
  
  constructor(dbPath: string) {
    // This will be implemented in the server package with better-sqlite3
    console.warn('NodeSqliteStorageAdapter is a placeholder - implement in server package');
  }

  async get<T = any>(key: string): Promise<T | null> {
    // Placeholder implementation
    return null;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    // Placeholder implementation
  }

  async delete(key: string): Promise<void> {
    // Placeholder implementation
  }

  async clear(): Promise<void> {
    // Placeholder implementation
  }
}

/**
 * Node.js crypto adapter using built-in crypto module
 */
export class NodeCryptoAdapter implements CryptoAdapter {
  randomUUID(): string {
    return crypto.randomUUID();
  }

  async hash(data: string, algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  get subtle(): SubtleCrypto {
    return crypto.subtle;
  }
}

/**
 * Create Node.js platform adapters
 */
export function createNodeAdapters(dbPath?: string): PlatformAdapters {
  return {
    http: new NodeHttpClient(),
    storage: new NodeSqliteStorageAdapter(dbPath || './cache.db'),
    crypto: new NodeCryptoAdapter(),
    logger: new ConsoleLoggerAdapter(),
    time: new BaseTimeAdapter()
  };
}