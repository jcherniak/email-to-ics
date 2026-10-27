<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

final class GenerationAttempt
{
    public function __construct(
        public readonly int $index,
        public readonly string $model,
        public readonly string $level,
        public readonly string $variant,
        public readonly bool $success,
        public readonly ?string $error,
        public readonly int $durationMs,
        public readonly int $eventCount,
        public readonly string $startedAt,
        public readonly bool $counted = true,
    ) {
    }

    public function label(): string
    {
        return "{$this->level}/{$this->variant}";
    }

    public function describe(): string
    {
        $status = $this->success ? 'OK' : 'FAILED';
        $seconds = number_format($this->durationMs / 1000, 1);
        $tail = $this->success ? " ({$this->eventCount} event(s))" : ': ' . ($this->error ?? 'unknown error');

        return "#{$this->index} {$this->model} | {$this->label()} | {$status} ({$seconds}s){$tail}";
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'index' => $this->index,
            'model' => $this->model,
            'level' => $this->level,
            'variant' => $this->variant,
            'success' => $this->success,
            'error' => $this->error,
            'durationMs' => $this->durationMs,
            'eventCount' => $this->eventCount,
            'startedAt' => $this->startedAt,
        ];
    }
}
