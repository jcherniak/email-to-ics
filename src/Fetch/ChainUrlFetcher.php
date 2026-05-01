<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Exception\RequestException;

final class ChainUrlFetcher implements UrlFetcherInterface
{
    /** @var array<string, UrlFetcherInterface> */
    private array $fetchers;

    /**
     * @param array<string, UrlFetcherInterface> $fetchers
     */
    public function __construct(array $fetchers)
    {
        $this->fetchers = $fetchers;
    }

    public static function fromEnvironment(array $env = null): self
    {
        $env ??= $_ENV;
        $fetchers = ['direct' => new DirectUrlFetcher()];

        $oxylabs = OxylabsProxyUrlFetcher::fromEnvironment($env);
        if ($oxylabs !== null) {
            $fetchers['oxylabs'] = $oxylabs;
        }

        $scrapefly = ScrapeflyUrlFetcher::fromEnvironment($env);
        if ($scrapefly !== null) {
            $fetchers['scrapefly'] = $scrapefly;
        }

        return new self($fetchers);
    }

    public function fetch(string $url): ?FetchResult
    {
        foreach ($this->fetchers as $name => $fetcher) {
            if (function_exists('errlog')) {
                errlog("Attempting to fetch URL using {$name} method: {$url}");
            }

            try {
                $result = $fetcher->fetch($url);
                if ($result !== null && $result->content !== '') {
                    if (function_exists('errlog')) {
                        errlog("Successfully fetched URL using {$name} method");
                    }
                    return $result;
                }
            } catch (\Throwable $e) {
                $statusCode = 0;
                if ($e instanceof RequestException && $e->hasResponse()) {
                    $statusCode = $e->getResponse()->getStatusCode();
                }

                if (function_exists('errlog')) {
                    errlog("Failed to fetch URL using {$name} method. Status: {$statusCode}, Error: " . $e->getMessage());
                }
            }
        }

        if (function_exists('errlog')) {
            errlog("All fetch methods failed for URL: {$url}");
        }

        return null;
    }
}
