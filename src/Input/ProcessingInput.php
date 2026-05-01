<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class ProcessingInput
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public readonly string $url = '',
        public readonly string $downloadedText = '',
        public readonly string $display = 'display',
        public readonly bool $tentative = true,
        public readonly ?string $instructions = null,
        public readonly ?string $screenshotViewport = null,
        public readonly ?string $screenshotZoomed = null,
        public readonly ?string $requestedModel = null,
        public readonly bool $needsReview = false,
        public readonly bool $fromExtension = false,
        public readonly bool $outputJsonOnly = false,
        public readonly bool $cliDebug = false,
        public readonly bool $allowMultiDay = false,
        public readonly array $metadata = [],
    ) {
    }
}
