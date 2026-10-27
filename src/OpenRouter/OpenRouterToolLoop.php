<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter;

use Psr\Http\Message\ResponseInterface;

/**
 * Runs an OpenAI-style tool-calling loop against OpenRouter: posts the request, executes
 * every tool call the model asks for (one at a time), appends the results, and repeats until
 * the model answers without tool calls or a cap is hit.
 */
final class OpenRouterToolLoop
{
    /** @var \Closure(array): ResponseInterface */
    private \Closure $post;

    /**
     * @param \Closure(array): ResponseInterface $post sends one chat-completion request
     */
    public function __construct(
        \Closure $post,
        private readonly ToolRegistry $registry,
        private readonly int $maxToolCalls = 8,
        private readonly int $maxCallsPerTool = 3,
        private readonly mixed $logger = null,
    ) {
        $this->post = $post;
    }

    /**
     * @param array<string, mixed> $request complete request (model, messages, response_format, ...); tools are added here
     * @param list<array<string, mixed>> $trace optional trace to continue (re-prompt turns)
     */
    public function run(array $request, array $trace = [], int $toolCalls = 0): ToolLoopResult
    {
        $messages = $request['messages'] ?? [];
        $request['tools'] = $this->registry->definitions();
        $request['parallel_tool_calls'] = false;
        $requests = 0;
        $perTool = [];
        foreach ($trace as $entry) {
            $perTool[$entry['tool'] ?? ''] = ($perTool[$entry['tool'] ?? ''] ?? 0) + 1;
        }
        $lastResponse = null;
        $httpStatus = null;

        while (true) {
            $request['messages'] = $messages;
            $request['tool_choice'] = $toolCalls >= $this->maxToolCalls ? 'none' : 'auto';
            $requests++;

            try {
                $response = ($this->post)($request);
            } catch (\Throwable $e) {
                return new ToolLoopResult(null, null, $messages, $trace, $toolCalls, null, null, 'HTTP request failed: ' . $e->getMessage(), $requests);
            }

            $httpStatus = $response->getStatusCode();
            $body = (string)$response->getBody();
            $decoded = json_decode($body, true);
            $lastResponse = is_array($decoded) ? $decoded : null;
            if ($lastResponse === null) {
                return new ToolLoopResult(null, null, $messages, $trace, $toolCalls, null, $httpStatus, 'Invalid JSON from API (HTTP ' . $httpStatus . '): ' . substr($body, 0, 300), $requests);
            }
            if ($httpStatus >= 400) {
                $error = $lastResponse['error']['message'] ?? json_encode($lastResponse['error'] ?? $lastResponse);
                return new ToolLoopResult(null, null, $messages, $trace, $toolCalls, $lastResponse, $httpStatus, "OpenRouter API returned error status {$httpStatus}: {$error}", $requests);
            }

            $choice = $lastResponse['choices'][0] ?? null;
            $message = is_array($choice) ? ($choice['message'] ?? null) : null;
            if (!is_array($message)) {
                $error = isset($lastResponse['error']) ? 'OpenRouter API error: ' . ($lastResponse['error']['message'] ?? json_encode($lastResponse['error'])) : "Malformed API response (missing 'choices' field)";
                return new ToolLoopResult(null, null, $messages, $trace, $toolCalls, $lastResponse, $httpStatus, $error, $requests);
            }

            $toolCallsRequested = is_array($message['tool_calls'] ?? null) ? $message['tool_calls'] : [];
            $finishReason = $choice['finish_reason'] ?? null;

            if ($toolCallsRequested === []) {
                $content = $message['content'] ?? null;
                if (is_array($content)) {
                    $content = implode('', array_map(static fn($part) => is_array($part) ? (string)($part['text'] ?? '') : (string)$part, $content));
                }
                $messages[] = ['role' => 'assistant', 'content' => is_string($content) ? $content : ''];

                return new ToolLoopResult(is_string($content) ? $content : null, $finishReason, $messages, $trace, $toolCalls, $lastResponse, $httpStatus, null, $requests);
            }

            // Keep the assistant turn exactly as returned so tool_call ids line up.
            $assistantTurn = ['role' => 'assistant', 'content' => $message['content'] ?? null, 'tool_calls' => $toolCallsRequested];
            $messages[] = $assistantTurn;

            foreach ($toolCallsRequested as $call) {
                $id = (string)($call['id'] ?? '');
                $name = (string)($call['function']['name'] ?? '');
                $rawArgs = $call['function']['arguments'] ?? '{}';
                $arguments = is_array($rawArgs) ? $rawArgs : (json_decode((string)$rawArgs, true) ?: []);
                $started = microtime(true);

                if ($toolCalls >= $this->maxToolCalls) {
                    $result = ['status' => 'error', 'tool' => $name, 'error' => "tool call limit of {$this->maxToolCalls} reached; answer with what you have"];
                } elseif (($perTool[$name] ?? 0) >= $this->maxCallsPerTool) {
                    $result = ['status' => 'error', 'tool' => $name, 'error' => "{$name} may only be called {$this->maxCallsPerTool} times; use the next fetch level or answer with what you have"];
                } else {
                    $toolCalls++;
                    $perTool[$name] = ($perTool[$name] ?? 0) + 1;
                    $this->log("Tool call #{$toolCalls}: {$name}(" . json_encode($arguments, JSON_UNESCAPED_SLASHES) . ')');
                    $result = $this->registry->execute($name, is_array($arguments) ? $arguments : []);
                }

                $trace[] = [
                    'seq' => count($trace) + 1,
                    'tool' => $name,
                    'arguments' => $arguments,
                    'status' => $result['status'] ?? 'error',
                    'error' => $result['error'] ?? null,
                    'durationMs' => (int)round((microtime(true) - $started) * 1000),
                    'contentChars' => isset($result['content']) && is_string($result['content']) ? strlen($result['content']) : 0,
                    'finalUrl' => $result['final_url'] ?? null,
                    'title' => $result['title'] ?? null,
                ];
                $this->log("Tool result: {$name} -> " . ($result['status'] ?? 'error') . (isset($result['error']) && $result['error'] ? ' (' . $result['error'] . ')' : '') . ', ' . ($trace[count($trace) - 1]['contentChars']) . ' chars');

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $id,
                    'name' => $name,
                    'content' => json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                ];
            }
        }
    }

    private function log(string $message): void
    {
        if (is_callable($this->logger)) {
            ($this->logger)($message);
        } elseif (function_exists('errlog')) {
            errlog($message);
        }
    }
}
