<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;
use Jcherniak\EmailToIcs\Content\HtmlTitle;

/**
 * Level 3 fetcher: TinyFish Fetch API (full browser rendering, returns cleaned HTML).
 */
final class TinyFishFetchUrlFetcher implements UrlFetcherInterface
{
    public const ENDPOINT = 'https://api.fetch.tinyfish.ai';
    public const MAX_PER_URL_TIMEOUT_MS = 110000;

    public function __construct(
        private readonly string $apiKey,
        private readonly ?Client $client = null,
        private readonly int $timeoutSeconds = 90,
    ) {
    }

    public static function fromEnvironment(array $env = null, ?Client $client = null): ?self
    {
        $env ??= $_ENV;
        $apiKey = trim((string)($env['TINYFISH_API_KEY'] ?? ''));
        if ($apiKey === '') {
            return null;
        }

        $timeout = (int)($env['FETCH_TINYFISH_FETCH_TIMEOUT'] ?? 90);

        return new self($apiKey, $client, $timeout > 0 ? $timeout : 90);
    }

    public function fetch(string $url): ?FetchResult
    {
        $client = $this->client ?? new Client();
        $perUrlTimeout = min($this->timeoutSeconds * 1000, self::MAX_PER_URL_TIMEOUT_MS);
        $response = $client->post(self::ENDPOINT, [
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'json' => [
                'urls' => [$url],
                'format' => 'html',
                'per_url_timeout_ms' => $perUrlTimeout,
                'ttl' => 0,
                'purpose' => 'Extract calendar event details (dates, times, venue) from this page',
            ],
            'timeout' => $this->timeoutSeconds + 15,
            'http_errors' => false,
        ]);

        $status = $response->getStatusCode();
        $body = json_decode($response->getBody()->getContents(), true);
        if (!is_array($body)) {
            throw new \RuntimeException("tinyfish_fetch: invalid JSON response (HTTP {$status})");
        }

        if ($status >= 400) {
            $error = $body['error'] ?? $body['message'] ?? $body['detail'] ?? "HTTP {$status}";
            throw new \RuntimeException('tinyfish_fetch: ' . (is_string($error) ? $error : json_encode($error)));
        }

        $results = is_array($body['results'] ?? null) ? $body['results'] : [];
        $errors = is_array($body['errors'] ?? null) ? $body['errors'] : [];
        if ($results === []) {
            $first = $errors[0] ?? null;
            $message = is_array($first)
                ? trim((string)($first['code'] ?? '') . ': ' . (string)($first['message'] ?? $first['error'] ?? 'unknown error'), ': ')
                : 'no results returned';
            throw new \RuntimeException('tinyfish_fetch: ' . $message);
        }

        $result = is_array($results[0]) ? $results[0] : [];
        $content = $result['text'] ?? '';
        if (!is_string($content) || trim($content) === '') {
            return null;
        }

        $title = isset($result['title']) && is_string($result['title']) && trim($result['title']) !== ''
            ? trim($result['title'])
            : HtmlTitle::extract($content);
        $finalUrl = isset($result['final_url']) && is_string($result['final_url']) ? $result['final_url'] : $url;

        return new FetchResult(
            $url,
            $content,
            'tinyfish_fetch',
            null,
            ['provider' => 'tinyfish', 'format' => (string)($result['format'] ?? 'html')],
            $finalUrl,
            $title,
            null,
            'html',
        );
    }
}
