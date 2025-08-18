// Load environment variables from .env file
import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { loadEnvConfig } from './config/env.js';
import { SqliteStorageAdapter } from './services/sqlite-storage.js';
import { PostmarkService } from './services/postmark-service.js';
import { CurlBrowserService } from './services/curl-browser-service.js';
import { createNodeAdapters } from '@email-to-ics/shared-core';
import { authMiddleware, rateLimitMiddleware } from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { apiRoutes } from './routes/api.js';
import { webRoutes } from './routes/web.js';

// Module augmentation for Fastify instance
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
async function createServer() {
  // Load and validate environment configuration
  const config = loadEnvConfig();
  
  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      } : undefined
    },
    trustProxy: true // Important for rate limiting and IP detection
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN ? [config.CORS_ORIGIN] : true,
    credentials: true
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });

  // Initialize services
  const storage = new SqliteStorageAdapter(config.DATABASE_PATH);
  const postmark = new PostmarkService(config);
  const nodeAdapters = createNodeAdapters(config.DATABASE_PATH);
  const curlBrowser = new CurlBrowserService(nodeAdapters.http, config);

  // Wait for storage to be ready (SQLite schema initialization)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Attach services to Fastify instance
  fastify.decorate('config', config);
  fastify.decorate('storage', storage);
  fastify.decorate('postmark', postmark);
  fastify.decorate('curlBrowser', curlBrowser);

  // Register middleware
  await fastify.register(authMiddleware);
  await fastify.register(rateLimitMiddleware);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(apiRoutes);
  await fastify.register(webRoutes);

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    // Send error notification for 5xx errors
    if (reply.statusCode >= 500) {
      try {
        await postmark.sendErrorNotification(error, `${request.method} ${request.url}`);
      } catch (emailError) {
        fastify.log.error(`Failed to send error notification: ${emailError instanceof Error ? emailError.message : String(emailError)}`);
      }
    }

    if (reply.statusCode >= 500) {
      return { 
        error: 'Internal server error',
        message: config.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      };
    }

    return { error: error.message };
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close database connection
      storage.close();
      
      // Close Fastify
      await fastify.close();
      
      fastify.log.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      fastify.log.error(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Cleanup expired cache entries periodically
  setInterval(async () => {
    try {
      await storage.cleanup();
    } catch (error) {
      fastify.log.error(`Cache cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, 15 * 60 * 1000); // Every 15 minutes

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    const server = await createServer();
    const config = loadEnvConfig();
    
    await server.listen({
      port: config.PORT,
      host: config.HOST
    });

    console.log(`
🚀 Email-to-ICS Server v2.0.0 Started!

📍 Server: http://${config.HOST}:${config.PORT}
🏥 Health: http://${config.HOST}:${config.PORT}/health
📊 API: http://${config.HOST}:${config.PORT}/api
🌐 Web: http://${config.HOST}:${config.PORT}

Environment: ${config.NODE_ENV}
Database: ${config.DATABASE_PATH}
curlBrowser: ${config.CURL_BROWSER_URL}
    `);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createServer, start };