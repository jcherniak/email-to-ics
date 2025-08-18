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
 * Browser HTTP client using fetch API
 */
export class BrowserHttpClient implements HttpClient {
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.request(method, url, data, retryOptions);
      }
      
      throw error;
    }
  }
}

/**
 * Chrome extension storage adapter using chrome.storage.local
 */
export class ChromeStorageAdapter implements StorageAdapter {
  async get<T = any>(key: string): Promise<T | null> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API not available');
    }

    const result = await chrome.storage.local.get([key]);
    const item = result[key];
    
    if (!item) {
      return null;
    }
    
    // Check if item has metadata wrapper (from our set method)
    if (typeof item === 'object' && item.value !== undefined) {
      // Check expiration if present
      if (item.expires && Date.now() > item.expires) {
        await this.delete(key);
        return null;
      }
      return item.value;
    }
    
    // Return item directly if it doesn't have our wrapper
    return item;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API not available');
    }

    const item: any = { value };
    if (ttl) {
      item.expires = Date.now() + (ttl * 1000);
    }

    await chrome.storage.local.set({ [key]: item });
  }

  async delete(key: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API not available');
    }

    await chrome.storage.local.remove([key]);
  }

  async clear(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API not available');
    }

    await chrome.storage.local.clear();
  }
}

/**
 * Browser crypto adapter using Web Crypto API
 */
export class BrowserCryptoAdapter implements CryptoAdapter {
  randomUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async hash(data: string, algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  get subtle(): SubtleCrypto | undefined {
    return typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  }
}

/**
 * Create browser platform adapters for Chrome extension
 */
export function createBrowserAdapters(): PlatformAdapters {
  return {
    http: new BrowserHttpClient(),
    storage: new ChromeStorageAdapter(),
    crypto: new BrowserCryptoAdapter(),
    logger: new ConsoleLoggerAdapter(),
    time: new BaseTimeAdapter()
  };
}