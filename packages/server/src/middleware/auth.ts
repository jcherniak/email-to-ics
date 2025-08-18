import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EnvConfig } from '../config/env.js';

/**
 * Basic HTTP authentication middleware - matches PHP HTTP auth
 */
export async function authMiddleware(fastify: FastifyInstance) {
  const config = fastify.config as EnvConfig;

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health checks and webhooks
    if (request.url.startsWith('/health') || 
        request.url.startsWith('/ready') || 
        request.url.startsWith('/api/webhooks/')) {
      return;
    }

    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply.header('WWW-Authenticate', 'Basic realm="Email-to-ICS"');
      reply.code(401);
      return { error: 'Authentication required' };
    }

    try {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (username !== config.HTTP_AUTH_USERNAME || password !== config.HTTP_AUTH_PASSWORD) {
        reply.header('WWW-Authenticate', 'Basic realm="Email-to-ICS"');
        reply.code(401);
        return { error: 'Invalid credentials' };
      }
    } catch (error) {
      reply.header('WWW-Authenticate', 'Basic realm="Email-to-ICS"');
      reply.code(401);
      return { error: 'Invalid authentication format' };
    }
  });
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(fastify: FastifyInstance) {
  const config = fastify.config as EnvConfig;

  // Simple in-memory rate limiting (for production, use Redis)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting for health checks
    if (request.url.startsWith('/health') || request.url.startsWith('/ready')) {
      return;
    }

    const clientIp = request.ip;
    const now = Date.now();
    const windowMs = config.RATE_LIMIT_WINDOW;
    const maxRequests = config.RATE_LIMIT_MAX;

    const clientData = rateLimitMap.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      // New window or expired window
      rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      });
      return;
    }

    if (clientData.count >= maxRequests) {
      reply.code(429);
      reply.header('Retry-After', Math.ceil((clientData.resetTime - now) / 1000));
      return {
        error: 'Too many requests',
        retryAfter: clientData.resetTime
      };
    }

    clientData.count++;
  });

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 60000); // Cleanup every minute
}