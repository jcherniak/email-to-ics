import { HttpClient } from '@email-to-ics/shared-core';
import { EnvConfig } from '../config/env.js';
export interface CurlBrowserResponse {
    html: string;
    title: string;
    url: string;
    screenshot?: string;
    error?: string;
}
/**
 * curlBrowser service for secure URL fetching via Docker container
 */
export declare class CurlBrowserService {
    private httpClient;
    private config;
    constructor(httpClient: HttpClient, config: EnvConfig);
    /**
     * Fetch URL content via curlBrowser container with SSRF protection
     */
    fetchUrl(url: string, options?: {
        includeScreenshot?: boolean;
        timeout?: number;
    }): Promise<CurlBrowserResponse>;
    /**
     * Validate URL to prevent SSRF attacks
     */
    private validateUrl;
    /**
     * Health check for curlBrowser service
     */
    healthCheck(): Promise<{
        healthy: boolean;
        error?: string;
    }>;
}
