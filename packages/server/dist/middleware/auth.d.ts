import { FastifyInstance } from 'fastify';
/**
 * Basic HTTP authentication middleware - matches PHP HTTP auth
 */
export declare function authMiddleware(fastify: FastifyInstance): Promise<void>;
/**
 * Rate limiting middleware
 */
export declare function rateLimitMiddleware(fastify: FastifyInstance): Promise<void>;
