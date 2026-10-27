<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

interface ContentVariantProvider
{
    /** @return list<string> ordered fetch levels */
    public function levels(): array;

    /**
     * Variants for a level, snippet first. Empty when the level produced no content.
     * Implementations must cache fetches so repeated calls (one per model) do not refetch.
     *
     * @return list<ContentVariant>
     */
    public function variantsForLevel(string $level): array;

    public function lastError(string $level): ?string;

    /** Text of the first variant that exists, fetching if needed; null when nothing is available. */
    public function firstText(): ?string;

    /** Text of the richest (last, i.e. full-page) variant of the first level with content; null when nothing is available. */
    public function fullText(): ?string;

    /** @return array<string, array<string, mixed>> per-level fetch/extraction summary for records */
    public function fetchSummary(): array;
}
