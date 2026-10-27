<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;

/**
 * Level 4 fetcher: TinyFish Agent API drives a remote (stealth) browser and returns
 * the page title and the complete visible text.
 */
final class TinyFishBrowserUrlFetcher implements UrlFetcherInterface
{
    public const ENDPOINT = 'https://agent.tinyfish.ai/v1/automation/run';
    public const GOAL = 'Load the page, wait for it to fully render (dismiss cookie or consent banners if they block content), and return the page title and the complete visible text content of the page, including all dates, times, prices, and venue details, as plain text in reading order. Do not summarize.';

    public function __construct(
        private readonly string $apiKey,
        private readonly ?Client $client = null,
        private readonly int $maxDurationSeconds = 180,
        private readonly string $browserProfile = 'stealth',
    ) {
    }

    public static function fromEnvironment(array $env = null, ?Client $client = null): ?self
    {
        $env ??= $_ENV;
        $apiKey = trim((string)($env['TINYFISH_API_KEY'] ?? ''));
        if ($apiKey === '') {
            return null;
        }

        $timeout = (int)($env['FETCH_TINYFISH_BROWSER_TIMEOUT'] ?? 180);
        $profile = strtolower(trim((string)($env['FETCH_TINYFISH_BROWSER_PROFILE'] ?? 'stealth')));
        if (!in_array($profile, ['lite', 'stealth'], true)) {
            $profile = 'stealth';
        }

        return new self($apiKey, $client, $timeout > 0 ? $timeout : 180, $profile);
    }

    public function fetch(string $url): ?FetchResult
    {
        $client = $this->client ?? new Client();
        $response = $client->post(self::ENDPOINT, [
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'json' => [
                'url' => $url,
                'goal' => self::GOAL,
                'output_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'title' => ['type' => 'string'],
                        'content' => ['type' => 'string'],
                    ],
                    'required' => ['title', 'content'],
                ],
                'browser_profile' => $this->browserProfile,
                'proxy_config' => ['enabled' => true],
                'agent_config' => ['max_duration_seconds' => $this->maxDurationSeconds],
            ],
            'timeout' => $this->maxDurationSeconds + 30,
            'http_errors' => false,
        ]);

        $status = $response->getStatusCode();
        $body = json_decode($response->getBody()->getContents(), true);
        if (!is_array($body)) {
            throw new \RuntimeException("tinyfish_browser: invalid JSON response (HTTP {$status})");
        }

        if ($status >= 400) {
            $error = $body['error'] ?? $body['message'] ?? $body['detail'] ?? "HTTP {$status}";
            throw new \RuntimeException('tinyfish_browser: ' . (is_string($error) ? $error : json_encode($error)));
        }

        $runStatus = (string)($body['status'] ?? '');
        if ($runStatus !== 'COMPLETED') {
            $error = $body['error'] ?? null;
            $message = is_string($error) ? $error : (is_array($error) ? json_encode($error) : "run status {$runStatus}");
            throw new \RuntimeException('tinyfish_browser: ' . $message);
        }

        $result = $body['result'] ?? null;
        if (is_string($result)) {
            $decoded = json_decode($result, true);
            $result = is_array($decoded) ? $decoded : ['content' => $result];
        }
        if (!is_array($result)) {
            return null;
        }

        $content = $result['content'] ?? '';
        if (!is_string($content) || trim($content) === '') {
            return null;
        }

        $title = isset($result['title']) && is_string($result['title']) && trim($result['title']) !== ''
            ? trim($result['title'])
            : null;

        return new FetchResult(
            $url,
            $content,
            'tinyfish_browser',
            null,
            [
                'provider' => 'tinyfish',
                'run_id' => $body['run_id'] ?? null,
                'num_of_steps' => $body['num_of_steps'] ?? null,
                'browser_profile' => $this->browserProfile,
            ],
            $url,
            $title,
            null,
            'text',
        );
    }
}
