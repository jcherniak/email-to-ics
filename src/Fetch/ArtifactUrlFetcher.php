<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

final class ArtifactUrlFetcher implements UrlFetcherInterface
{
    /**
     * @param array<string, string> $urlToPath
     */
    public function __construct(private readonly array $urlToPath)
    {
    }

    public function fetch(string $url): ?FetchResult
    {
        $path = $this->urlToPath[$url] ?? null;
        if ($path === null || !is_readable($path)) {
            return null;
        }

        $content = file_get_contents($path);
        return $content === false ? null : new FetchResult($url, $content, 'artifact');
    }
}
