import { z } from 'zod';
import { PlatformIcsGenerator, AiParserService, createNodeAdapters } from '@email-to-ics/shared-core';
// Request/Response schemas
const GenerateIcsRequestSchema = z.object({
    events: z.array(z.object({
        summary: z.string(),
        description: z.string().optional(),
        htmlDescription: z.string().optional(),
        location: z.string().optional(),
        dtstart: z.string(),
        dtend: z.string().optional(),
        timezone: z.string().default('America/Los_Angeles'),
        isAllDay: z.boolean().default(false),
        status: z.enum(['confirmed', 'tentative']).default('confirmed'),
        url: z.string().url().optional()
    })),
    config: z.object({
        method: z.enum(['PUBLISH', 'REQUEST']).default('PUBLISH'),
        includeHtmlDescription: z.boolean().default(true),
        filename: z.string().optional()
    }).optional()
});
const ExtractEventsRequestSchema = z.object({
    input: z.object({
        html: z.string().optional(),
        text: z.string().optional(),
        url: z.string().url().optional(),
        screenshot: z.string().optional(),
        source: z.enum(['email', 'webpage', 'manual']).default('webpage')
    }),
    options: z.object({
        model: z.string().optional(),
        fallbackModels: z.array(z.string()).optional(),
        requiresReview: z.boolean().default(false)
    }).optional()
});
const ConfirmEventRequestSchema = z.object({
    confirmationToken: z.string(),
    selectedEvents: z.array(z.number()).optional(), // indices of events to confirm
    sendEmail: z.boolean().default(true),
    recipientEmail: z.string().email().optional()
});
const FetchUrlRequestSchema = z.object({
    url: z.string().url(),
    includeScreenshot: z.boolean().default(false)
});
/**
 * API routes for email-to-ICS functionality
 */
export async function apiRoutes(fastify) {
    const config = fastify.config;
    // Initialize services
    const adapters = createNodeAdapters(config.DATABASE_PATH);
    const icsGenerator = new PlatformIcsGenerator(adapters);
    const aiParser = new AiParserService(adapters, config.OPENROUTER_KEY, config.DEFAULT_MODEL);
    const curlBrowser = fastify.curlBrowser;
    const postmark = fastify.postmark;
    /**
     * Generate ICS from event data - POST /api/generate-ics
     */
    fastify.post('/api/generate-ics', async (request, reply) => {
        try {
            // Validate request body
            const { events, config: icsConfig } = GenerateIcsRequestSchema.parse(request.body);
            // Generate ICS content
            const icsContent = await icsGenerator.generateIcs(events, icsConfig || {}, config.FROM_EMAIL);
            // Validate ICS
            const validation = icsGenerator.validateIcs(icsContent);
            if (!validation.valid) {
                reply.code(400);
                return {
                    success: false,
                    error: 'Generated ICS is invalid',
                    details: validation.errors
                };
            }
            reply.header('Content-Type', 'text/calendar; charset=utf-8');
            reply.header('Content-Disposition', `attachment; filename="${icsConfig?.filename || 'event'}.ics"`);
            return icsContent;
        }
        catch (error) {
            fastify.log.error(`ICS generation failed: ${error instanceof Error ? error.message : String(error)}`);
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'ICS generation failed'
            };
        }
    });
    /**
     * Extract events from content - POST /api/extract-events
     */
    fastify.post('/api/extract-events', async (request, reply) => {
        try {
            // Validate request body
            const { input, options } = ExtractEventsRequestSchema.parse(request.body);
            // Extract events using AI
            const result = await aiParser.extractEvents(input, options || {});
            return {
                success: true,
                result
            };
        }
        catch (error) {
            fastify.log.error(`Event extraction failed: ${error instanceof Error ? error.message : String(error)}`);
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Event extraction failed'
            };
        }
    });
    /**
     * Fetch URL content via curlBrowser - POST /api/fetch-url
     */
    fastify.post('/api/fetch-url', async (request, reply) => {
        try {
            // Validate request body
            const { url, includeScreenshot } = FetchUrlRequestSchema.parse(request.body);
            const result = await curlBrowser.fetchUrl(url, { includeScreenshot });
            if (result.error) {
                reply.code(400);
                return {
                    success: false,
                    error: result.error
                };
            }
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            fastify.log.error(`URL fetch failed: ${error instanceof Error ? error.message : String(error)}`);
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'URL fetch failed'
            };
        }
    });
    /**
     * Confirm and send events - POST /api/confirm-events
     */
    fastify.post('/api/confirm-events', async (request, reply) => {
        try {
            // Validate request body
            const { confirmationToken, selectedEvents, sendEmail, recipientEmail } = ConfirmEventRequestSchema.parse(request.body);
            // TODO: Retrieve events from cache using confirmationToken
            // For now, return placeholder response
            if (sendEmail && recipientEmail) {
                // Generate ICS and send email
                // TODO: Implement full confirmation flow
                return {
                    success: true,
                    message: 'Events confirmed and email sent',
                    emailSent: true
                };
            }
            return {
                success: true,
                message: 'Events confirmed',
                emailSent: false
            };
        }
        catch (error) {
            fastify.log.error(`Event confirmation failed: ${error instanceof Error ? error.message : String(error)}`);
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Event confirmation failed'
            };
        }
    });
    /**
     * Process inbound email webhook - POST /api/webhooks/postmark
     */
    fastify.post('/api/webhooks/postmark', async (request, reply) => {
        try {
            // Process inbound email
            const result = await postmark.processInboundEmail(request.body);
            if (!result.success) {
                reply.code(400);
                return {
                    success: false,
                    error: result.error
                };
            }
            // Extract events from email content
            if (result.content) {
                const extractionResult = await aiParser.extractEvents({
                    html: result.content.html,
                    text: result.content.text,
                    source: 'email'
                });
                // If events found, process them
                if (extractionResult.events.length > 0) {
                    // Generate ICS
                    const icsContent = await icsGenerator.generateIcs(extractionResult.events, { method: 'REQUEST' }, config.FROM_EMAIL);
                    // Send to appropriate email based on event status
                    const recipientEmail = extractionResult.events.some(e => e.status === 'tentative')
                        ? config.TO_TENTATIVE_EMAIL
                        : config.TO_CONFIRMED_EMAIL;
                    // Send ICS email
                    await postmark.sendIcsEmail({
                        to: recipientEmail,
                        subject: `Calendar Event: ${extractionResult.events[0].summary}`,
                        description: extractionResult.events[0].description || '',
                        icsContent,
                        eventTitle: extractionResult.events[0].summary,
                        isTentative: extractionResult.events[0].status === 'tentative'
                    });
                }
            }
            return { success: true };
        }
        catch (error) {
            fastify.log.error(`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`);
            // Send error notification
            await postmark.sendErrorNotification(error instanceof Error ? error : new Error(String(error)), 'Postmark webhook processing');
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Webhook processing failed'
            };
        }
    });
}
