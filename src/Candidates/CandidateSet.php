<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

/**
 * Server-side state for one generation result: every candidate event, the source it came from,
 * the email it was (or will be) sent in, and the edit lineage. Keyed by a random 32-hex key that
 * is the only credential for the links in emails and for reply-to-edit.
 */
final class CandidateSet
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';

    /**
     * @param list<Candidate> $candidates
     * @param array<string, mixed> $originalEmail Postmark fields of the triggering email (MessageID, From, Subject, To)
     * @param list<array<string, mixed>> $attachments Postmark attachment arrays to forward with each calendar email
     * @param array<string, mixed> $generation retry/attempt metadata
     * @param list<int> $sentIndexes
     */
    public function __construct(
        public readonly string $key,
        public readonly string $createdAt,
        public readonly string $expiresAt,
        public readonly array $candidates,
        public readonly string $baseSubject,
        public readonly ?string $sourceUrl,
        public readonly string $sourceLabel,
        public readonly ?string $sourceContent,
        public readonly string $htmlBody,
        public readonly ?string $model,
        public readonly ?string $instructions,
        public readonly bool $multiMode,
        public readonly bool $tentative,
        public readonly string $recipientEmail,
        public readonly array $originalEmail = [],
        public readonly array $attachments = [],
        public readonly ?string $inReplyTo = null,
        public readonly string $origin = 'web',
        public readonly ?string $previousKey = null,
        public readonly ?string $rootKey = null,
        public readonly int $editRound = 0,
        public readonly array $generation = [],
        public readonly array $sentIndexes = [],
        public readonly string $status = self::STATUS_PENDING,
    ) {
    }

    public function count(): int
    {
        return count($this->candidates);
    }

    public function candidate(int $index): ?Candidate
    {
        foreach ($this->candidates as $candidate) {
            if ($candidate->index === $index) {
                return $candidate;
            }
        }

        return null;
    }

    /** @return list<int> */
    public function allIndexes(): array
    {
        return array_map(static fn(Candidate $c): int => $c->index, $this->candidates);
    }

    public function isExpired(?int $now = null): bool
    {
        $now ??= time();
        $expires = strtotime($this->expiresAt);

        return $expires !== false && $expires <= $now;
    }

    /** @return list<array<string, mixed>> */
    public function clientCandidates(): array
    {
        return array_map(static fn(Candidate $c): array => $c->toClientArray(), $this->candidates);
    }

    /** @param list<int> $indexes */
    public function withSent(array $indexes): self
    {
        $sent = array_values(array_unique(array_merge($this->sentIndexes, array_map('intval', $indexes))));
        sort($sent);

        return $this->with(['sentIndexes' => $sent, 'status' => self::STATUS_SENT]);
    }

    /** @param array<string, mixed> $changes */
    public function with(array $changes): self
    {
        return self::fromArray(array_merge($this->toArray(), $changes));
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'createdAt' => $this->createdAt,
            'expiresAt' => $this->expiresAt,
            'candidates' => array_map(static fn(Candidate $c): array => $c->toArray(), $this->candidates),
            'baseSubject' => $this->baseSubject,
            'sourceUrl' => $this->sourceUrl,
            'sourceLabel' => $this->sourceLabel,
            'sourceContent' => $this->sourceContent,
            'htmlBody' => $this->htmlBody,
            'model' => $this->model,
            'instructions' => $this->instructions,
            'multiMode' => $this->multiMode,
            'tentative' => $this->tentative,
            'recipientEmail' => $this->recipientEmail,
            'originalEmail' => $this->originalEmail,
            'attachments' => $this->attachments,
            'inReplyTo' => $this->inReplyTo,
            'origin' => $this->origin,
            'previousKey' => $this->previousKey,
            'rootKey' => $this->rootKey,
            'editRound' => $this->editRound,
            'generation' => $this->generation,
            'sentIndexes' => $this->sentIndexes,
            'status' => $this->status,
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $candidates = [];
        foreach (($data['candidates'] ?? []) as $candidate) {
            if ($candidate instanceof Candidate) {
                $candidates[] = $candidate;
            } elseif (is_array($candidate)) {
                $candidates[] = Candidate::fromArray($candidate);
            }
        }

        return new self(
            key: (string)($data['key'] ?? ''),
            createdAt: (string)($data['createdAt'] ?? date('c')),
            expiresAt: (string)($data['expiresAt'] ?? date('c')),
            candidates: $candidates,
            baseSubject: (string)($data['baseSubject'] ?? 'Calendar Event'),
            sourceUrl: isset($data['sourceUrl']) ? (string)$data['sourceUrl'] : null,
            sourceLabel: (string)($data['sourceLabel'] ?? 'input'),
            sourceContent: isset($data['sourceContent']) ? (string)$data['sourceContent'] : null,
            htmlBody: (string)($data['htmlBody'] ?? ''),
            model: isset($data['model']) ? (string)$data['model'] : null,
            instructions: isset($data['instructions']) ? (string)$data['instructions'] : null,
            multiMode: (bool)($data['multiMode'] ?? false),
            tentative: (bool)($data['tentative'] ?? true),
            recipientEmail: (string)($data['recipientEmail'] ?? ''),
            originalEmail: is_array($data['originalEmail'] ?? null) ? $data['originalEmail'] : [],
            attachments: is_array($data['attachments'] ?? null) ? array_values($data['attachments']) : [],
            inReplyTo: isset($data['inReplyTo']) ? (string)$data['inReplyTo'] : null,
            origin: (string)($data['origin'] ?? 'web'),
            previousKey: isset($data['previousKey']) ? (string)$data['previousKey'] : null,
            rootKey: isset($data['rootKey']) ? (string)$data['rootKey'] : null,
            editRound: (int)($data['editRound'] ?? 0),
            generation: is_array($data['generation'] ?? null) ? $data['generation'] : [],
            sentIndexes: array_values(array_map('intval', is_array($data['sentIndexes'] ?? null) ? $data['sentIndexes'] : [])),
            status: (string)($data['status'] ?? self::STATUS_PENDING),
        );
    }
}
