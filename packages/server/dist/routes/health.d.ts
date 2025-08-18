import { FastifyInstance } from 'fastify';
export interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    services: {
        database: {
            status: 'up' | 'down';
            stats?: any;
            error?: string;
        };
        curlBrowser: {
            status: 'up' | 'down';
            error?: string;
        };
        cache: {
            status: 'up' | 'down';
            stats?: any;
            error?: string;
        };
    };
}
/**
 * Health check routes for monitoring and debugging
 */
export declare function healthRoutes(fastify: FastifyInstance): Promise<void>;
