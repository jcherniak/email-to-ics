<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Client;

final class OxylabsProxyUrlFetcher implements UrlFetcherInterface
{
    public function __construct(
        private readonly string $proxy,
        private readonly string $username,
        private readonly string $password,
        private readonly ?Client $client = null,
    ) {
    }

    public static function fromEnvironment(array $env = null): ?self
    {
        $env ??= $_ENV;
        if (empty($env['OXYLABS_PROXY']) || empty($env['OXYLABS_USERNAME']) || empty($env['OXYLABS_PASSWORD'])) {
            return null;
        }

        return new self($env['OXYLABS_PROXY'], $env['OXYLABS_USERNAME'], $env['OXYLABS_PASSWORD']);
    }

    public function fetch(string $url): ?FetchResult
    {
        $client = $this->client ?? new Client();
        $proxyUrl = 'http://' . $this->username . ':' . $this->password . '@' . $this->proxy;
        $response = $client->get($url, [
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            ],
            'proxy' => [
                'http' => $proxyUrl,
                'https' => $proxyUrl,
            ],
            'timeout' => 30,
            'connect_timeout' => 10,
            'http_errors' => true,
        ]);

        $content = $response->getBody()->getContents();
        return $content === '' ? null : new FetchResult($url, $content, 'oxylabs');
    }
}
