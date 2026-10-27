<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

use Jcherniak\EmailToIcs\Content\ExtractedContent;
use Jcherniak\EmailToIcs\Content\ReadabilityExtractor;
use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface;

/**
 * Lazily fetches a URL level by level (direct, firecrawl, ...), runs Readability once per level,
 * and caches everything so every model sees the same content without refetching.
 *
 * Variant rule: the first level that yields content offers snippet then full; later levels offer
 * the full page only (escalation past level 1 is about blocked/incomplete fetches, where the whole
 * document is the point). Set $snippetOnEveryLevel to offer both tiers everywhere.
 */
final class UrlLevelContentProvider implements ContentVariantProvider
{
    public const FALLBACK_LEVEL = 'fetch';

    /** @var array<string, array{result: ?FetchResult, error: ?string, extracted: ?ExtractedContent, variants: list<ContentVariant>}> */
    private array $cache = [];
    private ?string $firstContentLevel = null;

    /**
     * @param \Closure(string $pageContent, ?string $title): string $frame builds the prompt text from the page content
     */
    public function __construct(
        private readonly UrlFetcherInterface $fetcher,
        private readonly ReadabilityExtractor $extractor,
        private readonly string $url,
        private readonly \Closure $frame,
        private readonly bool $snippetOnEveryLevel = false,
    ) {
    }

    public function url(): string
    {
        return $this->url;
    }

    public function levels(): array
    {
        if ($this->fetcher instanceof ChainUrlFetcher) {
            return $this->fetcher->levelNames();
        }

        return [self::FALLBACK_LEVEL];
    }

    public function variantsForLevel(string $level): array
    {
        return $this->entry($level)['variants'];
    }

    public function lastError(string $level): ?string
    {
        return $this->entry($level)['error'];
    }

    public function firstText(): ?string
    {
        foreach ($this->levels() as $level) {
            $variants = $this->variantsForLevel($level);
            if ($variants !== []) {
                return $variants[0]->text;
            }
        }

        return null;
    }

    public function fullText(): ?string
    {
        foreach ($this->levels() as $level) {
            $variants = $this->variantsForLevel($level);
            if ($variants !== []) {
                return $variants[count($variants) - 1]->text;
            }
        }

        return null;
    }

    public function hasAnyContent(): bool
    {
        return $this->firstText() !== null;
    }

    public function fetchResult(string $level): ?FetchResult
    {
        return $this->cache[$level]['result'] ?? null;
    }

    public function fetchSummary(): array
    {
        $summary = [];
        foreach ($this->levels() as $level) {
            if (!isset($this->cache[$level])) {
                $summary[$level] = ['status' => 'not_attempted'];
                continue;
            }

            $entry = $this->cache[$level];
            $summary[$level] = array_filter([
                'status' => $entry['result'] !== null ? 'fetched' : ($entry['error'] !== null ? 'failed' : 'empty'),
                'error' => $entry['error'],
                'fetch' => $entry['result']?->toSummary(),
                'extraction' => $entry['extracted']?->toSummary(),
                'variants' => array_map(static fn(ContentVariant $v): string => $v->variant, $entry['variants']),
            ], static fn($v) => $v !== null);
        }

        return $summary;
    }

    /**
     * @return array{result: ?FetchResult, error: ?string, extracted: ?ExtractedContent, variants: list<ContentVariant>}
     */
    private function entry(string $level): array
    {
        if (isset($this->cache[$level])) {
            return $this->cache[$level];
        }

        if (!in_array($level, $this->levels(), true)) {
            return $this->cache[$level] = ['result' => null, 'error' => "unknown level {$level}", 'extracted' => null, 'variants' => []];
        }

        $result = null;
        $error = null;
        try {
            $result = $this->fetcher instanceof ChainUrlFetcher
                ? $this->fetcher->fetchLevel($level, $this->url)
                : $this->fetcher->fetch($this->url);
            if ($result === null || $result->content === '') {
                $result = null;
                $error = 'no content returned';
            }
        } catch (\Throwable $e) {
            $error = ChainUrlFetcher::describeFailure($e);
            $this->log("Fetch level {$level} failed for {$this->url}: {$error}");
        }

        $extracted = null;
        $variants = [];
        if ($result !== null) {
            $extracted = $this->extractor->extract($result->content, $this->url, $result->contentType);
            $this->log("Content extraction ({$level}): " . json_encode($extracted->toSummary()));

            $offerSnippet = $this->snippetOnEveryLevel || $this->firstContentLevel === null;
            $this->firstContentLevel ??= $level;

            if ($offerSnippet && $extracted->hasSnippet() && $extracted->snippetHtml !== $extracted->fullHtml) {
                $variants[] = new ContentVariant($level, ContentVariant::SNIPPET, ($this->frame)((string)$extracted->snippetHtml, $extracted->title), (string)$extracted->snippetHtml, $extracted->title, $result);
            }
            $variants[] = new ContentVariant($level, ContentVariant::FULL, ($this->frame)($extracted->fullHtml, $extracted->title), $extracted->fullHtml, $extracted->title, $result);
        }

        return $this->cache[$level] = ['result' => $result, 'error' => $error, 'extracted' => $extracted, 'variants' => $variants];
    }

    private function log(string $message): void
    {
        if (function_exists('errlog')) {
            errlog($message);
        }
    }
}
