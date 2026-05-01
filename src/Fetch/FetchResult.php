<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

final class FetchResult
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public readonly string $url,
        public readonly string $content,
        public readonly string $method,
        public readonly ?string $screenshotBase64 = null,
        public readonly array $metadata = [],
    ) {
    }
}
