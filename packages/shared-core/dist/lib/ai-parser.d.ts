import { ParsingInput, ExtractionResult } from '../types/event.js';
import { PlatformAdapters } from '../types/adapters.js';
/**
 * AI Parser service for extracting events from content using OpenRouter API
 * Maintains compatibility with PHP EmailProcessor logic
 */
export declare class AiParserService {
    private adapters;
    private apiKey;
    private defaultModel;
    private readonly openRouterUrl;
    constructor(adapters: PlatformAdapters, apiKey: string, defaultModel?: string);
    /**
     * Extract events from parsing input - main entry point
     */
    extractEvents(input: ParsingInput, options?: {
        model?: string;
        fallbackModels?: string[];
        requiresReview?: boolean;
    }): Promise<ExtractionResult>;
    /**
     * Build extraction prompt - matches PHP system prompt logic
     */
    private buildExtractionPrompt;
    /**
     * Call OpenRouter API with retries and error handling
     */
    private callOpenRouter;
    /**
     * Parse and validate AI response
     */
    private parseAiResponse;
    /**
     * Calculate confidence score based on events and AI response
     */
    private calculateConfidence;
    /**
     * Generate confirmation token for two-step flow
     */
    private generateConfirmationToken;
}
