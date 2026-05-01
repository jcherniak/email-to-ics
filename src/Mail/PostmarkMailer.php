<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

use GuzzleHttp\Client;

final class PostmarkMailer implements MailerInterface
{
    private Client $client;

    public function __construct(string $apiKey, ?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'base_uri' => 'https://api.postmarkapp.com',
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-Postmark-Server-Token' => $apiKey,
            ],
        ]);
    }

    public function send(EmailMessage $message): void
    {
        $response = $this->client->post('/email', [
            'json' => $message->toPostmarkPayload(),
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new \RuntimeException('Failed to send email via Postmark');
        }

        if (function_exists('errlog')) {
            errlog("Postmark response:\n" . $response->getBody()->getContents());
        }
    }
}
