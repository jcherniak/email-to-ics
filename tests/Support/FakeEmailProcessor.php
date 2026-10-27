<?php

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;

final class FakeEmailProcessor extends EmailProcessor
{
    public array $aiRequests = [];
    public array $sentEmails = [];

    private ?string $fakeAiJson = null;

    /** @var list<string|Response> queued responses, consumed one per AI request */
    private array $aiResponseQueue = [];

    public function setFakeAiJson(string $json): void
    {
        $this->fakeAiJson = $json;
    }

    /**
     * Queue raw JSON strings (model content) or full Guzzle Responses, consumed in order.
     * When the queue is empty the fixed fake JSON (default: Presidio) is returned.
     *
     * @param list<string|Response> $responses
     */
    public function setFakeAiResponses(array $responses): void
    {
        $this->aiResponseQueue = array_values($responses);
    }

    protected function postOpenRouterChatCompletion(array $data): Response
    {
        $this->aiRequests[] = $data;

        if ($this->aiResponseQueue !== []) {
            $next = array_shift($this->aiResponseQueue);
            if ($next instanceof Response) {
                return $next;
            }
            return $this->contentResponse((string)$next);
        }

        return $this->contentResponse($this->fakeAiJson ?? json_encode(PresidioExpected::aiJson(), JSON_UNESCAPED_SLASHES));
    }

    private function contentResponse(string $content): Response
    {
        $body = json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => $content,
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
