<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;

final class ScrapeflyUrlFetcher implements UrlFetcherInterface
{
    public function __construct(private readonly string $apiKey, private readonly ?Client $client = null)
    {
    }

    public static function fromEnvironment(array $env = null): ?self
    {
        $env ??= $_ENV;
        return empty($env['SCRAPEFLY_API_KEY']) ? null : new self($env['SCRAPEFLY_API_KEY']);
    }

    public function fetch(string $url): ?FetchResult
    {
        $scrapeflyUrl = 'https://api.scrapfly.io/scrape?' . http_build_query([
            'key' => $this->apiKey,
            'url' => $url,
            'format' => 'clean_html',
            'render_js' => 'true',
            'rendering_wait' => 5000,
            'screenshots[main]' => 'fullpage',
            'screenshot_flags' => 'load_images',
            'tags' => 'player,project:email-to-ics',
        ]);

        $client = $this->client ?? new Client();
        $response = $client->get($scrapeflyUrl, [
            'timeout' => 60,
            'http_errors' => true,
        ]);

        $decoded = json_decode($response->getBody()->getContents(), true);
        if (!is_array($decoded)) {
            return null;
        }

        $content = (string)($decoded['result']['content'] ?? '');
        if ($content === '') {
            return null;
        }

        return new FetchResult(
            $url,
            $content,
            'scrapefly',
            $this->extractScreenshot($decoded['result']['screenshots']['main'] ?? null),
            ['captcha_detected' => $decoded['result']['captcha_detected'] ?? false],
        );
    }

    private function extractScreenshot(mixed $screenshotData): ?string
    {
        if (is_array($screenshotData) && isset($screenshotData['data'])) {
            return (string)$screenshotData['data'];
        }

        if (is_array($screenshotData) && isset($screenshotData['url'])) {
            try {
                $separator = str_contains((string)$screenshotData['url'], '?') ? '&' : '?';
                $response = ($this->client ?? new Client())->get((string)$screenshotData['url'] . $separator . 'key=' . urlencode($this->apiKey), [
                    'timeout' => 30,
                ]);

                return base64_encode($response->getBody()->getContents());
            } catch (\Throwable $e) {
                if (function_exists('errlog')) {
                    errlog('Failed to download Scrapefly screenshot: ' . $e->getMessage());
                }
                return null;
            }
        }

        return is_string($screenshotData) && $screenshotData !== '' ? $screenshotData : null;
    }
}
