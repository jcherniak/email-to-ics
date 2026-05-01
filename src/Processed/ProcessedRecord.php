<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Processed;

final class ProcessedRecord
{
    /**
     * @param array<string, mixed> $data
     * @param array<string, mixed> $latestAttempt
     * @param array<string, mixed>|null $generatedJson
     */
    public function __construct(
        public readonly string $id,
        public readonly string $path,
        public readonly string $rawJson,
        public readonly string $normalizedJson,
        public readonly array $data,
        public readonly array $latestAttempt,
        public readonly ?string $downloadedContent,
        public readonly ?string $emailHtml,
        public readonly ?string $pdfText,
        public readonly ?string $screenshotBase64,
        public readonly ?array $generatedJson,
        public readonly ?string $ics,
    ) {
    }
}
