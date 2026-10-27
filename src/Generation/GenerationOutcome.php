<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

final class GenerationOutcome
{
    public const STOP_SUCCESS = 'success';
    public const STOP_ALL_FAILED = 'all_failed';
    public const STOP_MAX_ATTEMPTS = 'max_attempts';
    public const STOP_TIME_BUDGET = 'time_budget';
    public const STOP_NO_CONTENT = 'no_content';

    /**
     * @param list<GenerationAttempt> $attempts
     * @param array<string, array<string, mixed>> $fetchSummary
     */
    public function __construct(
        public readonly bool $success,
        public readonly array $eventDetails,
        public readonly ?GenerationAttempt $winning,
        public readonly array $attempts,
        public readonly ?ContentVariant $contentUsed,
        public readonly string $stopReason,
        public readonly array $fetchSummary = [],
    ) {
    }

    public function attemptLog(): string
    {
        $lines = array_map(static fn(GenerationAttempt $a): string => $a->describe(), $this->attempts);
        $lines[] = 'Stop reason: ' . $this->stopReason;
        foreach ($this->fetchSummary as $level => $summary) {
            $status = (string)($summary['status'] ?? 'unknown');
            $error = isset($summary['error']) ? ' - ' . $summary['error'] : '';
            $lines[] = "Fetch level {$level}: {$status}{$error}";
        }

        return implode("\n", $lines);
    }

    /** @return array<string, mixed> */
    public function toMetadata(): array
    {
        return [
            'generationAttempts' => array_map(static fn(GenerationAttempt $a): array => $a->toArray(), $this->attempts),
            'fetchLevels' => $this->fetchSummary,
            'winningAttempt' => $this->winning?->toArray(),
            'contentUsed' => $this->contentUsed?->label(),
            'stopReason' => $this->stopReason,
        ];
    }
}
