// Platform adapter interfaces for Node.js vs Browser differences

export interface HttpClient {
  post<T = any>(url: string, data: any, options?: HttpOptions): Promise<HttpResponse<T>>;
  get<T = any>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface StorageAdapter {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface CryptoAdapter {
  randomUUID(): string;
  hash(data: string, algorithm?: 'SHA-256' | 'SHA-1'): Promise<string>;
  // Optional for advanced crypto needs
  subtle?: SubtleCrypto;
}

export interface LoggerAdapter {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

export interface TimeAdapter {
  now(): number;
  toISOString(date: Date): string;
  parseDate(dateString: string, timezone?: string): Date;
  formatForICS(date: Date, timezone?: string): string;
}

// Platform adapter collection
export interface PlatformAdapters {
  http: HttpClient;
  storage: StorageAdapter;
  crypto: CryptoAdapter;
  logger: LoggerAdapter;
  time: TimeAdapter;
}

// Environment detection
export type RuntimeEnvironment = 'node' | 'browser' | 'extension';