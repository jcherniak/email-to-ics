<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;
use GuzzleHttp\RedirectMiddleware;
use Jcherniak\EmailToIcs\Content\HtmlTitle;

final class DirectUrlFetcher implements UrlFetcherInterface
{
    public function __construct(
        private readonly ?Client $client = null,
        private readonly int $timeoutSeconds = 30,
    ) {
    }

    public static function fromEnvironment(array $env = null, ?Client $client = null): self
    {
        $env ??= $_ENV;
        $timeout = (int)($env['FETCH_DIRECT_TIMEOUT'] ?? 30);

        return new self($client, $timeout > 0 ? $timeout : 30);
    }

    public function fetch(string $url): ?FetchResult
    {
        $client = $this->client ?? new Client();
        $response = $client->get($url, [
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.5',
                'Accept-Encoding' => 'gzip, deflate, br',
                'DNT' => '1',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
            ],
            'timeout' => $this->timeoutSeconds,
            'connect_timeout' => min(10, $this->timeoutSeconds),
            'http_errors' => true,
            'allow_redirects' => ['max' => 10, 'track_redirects' => true],
        ]);

        $content = $response->getBody()->getContents();
        if ($content === '') {
            return null;
        }

        $history = $response->getHeader(RedirectMiddleware::HISTORY_HEADER);
        $finalUrl = $history !== [] ? (string)end($history) : $url;

        return new FetchResult(
            $url,
            $content,
            'direct',
            null,
            [],
            $finalUrl,
            HtmlTitle::extract($content),
            $response->getStatusCode(),
            'html',
        );
    }
}
