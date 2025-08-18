import { HttpClient, HttpOptions, HttpResponse } from '@email-to-ics/shared-core';
import { EnvConfig } from '../config/env.js';

export interface CurlBrowserResponse {
  html: string;
  title: string;
  url: string;
  screenshot?: string; // Base64 encoded
  error?: string;
}

/**
 * curlBrowser service for secure URL fetching via Docker container
 */
export class CurlBrowserService {
  private httpClient: HttpClient;
  private config: EnvConfig;

  constructor(httpClient: HttpClient, config: EnvConfig) {
    this.httpClient = httpClient;
    this.config = config;
  }

  /**
   * Fetch URL content via curlBrowser container with SSRF protection
   */
  async fetchUrl(url: string, options: {
    includeScreenshot?: boolean;
    timeout?: number;
  } = {}): Promise<CurlBrowserResponse> {
    try {
      // SSRF Protection: Validate URL
      this.validateUrl(url);

      const requestPayload = {
        url,
        screenshot: options.includeScreenshot || false,
        wait: 2000, // Wait 2 seconds for page to load
        viewport: {
          width: 1280,
          height: 720
        }
      };

      const response = await this.httpClient.post<CurlBrowserResponse>(
        `${this.config.CURL_BROWSER_URL}/fetch`,
        requestPayload,
        {
          timeout: options.timeout || this.config.CURL_BROWSER_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Email-to-ICS/2.0'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`curlBrowser request failed: ${response.status} ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error('curlBrowser fetch failed:', error);
      
      return {
        html: '',
        title: '',
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
      }

      // Block private IP ranges
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Block localhost variants
      if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
        throw new Error('Access to localhost is not allowed');
      }

      // Block private IP ranges (IPv4)
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipv4Match = hostname.match(ipv4Regex);
      
      if (ipv4Match) {
        const [, a, b, c, d] = ipv4Match.map(Number);
        
        // RFC 1918 private ranges
        if (
          (a === 10) || // 10.0.0.0/8
          (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
          (a === 192 && b === 168) || // 192.168.0.0/16
          (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
          (a === 127) // 127.0.0.0/8 (loopback)
        ) {
          throw new Error('Access to private IP ranges is not allowed');
        }
      }

      // Block common internal/metadata endpoints
      const blockedDomains = [
        'metadata.google.internal',
        '169.254.169.254', // AWS metadata
        'metadata.azure.com',
        'metadata.packet.net'
      ];

      if (blockedDomains.some(domain => hostname.includes(domain))) {
        throw new Error('Access to metadata endpoints is not allowed');
      }

      // Validate port (if specified)
      const port = parsedUrl.port;
      if (port) {
        const portNum = parseInt(port, 10);
        // Block common internal service ports
        const blockedPorts = [22, 23, 25, 53, 135, 139, 445, 993, 995, 1433, 1521, 3306, 3389, 5432, 5984, 6379, 9200, 9300, 11211, 27017];
        if (blockedPorts.includes(portNum)) {
          throw new Error(`Access to port ${port} is not allowed`);
        }
      }

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Health check for curlBrowser service
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.httpClient.get(`${this.config.CURL_BROWSER_URL}/health`, {
        timeout: 5000
      });

      return {
        healthy: response.status === 200
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}