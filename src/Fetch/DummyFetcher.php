<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

final class DummyFetcher implements UrlFetcherInterface
{
    /** @var string[] */
    public array $requestedUrls = [];

    public function __construct(private readonly ?FetchResult $result = null)
    {
    }

    public function fetch(string $url): ?FetchResult
    {
        $this->requestedUrls[] = $url;
        return $this->result;
    }
}
