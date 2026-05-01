<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter;

use GuzzleHttp\Client;

final class OpenRouterChatClient
{
    public function __construct(
        private readonly object $client,
    ) {
    }

    public static function fromApiKey(string $apiKey): self
    {
        return new self(new Client([
            'base_uri' => 'https://openrouter.ai/api/v1/',
            'headers' => [
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'X-Title' => $_ENV['APP_TITLE'] ?? 'Email-to-ICS',
            ],
            'timeout' => 120,
        ]));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function postChatCompletion(array $data): object
    {
        return $this->client->post('chat/completions', [
            'json' => $data,
            'http_errors' => false,
        ]);
    }
}
