<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

use GuzzleHttp\Exception\RequestException;

/**
 * Ordered fetch levels: direct -> firecrawl -> tinyfish_fetch -> tinyfish_browser.
 * Levels whose API keys are not configured are omitted.
 */
final class ChainUrlFetcher implements UrlFetcherInterface
{
    public const LEVEL_DIRECT = 'direct';
    public const LEVEL_FIRECRAWL = 'firecrawl';
    public const LEVEL_TINYFISH_FETCH = 'tinyfish_fetch';
    public const LEVEL_TINYFISH_BROWSER = 'tinyfish_browser';

    /** @var array<string, UrlFetcherInterface> */
    private array $fetchers;

    /**
     * @param array<string, UrlFetcherInterface> $fetchers keyed by level name, in priority order
     */
    public function __construct(array $fetchers)
    {
        $this->fetchers = $fetchers;
    }

    public static function fromEnvironment(array $env = null): self
    {
        $env ??= $_ENV;
        $fetchers = [self::LEVEL_DIRECT => DirectUrlFetcher::fromEnvironment($env)];

        $firecrawl = FirecrawlUrlFetcher::fromEnvironment($env);
        if ($firecrawl !== null) {
            $fetchers[self::LEVEL_FIRECRAWL] = $firecrawl;
        }

        $tinyFishFetch = TinyFishFetchUrlFetcher::fromEnvironment($env);
        if ($tinyFishFetch !== null) {
            $fetchers[self::LEVEL_TINYFISH_FETCH] = $tinyFishFetch;
        }

        $tinyFishBrowser = TinyFishBrowserUrlFetcher::fromEnvironment($env);
        if ($tinyFishBrowser !== null) {
            $fetchers[self::LEVEL_TINYFISH_BROWSER] = $tinyFishBrowser;
        }

        return new self($fetchers);
    }

    /**
     * @return list<string>
     */
    public function levelNames(): array
    {
        return array_keys($this->fetchers);
    }

    public function hasLevel(string $name): bool
    {
        return isset($this->fetchers[$name]);
    }

    /**
     * Fetch through one named level. Exceptions from the underlying fetcher propagate
     * so callers can record the failure reason.
     */
    public function fetchLevel(string $name, string $url): ?FetchResult
    {
        if (!isset($this->fetchers[$name])) {
            throw new \InvalidArgumentException("Unknown fetch level: {$name}");
        }

        $this->log("Attempting to fetch URL using {$name} method: {$url}");
        $result = $this->fetchers[$name]->fetch($url);
        if ($result !== null && $result->content !== '') {
            $this->log("Successfully fetched URL using {$name} method (" . strlen($result->content) . ' bytes)');
            return $result;
        }

        $this->log("Fetch level {$name} returned no content for {$url}");
        return null;
    }

    public function fetch(string $url): ?FetchResult
    {
        foreach ($this->levelNames() as $name) {
            try {
                $result = $this->fetchLevel($name, $url);
                if ($result !== null) {
                    return $result;
                }
            } catch (\Throwable $e) {
                $this->log("Failed to fetch URL using {$name} method. " . self::describeFailure($e));
            }
        }

        $this->log("All fetch methods failed for URL: {$url}");

        return null;
    }

    public static function describeFailure(\Throwable $e): string
    {
        $statusCode = 0;
        if ($e instanceof RequestException && $e->hasResponse()) {
            $statusCode = $e->getResponse()->getStatusCode();
        }

        return ($statusCode > 0 ? "Status: {$statusCode}, " : '') . 'Error: ' . $e->getMessage();
    }

    private function log(string $message): void
    {
        if (function_exists('errlog')) {
            errlog($message);
        }
    }
}
