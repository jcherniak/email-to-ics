<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

final class EmailAttachment
{
    public function __construct(
        public readonly string $name,
        public readonly string $contentBase64,
        public readonly string $contentType,
    ) {
    }

    /**
     * @param array{Name?: string, Content?: string, ContentType?: string} $attachment
     */
    public static function fromPostmarkArray(array $attachment): self
    {
        return new self(
            (string)($attachment['Name'] ?? 'attachment'),
            (string)($attachment['Content'] ?? ''),
            (string)($attachment['ContentType'] ?? 'application/octet-stream'),
        );
    }

    /**
     * @return array{Name: string, Content: string, ContentType: string}
     */
    public function toPostmarkArray(): array
    {
        return [
            'Name' => $this->name,
            'Content' => $this->contentBase64,
            'ContentType' => $this->contentType,
        ];
    }
}
