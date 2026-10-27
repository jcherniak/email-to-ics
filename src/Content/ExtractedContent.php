<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Content;

final class ExtractedContent
{
    public const METHOD_READABILITY = 'readability';
    public const METHOD_FALLBACK = 'fallback';
    public const METHOD_TEXT = 'text';

    public function __construct(
        public readonly ?string $snippetHtml,
        public readonly string $fullHtml,
        public readonly ?string $title,
        public readonly string $textContent,
        public readonly string $method,
        public readonly ?string $fallbackReason = null,
    ) {
    }

    public function hasSnippet(): bool
    {
        return $this->snippetHtml !== null && trim($this->snippetHtml) !== '';
    }

    public function primaryHtml(): string
    {
        return $this->hasSnippet() ? (string)$this->snippetHtml : $this->fullHtml;
    }

    /**
     * @return array<string, mixed>
     */
    public function toSummary(): array
    {
        return [
            'method' => $this->method,
            'fallbackReason' => $this->fallbackReason,
            'snippetBytes' => $this->snippetHtml === null ? null : strlen($this->snippetHtml),
            'fullBytes' => strlen($this->fullHtml),
            'textLength' => strlen($this->textContent),
            'title' => $this->title,
        ];
    }
}
