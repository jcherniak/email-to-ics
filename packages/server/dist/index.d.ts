import 'dotenv/config';
import { SqliteStorageAdapter } from './services/sqlite-storage.js';
import { PostmarkService } from './services/postmark-service.js';
import { CurlBrowserService } from './services/curl-browser-service.js';
declare module 'fastify' {
    interface FastifyInstance {
        config: any;
        storage: SqliteStorageAdapter;
        postmark: PostmarkService;
        curlBrowser: CurlBrowserService;
    }
}
/**
 * Email-to-ICS Node.js Server
 * Fastify-based server with SQLite caching, matching PHP functionality
 */
declare function createServer(): Promise<import("fastify").FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>>;
/**
 * Start the server
 */
declare function start(): Promise<void>;
export { createServer, start };
