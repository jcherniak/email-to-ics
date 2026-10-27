<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

use Jcherniak\EmailToIcs\Content\ReadabilityExtractor;

/**
 * Content that was supplied with the request (email HTML, extension-captured page, CLI --html).
 * With an extractor, offers a Readability snippet and the lightened full page; otherwise one variant.
 */
final class StaticContentProvider implements ContentVariantProvider
{
    public const LEVEL = 'provided';

    /** @var list<ContentVariant>|null */
    private ?array $variants = null;
    private ?array $extractionSummary = null;

    /**
     * @param \Closure(string $pageContent, ?string $title): string $frame builds the prompt text from the page content
     */
    public function __construct(
        private readonly string $pageContent,
        private readonly \Closure $frame,
        private readonly ?ReadabilityExtractor $extractor = null,
        private readonly ?string $url = null,
        private readonly string $contentType = 'html',
    ) {
    }

    public function levels(): array
    {
        return [self::LEVEL];
    }

    public function variantsForLevel(string $level): array
    {
        if ($level !== self::LEVEL) {
            return [];
        }

        if ($this->variants !== null) {
            return $this->variants;
        }

        if ($this->extractor === null || trim($this->pageContent) === '') {
            $this->variants = [new ContentVariant(self::LEVEL, ContentVariant::PROVIDED, ($this->frame)($this->pageContent, null), $this->pageContent)];
            return $this->variants;
        }

        $extracted = $this->extractor->extract($this->pageContent, $this->url, $this->contentType);
        $this->extractionSummary = $extracted->toSummary();
        $variants = [];
        if ($extracted->hasSnippet() && $extracted->snippetHtml !== $extracted->fullHtml) {
            $variants[] = new ContentVariant(self::LEVEL, ContentVariant::SNIPPET, ($this->frame)((string)$extracted->snippetHtml, $extracted->title), (string)$extracted->snippetHtml, $extracted->title);
        }
        $variants[] = new ContentVariant(self::LEVEL, ContentVariant::FULL, ($this->frame)($extracted->fullHtml, $extracted->title), $extracted->fullHtml, $extracted->title);

        $this->variants = $variants;
        return $this->variants;
    }

    public function lastError(string $level): ?string
    {
        return null;
    }

    public function firstText(): ?string
    {
        $variants = $this->variantsForLevel(self::LEVEL);
        return $variants[0]->text ?? null;
    }

    public function fullText(): ?string
    {
        $variants = $this->variantsForLevel(self::LEVEL);
        return $variants === [] ? null : $variants[count($variants) - 1]->text;
    }

    public function fetchSummary(): array
    {
        return [self::LEVEL => array_filter([
            'status' => 'provided',
            'bytes' => strlen($this->pageContent),
            'extraction' => $this->extractionSummary,
        ], static fn($v) => $v !== null)];
    }
}
