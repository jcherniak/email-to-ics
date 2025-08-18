import { z } from 'zod';
import { ParsingInput, ExtractionResult, EventData, EventDataSchema } from '../types/event.js';
import { PlatformAdapters } from '../types/adapters.js';

/**
 * AI Parser service for extracting events from content using OpenRouter API
 * Maintains compatibility with PHP EmailProcessor logic
 */
export class AiParserService {
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  
  constructor(
    private adapters: PlatformAdapters,
    private apiKey: string,
    private defaultModel: string = 'openai/gpt-5'
  ) {}

  /**
   * Extract events from parsing input - main entry point
   */
  async extractEvents(
    input: ParsingInput,
    options: {
      model?: string;
      fallbackModels?: string[];
      requiresReview?: boolean;
    } = {}
  ): Promise<ExtractionResult> {
    try {
      this.adapters.logger.info('Starting event extraction', { source: input.source });
      
      const model = options.model || this.defaultModel;
      const prompt = this.buildExtractionPrompt(input);
      
      // Try primary model first, then fallbacks
      const models = [model, ...(options.fallbackModels || ['openai/gpt-4o-mini'])];
      let lastError: Error | null = null;
      
      for (const currentModel of models) {
        try {
          const result = await this.callOpenRouter(currentModel, prompt);
          const events = this.parseAiResponse(result);
          
          return {
            events,
            confidence: this.calculateConfidence(events, result),
            source: input.source || 'unknown',
            model: currentModel,
            timestamp: this.adapters.time.now(),
            needsReview: options.requiresReview || events.length === 0,
            confirmationToken: options.requiresReview 
              ? await this.generateConfirmationToken(events)
              : undefined
          };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.adapters.logger.warn(`Model ${currentModel} failed`, err);
          lastError = err;
          continue;
        }
      }
      
      throw lastError || new Error('All AI models failed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.adapters.logger.error('Event extraction failed', err);
      throw err;
    }
  }

  /**
   * Build extraction prompt - matches PHP system prompt logic
   */
  private buildExtractionPrompt(input: ParsingInput): string {
    const systemPrompt = `You are an AI assistant that extracts calendar event information from emails and web content.

Extract event details and return ONLY a valid JSON object with this exact structure:
{
  "events": [
    {
      "summary": "Event title",
      "description": "Event description (plain text)",
      "htmlDescription": "HTML description if available",
      "location": "Event location",
      "dtstart": "2024-01-15T14:00:00",
      "dtend": "2024-01-15T16:00:00", 
      "timezone": "America/Los_Angeles",
      "isAllDay": false,
      "status": "confirmed",
      "url": "source URL if applicable"
    }
  ]
}

Rules:
- Always use ISO 8601 format for dates
- Include timezone information
- Extract location even if approximate
- Preserve original HTML in htmlDescription when available
- Set status to "tentative" if event seems tentative/unconfirmed
- Support multi-day events by creating multiple event objects
- Return empty array if no events found`;

    let userContent = '';
    
    if (input.html) {
      userContent += `HTML Content:\n${input.html}\n\n`;
    }
    
    if (input.text) {
      userContent += `Text Content:\n${input.text}\n\n`;
    }
    
    if (input.url) {
      userContent += `Source URL: ${input.url}\n\n`;
    }
    
    if (input.screenshot) {
      userContent += `Screenshot available: Yes\n\n`;
    }

    return JSON.stringify([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]);
  }

  /**
   * Call OpenRouter API with retries and error handling
   */
  private async callOpenRouter(model: string, prompt: string): Promise<any> {
    const payload = {
      model,
      messages: JSON.parse(prompt),
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    };

    const response = await this.adapters.http.post(this.openRouterUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://email-to-ics.local',
        'X-Title': 'Email-to-ICS'
      },
      timeout: 30000,
      retries: 2
    });

    if (response.status !== 200) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    return response.data.choices[0].message.content;
  }

  /**
   * Parse and validate AI response
   */
  private parseAiResponse(aiResponse: string): EventData[] {
    try {
      const parsed = JSON.parse(aiResponse);
      
      if (!parsed.events || !Array.isArray(parsed.events)) {
        throw new Error('Invalid response format: missing events array');
      }

      // Validate each event against schema
      const validatedEvents: EventData[] = [];
      for (const event of parsed.events) {
        try {
          const validatedEvent = EventDataSchema.parse(event);
          validatedEvents.push(validatedEvent);
        } catch (validationError) {
          this.adapters.logger.warn('Invalid event data', { event, validationError });
          // Skip invalid events but continue processing
        }
      }

      return validatedEvents;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.adapters.logger.error('Failed to parse AI response', err);
      throw new Error(`Invalid AI response: ${err.message}`);
    }
  }

  /**
   * Calculate confidence score based on events and AI response
   */
  private calculateConfidence(events: EventData[], aiResponse: string): number {
    if (events.length === 0) return 0;

    let confidence = 0.5; // Base confidence

    // Increase confidence for each complete event
    for (const event of events) {
      if (event.summary && event.dtstart) confidence += 0.2;
      if (event.location) confidence += 0.1;
      if (event.dtend) confidence += 0.1;
      if (event.description) confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate confirmation token for two-step flow
   */
  private async generateConfirmationToken(events: EventData[]): Promise<string> {
    const data = JSON.stringify({
      events,
      timestamp: this.adapters.time.now(),
      random: this.adapters.crypto.randomUUID()
    });
    
    const hash = await this.adapters.crypto.hash(data);
    return hash.substring(0, 16);
  }
}