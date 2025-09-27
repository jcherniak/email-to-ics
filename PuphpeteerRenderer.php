<?php

use Zoon\Puphpeteer\Puppeteer;
use Nesk\Rialto\Data\JsFunction;

class PuphpeteerRenderer
{
    private $puppeteer;
    private $browser;

    public function __construct()
    {
        // Initialize Puppeteer with custom options
        $this->puppeteer = new Puppeteer([
            'executable_path' => 'node', // Path to Node.js
            'idle_time' => 60000, // Keep browser alive for 60 seconds
            'read_timeout' => 30, // 30 second timeout for reading
            'stop_timeout' => 10, // 10 second timeout for stopping
            'logger' => null, // Disable logging unless needed
        ]);
    }

    /**
     * Render a URL with JavaScript and extract the HTML after page load + 5 seconds
     *
     * @param string $url The URL to render
     * @return array ['success' => bool, 'html' => string|null, 'error' => string|null]
     */
    public function renderUrl($url)
    {
        try {
            errlog("Starting Puphpeteer rendering for URL: {$url}");

            // Launch browser if not already running
            if (!$this->browser || !$this->isBrowserConnected()) {
                $this->browser = $this->puppeteer->launch([
                    'headless' => true,
                    'args' => [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process', // Important for some server environments
                        '--disable-extensions',
                        '--disable-background-timer-throttling',
                        '--disable-renderer-backgrounding',
                        '--disable-backgrounding-occluded-windows',
                    ]
                ]);
                errlog("Browser launched for Puphpeteer");
            }

            // Create new page
            $page = $this->browser->newPage();

            // Set a reasonable viewport
            $page->setViewport(['width' => 1920, 'height' => 1080]);

            // Set user agent to avoid bot detection
            $page->setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Set extra headers if needed
            $page->setExtraHTTPHeaders([
                'Accept-Language' => 'en-US,en;q=0.9',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            ]);

            // Navigate to URL and wait for load event
            errlog("Navigating to URL with Puphpeteer");
            $response = $page->goto($url, [
                'waitUntil' => 'load', // Wait for 'load' event
                'timeout' => 30000 // 30 second timeout
            ]);

            // Check if navigation was successful
            $status = $response->status();
            if ($status >= 400) {
                throw new Exception("HTTP error {$status} when loading page");
            }

            errlog("Page loaded, waiting additional 5 seconds for JavaScript to complete");

            // Wait additional 5 seconds after load event for dynamic content
            $page->waitForTimeout(5000);

            // Also try to wait for network to be idle (no more than 2 connections for 500ms)
            try {
                $page->waitForLoadState('networkidle', ['timeout' => 5000]);
                errlog("Network idle state reached");
            } catch (Exception $e) {
                errlog("Network did not reach idle state, continuing anyway");
            }

            // Extract the rendered HTML
            $html = $page->content();

            errlog("Successfully extracted HTML from Puphpeteer (" . strlen($html) . " bytes)");

            // Close the page
            $page->close();

            return [
                'success' => true,
                'html' => $html,
                'error' => null
            ];

        } catch (Exception $e) {
            errlog("Puphpeteer rendering failed: " . $e->getMessage());

            // Try to close page if it exists
            if (isset($page)) {
                try {
                    $page->close();
                } catch (Exception $closeEx) {
                    // Ignore close errors
                }
            }

            return [
                'success' => false,
                'html' => null,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check if browser is still connected
     */
    private function isBrowserConnected()
    {
        try {
            // Try to get browser version as a connectivity check
            $this->browser->version();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Close browser when done
     */
    public function closeBrowser()
    {
        if ($this->browser) {
            try {
                $this->browser->close();
                errlog("Puphpeteer browser closed");
            } catch (Exception $e) {
                errlog("Error closing Puphpeteer browser: " . $e->getMessage());
            }
            $this->browser = null;
        }
    }

    /**
     * Destructor to ensure browser is closed
     */
    public function __destruct()
    {
        $this->closeBrowser();
    }

    /**
     * Sanitize HTML content using Symfony HTML Sanitizer
     *
     * @param string $html The HTML to sanitize
     * @return string The sanitized HTML
     */
    public static function sanitizeHtml($html)
    {
        // Use existing HTML sanitizer configuration from main file
        $sanitizerConfig = (new \Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig())
            ->allowSafeElements()
            ->allowAttribute('href', ['a'])
            ->allowAttribute('src', ['img'])
            ->allowAttribute('alt', ['img'])
            ->allowAttribute('title', ['a', 'img'])
            ->allowAttribute('class', '*')
            ->allowAttribute('id', '*')
            ->allowAttribute('datetime', ['time'])
            ->allowRelativeLinks()
            ->allowRelativeMedias()
            ->forceHttpsUrls();

        $sanitizer = new \Symfony\Component\HtmlSanitizer\HtmlSanitizer($sanitizerConfig);

        return $sanitizer->sanitize($html);
    }
}