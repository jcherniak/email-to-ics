<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;
use Jcherniak\EmailToIcs\Content\HtmlTitle;

/**
 * Level 2 fetcher: Firecrawl scrape API returning the raw HTML of a rendered page.
 */
final class FirecrawlUrlFetcher implements UrlFetcherInterface
{
    public const ENDPOINT = 'https://api.firecrawl.dev/v2/scrape';

    public function __construct(
        private readonly string $apiKey,
        private readonly ?Client $client = null,
        private readonly int $timeoutSeconds = 60,
        private readonly int $waitForMs = 3000,
    ) {
    }

    public static function fromEnvironment(array $env = null, ?Client $client = null): ?self
    {
        $env ??= $_ENV;
        $apiKey = trim((string)($env['FIRECRAWL_API_KEY'] ?? ''));
        if ($apiKey === '') {
            return null;
        }

        $timeout = (int)($env['FETCH_FIRECRAWL_TIMEOUT'] ?? 60);
        $waitFor = (int)($env['FETCH_FIRECRAWL_WAIT_MS'] ?? 3000);

        return new self($apiKey, $client, $timeout > 0 ? $timeout : 60, max(0, $waitFor));
    }

    public function fetch(string $url): ?FetchResult
    {
        $client = $this->client ?? new Client();
        $response = $client->post(self::ENDPOINT, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'json' => [
                'url' => $url,
                'formats' => ['rawHtml'],
                'onlyMainContent' => false,
                'waitFor' => $this->waitForMs,
                'timeout' => $this->timeoutSeconds * 1000,
            ],
            'timeout' => $this->timeoutSeconds + 10,
            'http_errors' => false,
        ]);

        $status = $response->getStatusCode();
        $body = json_decode($response->getBody()->getContents(), true);
        if (!is_array($body)) {
            throw new \RuntimeException("firecrawl: invalid JSON response (HTTP {$status})");
        }

        if ($status >= 400 || ($body['success'] ?? false) !== true) {
            $error = $body['error'] ?? $body['message'] ?? "HTTP {$status}";
            throw new \RuntimeException('firecrawl: ' . (is_string($error) ? $error : json_encode($error)));
        }

        $data = is_array($body['data'] ?? null) ? $body['data'] : [];
        $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];

        if (!empty($metadata['error'])) {
            throw new \RuntimeException('firecrawl: ' . (string)$metadata['error']);
        }

        $pageStatus = isset($metadata['statusCode']) ? (int)$metadata['statusCode'] : null;
        if ($pageStatus !== null && $pageStatus >= 400) {
            throw new \RuntimeException("firecrawl: target page returned HTTP {$pageStatus}");
        }

        $content = (string)($data['rawHtml'] ?? $data['html'] ?? '');
        if (trim($content) === '') {
            return null;
        }

        $title = isset($metadata['title']) && is_string($metadata['title']) && trim($metadata['title']) !== ''
            ? trim($metadata['title'])
            : HtmlTitle::extract($content);
        $finalUrl = $metadata['url'] ?? $metadata['sourceURL'] ?? $url;

        return new FetchResult(
            $url,
            $content,
            'firecrawl',
            null,
            ['provider' => 'firecrawl'],
            is_string($finalUrl) ? $finalUrl : $url,
            $title,
            $pageStatus,
            'html',
        );
    }
}
