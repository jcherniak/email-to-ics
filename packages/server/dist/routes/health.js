/**
 * Health check routes for monitoring and debugging
 */
export async function healthRoutes(fastify) {
    // Basic health check
    fastify.get('/health', async (request, reply) => {
        const storage = fastify.storage;
        const curlBrowser = fastify.curlBrowser;
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            services: {
                database: { status: 'up' },
                curlBrowser: { status: 'up' },
                cache: { status: 'up' }
            }
        };
        // Check database
        try {
            const stats = storage.getStats();
            response.services.database = { status: 'up', stats };
        }
        catch (error) {
            response.services.database = {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            response.status = 'unhealthy';
        }
        // Check cache (same as database for SQLite)
        try {
            const stats = storage.getStats();
            response.services.cache = { status: 'up', stats };
        }
        catch (error) {
            response.services.cache = {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            response.status = 'unhealthy';
        }
        // Check curlBrowser
        try {
            const curlHealth = await curlBrowser.healthCheck();
            response.services.curlBrowser = {
                status: curlHealth.healthy ? 'up' : 'down',
                error: curlHealth.error
            };
            if (!curlHealth.healthy) {
                response.status = 'unhealthy';
            }
        }
        catch (error) {
            response.services.curlBrowser = {
                status: 'down',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            response.status = 'unhealthy';
        }
        // Set appropriate status code
        reply.code(response.status === 'healthy' ? 200 : 503);
        return response;
    });
    // Readiness check (simpler check for container orchestration)
    fastify.get('/ready', async (request, reply) => {
        try {
            const storage = fastify.storage;
            // Basic database connectivity check
            storage.getStats();
            return { status: 'ready', timestamp: new Date().toISOString() };
        }
        catch (error) {
            reply.code(503);
            return {
                status: 'not ready',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    });
    // Cache management endpoint
    fastify.post('/admin/cache/cleanup', async (request, reply) => {
        try {
            const storage = fastify.storage;
            storage.cleanup();
            return {
                success: true,
                message: 'Cache cleanup completed',
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    });
    // Cache stats endpoint
    fastify.get('/admin/cache/stats', async (request, reply) => {
        try {
            const storage = fastify.storage;
            const stats = storage.getStats();
            return {
                ...stats,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            reply.code(500);
            return {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    });
}
