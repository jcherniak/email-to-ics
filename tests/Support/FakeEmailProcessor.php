<?php

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;

final class FakeEmailProcessor extends EmailProcessor
{
    public array $aiRequests = [];
    public array $sentEmails = [];

    private ?string $fakeAiJson = null;

    public function setFakeAiJson(string $json): void
    {
        $this->fakeAiJson = $json;
    }

    protected function postOpenRouterChatCompletion(array $data): Response
    {
        $this->aiRequests[] = $data;

        $body = json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => $this->fakeAiJson ?? json_encode(PresidioExpected::aiJson(), JSON_UNESCAPED_SLASHES),
                    ],
                ],
            ],
        ]);

        return new Response(200, ['Content-Type' => 'application/json'], $body);
    }

    public function sendEmail($ics, $toEmail, $subject, $htmlBody, array $otherAttachments = [], $inReplyTo = null)
    {
        $this->sentEmails[] = [
            'ics' => $ics,
            'toEmail' => $toEmail,
            'subject' => $subject,
            'htmlBody' => $htmlBody,
            'otherAttachments' => $otherAttachments,
            'inReplyTo' => $inReplyTo,
            'attachmentMeta' => [
                'Name' => 'event.ics',
                'ContentType' => 'text/calendar; method=PUBLISH; charset=UTF-8',
            ],
        ];
    }
}
