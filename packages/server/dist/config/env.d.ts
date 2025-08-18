import { z } from 'zod';
/**
 * Environment configuration schema - matches PHP .env requirements
 */
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_PATH: z.ZodDefault<z.ZodString>;
    OPENROUTER_KEY: z.ZodString;
    POSTMARK_API_KEY: z.ZodString;
    GOOGLE_MAPS_API_KEY: z.ZodOptional<z.ZodString>;
    FROM_EMAIL: z.ZodString;
    INBOUND_CONFIRMED_EMAIL: z.ZodOptional<z.ZodString>;
    TO_TENTATIVE_EMAIL: z.ZodString;
    TO_CONFIRMED_EMAIL: z.ZodString;
    ERROR_EMAIL: z.ZodString;
    HTTP_AUTH_USERNAME: z.ZodString;
    HTTP_AUTH_PASSWORD: z.ZodString;
    AI_MODEL: z.ZodOptional<z.ZodString>;
    DEFAULT_MODEL: z.ZodDefault<z.ZodString>;
    ALLOWED_MODELS: z.ZodOptional<z.ZodEffects<z.ZodString, string[], string>>;
    CURL_BROWSER_URL: z.ZodDefault<z.ZodString>;
    CURL_BROWSER_TIMEOUT: z.ZodDefault<z.ZodNumber>;
    CORS_ORIGIN: z.ZodOptional<z.ZodString>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_WINDOW: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    HOST: string;
    DATABASE_PATH: string;
    OPENROUTER_KEY: string;
    POSTMARK_API_KEY: string;
    FROM_EMAIL: string;
    TO_TENTATIVE_EMAIL: string;
    TO_CONFIRMED_EMAIL: string;
    ERROR_EMAIL: string;
    HTTP_AUTH_USERNAME: string;
    HTTP_AUTH_PASSWORD: string;
    DEFAULT_MODEL: string;
    CURL_BROWSER_URL: string;
    CURL_BROWSER_TIMEOUT: number;
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_WINDOW: number;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    INBOUND_CONFIRMED_EMAIL?: string | undefined;
    AI_MODEL?: string | undefined;
    ALLOWED_MODELS?: string[] | undefined;
    CORS_ORIGIN?: string | undefined;
}, {
    OPENROUTER_KEY: string;
    POSTMARK_API_KEY: string;
    FROM_EMAIL: string;
    TO_TENTATIVE_EMAIL: string;
    TO_CONFIRMED_EMAIL: string;
    ERROR_EMAIL: string;
    HTTP_AUTH_USERNAME: string;
    HTTP_AUTH_PASSWORD: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    HOST?: string | undefined;
    DATABASE_PATH?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    INBOUND_CONFIRMED_EMAIL?: string | undefined;
    AI_MODEL?: string | undefined;
    DEFAULT_MODEL?: string | undefined;
    ALLOWED_MODELS?: string | undefined;
    CURL_BROWSER_URL?: string | undefined;
    CURL_BROWSER_TIMEOUT?: number | undefined;
    CORS_ORIGIN?: string | undefined;
    RATE_LIMIT_MAX?: number | undefined;
    RATE_LIMIT_WINDOW?: number | undefined;
}>;
export type EnvConfig = z.infer<typeof envSchema>;
/**
 * Load and validate environment configuration
 */
export declare function loadEnvConfig(): EnvConfig;
