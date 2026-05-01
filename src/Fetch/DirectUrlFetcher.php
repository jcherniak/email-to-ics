<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;

final class DirectUrlFetcher implements UrlFetcherInterface
{
    public function __construct(private readonly ?Client $client = null)
    {
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
            'timeout' => 30,
            'connect_timeout' => 10,
            'http_errors' => true,
        ]);

        $content = $response->getBody()->getContents();
        return $content === '' ? null : new FetchResult($url, $content, 'direct');
    }
}
