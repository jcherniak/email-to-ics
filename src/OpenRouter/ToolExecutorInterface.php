<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter;

interface ToolExecutorInterface
{
    public function name(): string;

    /** OpenAI-style function tool definition: ['type' => 'function', 'function' => [...]] */
    public function definition(): array;

    /**
     * @param array<string, mixed> $arguments decoded tool-call arguments
     * @return array<string, mixed> JSON-serializable result returned to the model
     */
    public function execute(array $arguments): array;
}
