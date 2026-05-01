<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

interface UrlFetcherInterface
{
    public function fetch(string $url): ?FetchResult;
}
