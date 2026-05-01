<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

final class EmailMessage
{
    /**
     * @param EmailAttachment[] $attachments
     * @param array<int, array{Name: string, Value: string}> $headers
     */
    public function __construct(
        public readonly string $from,
        public readonly string $to,
        public readonly string $subject,
        public readonly string $htmlBody,
        public readonly array $attachments = [],
        public readonly array $headers = [],
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toPostmarkPayload(): array
    {
        $payload = [
            'From' => $this->from,
            'To' => $this->to,
            'Subject' => $this->subject,
            'HTMLBody' => $this->htmlBody,
        ];

        if ($this->attachments !== []) {
            $payload['Attachments'] = array_map(
                static fn(EmailAttachment $attachment): array => $attachment->toPostmarkArray(),
                $this->attachments,
            );
        }

        if ($this->headers !== []) {
            $payload['Headers'] = $this->headers;
        }

        return $payload;
    }
}
