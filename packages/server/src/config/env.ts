import { z } from 'zod';

/**
 * Environment configuration schema - matches PHP .env requirements
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  
  // Database
  DATABASE_PATH: z.string().default('./data/cache.db'),
  
  // API Keys
  OPENROUTER_KEY: z.string().min(1, 'OpenRouter API key is required'),
  POSTMARK_API_KEY: z.string().min(1, 'Postmark API key is required'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // Email Configuration
  FROM_EMAIL: z.string().email('Valid from email is required'),
  INBOUND_CONFIRMED_EMAIL: z.string().email().optional(),
  TO_TENTATIVE_EMAIL: z.string().email('Tentative email is required'),
  TO_CONFIRMED_EMAIL: z.string().email('Confirmed email is required'),
  ERROR_EMAIL: z.string().email('Error email is required'),
  
  // HTTP Auth
  HTTP_AUTH_USERNAME: z.string().min(1, 'HTTP auth username is required'),
  HTTP_AUTH_PASSWORD: z.string().min(1, 'HTTP auth password is required'),
  
  // AI Configuration
  AI_MODEL: z.string().optional(),
  DEFAULT_MODEL: z.string().default('google/gemini-2.5-pro-preview'),
  ALLOWED_MODELS: z.string().transform(str => str.split(',')).optional(),
  
  // curlBrowser Configuration
  CURL_BROWSER_URL: z.string().url().default('http://curlbrowser:8080'),
  CURL_BROWSER_TIMEOUT: z.coerce.number().default(30000),
  
  // CORS and Security
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}