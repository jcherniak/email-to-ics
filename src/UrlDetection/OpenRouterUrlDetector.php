<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\UrlDetection;

final class OpenRouterUrlDetector implements UrlDetectorInterface
{
    /**
     * @param object $client Object exposing post(string $uri, array $options): object.
     * @param list<string> $models
     * @param null|callable(string): void $logger
     */
    public function __construct(
        private readonly object $client,
        private readonly array $models,
        private readonly mixed $logger = null,
    ) {
    }

    public function detect(string $body): ?string
    {
        $models = array_values(array_unique(array_filter(array_map('trim', $this->models))));
        $bodyLength = strlen($body);

        foreach ($models as $modelIndex => $model) {
            $this->log("Using model {$model} for URL detection");

            $data = [
                'model' => $model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a helpful assistant that detects URLs in email bodies. Respond only with valid JSON.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Analyze this email body text and determine if it contains just a URL (possibly with minimal text like 'Sent from iPhone/iPad' or similar signatures). If so, extract the URL. If not, return null.\n\nEmail body:\n{$body}\n\nRespond with JSON in this format:\n{\"containsUrl\": true/false, \"url\": \"extracted_url_or_null\"}",
                    ],
                ],
                'temperature' => 0.1,
                'max_tokens' => 500,
            ];

            $content = $this->requestDetection($model, $data);
            if ($content === null) {
                continue;
            }

            $result = json_decode($this->stripMarkdownFence($content), true);

            if ($result && isset($result['containsUrl']) && $result['containsUrl'] && !empty($result['url'])) {
                $url = trim((string)$result['url']);
                $this->log("AI found URL with {$model}: {$url}, validating...");
                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    $this->log("AI detected valid URL in email body with {$model}: {$url}");
                    return $url;
                }

                $this->log("AI found URL with {$model} but it failed validation: {$url}");
                continue;
            }

            $this->log("AI did not detect a URL in the email body with {$model}");
            $hasFallbackModel = $modelIndex < count($models) - 1;
            if (!$hasFallbackModel || $bodyLength >= 500) {
                return null;
            }
            $this->log("Trying fallback URL detection model because body is under 500 characters ({$bodyLength})");
        }

        return null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requestDetection(string $model, array $data): ?string
    {
        $this->log('Sending URL detection request to OpenRouter');
        $apiStartTime = microtime(true);

        try {
            $response = $this->client->post('chat/completions', [
                'json' => $data,
                'http_errors' => false,
            ]);

            $apiDuration = microtime(true) - $apiStartTime;
            $statusCode = $response->getStatusCode();
            $responseBody = (string)$response->getBody();

            $this->log('URL detection response received in ' . number_format($apiDuration, 4) . ' seconds');
            $this->log('URL detection response status: ' . $statusCode);
            $this->log('URL detection response body (first 500 chars): ' . substr($responseBody, 0, 500));

            $decoded = json_decode($responseBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->log("Failed to parse OpenRouter JSON response for URL detection with {$model}: " . json_last_error_msg());
                $this->log("Raw response: " . $responseBody);
                return null;
            }

            if ($statusCode >= 400) {
                $errorMsg = "OpenRouter API returned error status {$statusCode} for URL detection with {$model}";
                if (isset($decoded['error'])) {
                    $errorMsg .= ': ' . ($decoded['error']['message'] ?? json_encode($decoded['error']));
                }
                $this->log($errorMsg);
                $this->log('Full error response: ' . json_encode($decoded, JSON_PRETTY_PRINT));
                return null;
            }

            if (!isset($decoded['choices'][0]['message']['content'])) {
                $this->log("OpenRouter response missing expected 'choices' structure for URL detection with {$model}.");
                $this->log('Full response: ' . json_encode($decoded, JSON_PRETTY_PRINT));
                return null;
            }

            $content = trim((string)$decoded['choices'][0]['message']['content']);
            $this->log("AI response for URL detection from {$model}: " . $content);

            return $content;
        } catch (\Throwable $e) {
            $this->log("Exception during URL detection request with {$model}: " . $e->getMessage());
            $this->log('Error class: ' . get_class($e));
            $this->log('Stack trace: ' . $e->getTraceAsString());
            return null;
        }
    }

    private function stripMarkdownFence(string $content): string
    {
        $content = trim($content);
        if (preg_match('/^```(?:json)?\s*\n?(.*?)\n?```$/s', $content, $matches)) {
            return $matches[1];
        }

        return $content;
    }

    private function log(string $message): void
    {
        if (is_callable($this->logger)) {
            ($this->logger)($message);
        }
    }
}
