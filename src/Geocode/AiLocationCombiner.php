<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

use Jcherniak\EmailToIcs\OpenRouter\OpenRouterChatClient;

final class AiLocationCombiner implements LocationCombinerInterface
{
    /**
     * @param null|callable(string): void $logger
     */
    public function __construct(
        private readonly OpenRouterChatClient $client,
        private readonly string $model,
        private readonly mixed $logger = null,
    ) {
    }

    public function combine(string $original, string $geocoded, string $defaultCountry): ?string
    {
        $original = trim($original);
        $geocoded = trim($geocoded);
        $defaultCountry = strtoupper(trim($defaultCountry) ?: 'US');

        if ($original === '' || $geocoded === '' || trim($this->model) === '') {
            return null;
        }

        $payload = [
            'original' => $original,
            'geocoded' => $geocoded,
        ];

        $data = [
            'model' => $this->model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You combine event location strings. Respond only with valid JSON.',
                ],
                [
                    'role' => 'user',
                    'content' => "Default country: {$defaultCountry}\n\n"
                        . "Given this JSON:\n"
                        . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
                        . "\n\nReturn JSON exactly like {\"location\":\"<place name>, <full formatted address without the default country>\"}.\n"
                        . "Keep a real place, venue, room, or building name from original when geocoded only contains an address. "
                        . "Use the formatted address from geocoded when it is better. Do not invent a place name. "
                        . "Remove the default country only when it appears as a trailing country in the final address.",
                ],
            ],
            'temperature' => 0,
            'max_tokens' => 200,
        ];

        try {
            $this->log("Combining geocoded location with {$this->model}: original='{$original}', geocoded='{$geocoded}', default_country='{$defaultCountry}'");
            $response = $this->client->postChatCompletion($data);
            $statusCode = $response->getStatusCode();
            $body = (string)$response->getBody();
            $this->log('Geocode combine response status: ' . $statusCode);
            $this->log('Geocode combine response body (first 500 non-leading-whitespace chars): ' . substr(ltrim($body), 0, 500));

            if ($statusCode >= 400) {
                return null;
            }

            $decoded = json_decode($body, true);
            if (json_last_error() !== JSON_ERROR_NONE || !isset($decoded['choices'][0]['message']['content'])) {
                return null;
            }

            $content = $this->stripMarkdownFence((string)$decoded['choices'][0]['message']['content']);
            $result = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($result)) {
                return null;
            }

            $location = trim((string)($result['location'] ?? ''));
            return $location !== '' ? $location : null;
        } catch (\Throwable $e) {
            $this->log('Geocode combine failed: ' . $e->getMessage());
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
