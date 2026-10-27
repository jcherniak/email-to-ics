<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter;

final class ToolLoopResult
{
    /**
     * @param list<array<string, mixed>> $messages full transcript (system/user/assistant/tool)
     * @param list<array<string, mixed>> $trace one entry per tool call
     * @param array<string, mixed>|null $lastResponse decoded last HTTP response body
     */
    public function __construct(
        public readonly ?string $finalContent,
        public readonly ?string $finishReason,
        public readonly array $messages,
        public readonly array $trace,
        public readonly int $toolCalls,
        public readonly ?array $lastResponse,
        public readonly ?int $httpStatus,
        public readonly ?string $error,
        public readonly int $requests,
    ) {
    }

    public function lastSuccessfulTool(): ?array
    {
        for ($i = count($this->trace) - 1; $i >= 0; $i--) {
            if (($this->trace[$i]['status'] ?? null) === 'ok') {
                return $this->trace[$i];
            }
        }

        return null;
    }

    public function lastToolName(): ?string
    {
        $last = $this->trace[count($this->trace) - 1] ?? null;

        return $last['tool'] ?? null;
    }

    /** @return array<string, mixed> */
    public function toolMetadata(): array
    {
        return [
            'toolCalls' => $this->toolCalls,
            'requests' => $this->requests,
            'finishReason' => $this->finishReason,
            'error' => $this->error,
            'toolTrace' => $this->trace,
        ];
    }
}
