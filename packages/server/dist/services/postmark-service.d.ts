import { EnvConfig } from '../config/env.js';
export interface EmailAttachment {
    Name: string;
    Content: string;
    ContentType: string;
    ContentID?: string | null;
}
export interface SendEmailOptions {
    to: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
    tag?: string;
}
/**
 * Postmark email service - matches PHP Postmark integration
 */
export declare class PostmarkService {
    private client;
    private config;
    constructor(config: EnvConfig);
    /**
     * Send email with ICS attachment - matches PHP functionality
     */
    sendIcsEmail(options: {
        to: string;
        subject: string;
        description: string;
        icsContent: string;
        eventTitle: string;
        isTentative?: boolean;
    }): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    /**
     * Process inbound webhook from Postmark - matches PHP webhook handling
     */
    processInboundEmail(webhookData: any): Promise<{
        success: boolean;
        content?: {
            html?: string;
            text?: string;
        };
        error?: string;
    }>;
    /**
     * Send error notification email
     */
    sendErrorNotification(error: Error, context: string): Promise<void>;
    private buildTextBody;
    private buildHtmlBody;
    private sanitizeFilename;
}
