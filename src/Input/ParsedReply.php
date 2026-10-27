<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class ParsedReply
{
    public function __construct(
        public readonly ?string $key,
        public readonly string $instructions,
        public readonly ?string $quotedSourceUrl,
        public readonly ?string $modelOverride,
        public readonly bool $multiRequested,
        public readonly string $quotedOriginalText,
    ) {
    }
}
