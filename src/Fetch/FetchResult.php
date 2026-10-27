<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Fetch;

final class FetchResult
{
    /**
     * @param array<string, mixed> $metadata
     * @param string $contentType 'html' for markup, 'text' for plain text (e.g. rendered browser text)
     */
    public function __construct(
        public readonly string $url,
        public readonly string $content,
        public readonly string $method,
        public readonly ?string $screenshotBase64 = null,
        public readonly array $metadata = [],
        public readonly ?string $finalUrl = null,
        public readonly ?string $title = null,
        public readonly ?int $statusCode = null,
        public readonly string $contentType = 'html',
    ) {
    }

    public function isHtml(): bool
    {
        return $this->contentType === 'html';
    }

    /**
     * @return array<string, mixed>
     */
    public function toSummary(): array
    {
        return [
            'method' => $this->method,
            'url' => $this->url,
            'finalUrl' => $this->finalUrl,
            'title' => $this->title,
            'statusCode' => $this->statusCode,
            'contentType' => $this->contentType,
            'bytes' => strlen($this->content),
            'hasScreenshot' => $this->screenshotBase64 !== null,
        ];
    }
}
