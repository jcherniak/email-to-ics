<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

/**
 * URL inputs on the model-driven-fetch branch: nothing is fetched up front. The single
 * "tools" variant carries the URL (plus any email context) and the model fetches the page
 * itself through the fetch tools, so the retry runner degenerates to the model loop.
 */
final class ToolDrivenContentProvider implements ContentVariantProvider
{
    public const LEVEL = 'tools';

    private ?ContentVariant $variant = null;

    /**
     * @param \Closure(string $url): string $frame builds the user text for the model
     */
    public function __construct(
        private readonly string $url,
        private readonly \Closure $frame,
    ) {
    }

    public function url(): string
    {
        return $this->url;
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

        $this->variant ??= new ContentVariant(self::LEVEL, self::LEVEL, ($this->frame)($this->url), '', null);

        return [$this->variant];
    }

    public function lastError(string $level): ?string
    {
        return null;
    }

    public function firstText(): ?string
    {
        return $this->variantsForLevel(self::LEVEL)[0]->text;
    }

    public function fullText(): ?string
    {
        return $this->firstText();
    }

    public function fetchSummary(): array
    {
        return [self::LEVEL => ['status' => 'model_driven', 'url' => $this->url]];
    }
}
