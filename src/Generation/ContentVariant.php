<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

use Jcherniak\EmailToIcs\Fetch\FetchResult;

/**
 * One concrete piece of model input: a fetch level plus a tier (snippet or full page),
 * already framed into the prompt text the model receives.
 */
final class ContentVariant
{
    public const SNIPPET = 'snippet';
    public const FULL = 'full';
    public const PROVIDED = 'provided';
    public const NONE = 'none';

    public function __construct(
        public readonly string $level,
        public readonly string $variant,
        public readonly string $text,
        public readonly string $pageContent,
        public readonly ?string $title = null,
        public readonly ?FetchResult $fetch = null,
    ) {
    }

    public function label(): string
    {
        return "{$this->level}/{$this->variant}";
    }
}
