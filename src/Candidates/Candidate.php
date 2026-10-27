<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

use Jcherniak\EmailToIcs\Calendar\EventSubject;

/**
 * One generated event (JSON + single-event ICS) inside a CandidateSet.
 */
final class Candidate
{
    /**
     * @param array<string, mixed> $eventData
     */
    public function __construct(
        public readonly int $index,
        public readonly array $eventData,
        public readonly string $ics,
    ) {
    }

    public function summary(): string
    {
        return trim((string)($this->eventData['summary'] ?? ''));
    }

    public function dtstart(): ?string
    {
        return isset($this->eventData['dtstart']) ? (string)$this->eventData['dtstart'] : null;
    }

    public function dtend(): ?string
    {
        return isset($this->eventData['dtend']) ? (string)$this->eventData['dtend'] : null;
    }

    public function location(): string
    {
        return trim((string)($this->eventData['location'] ?? ''));
    }

    public function timezone(): string
    {
        return (string)($this->eventData['timezone'] ?? 'America/Los_Angeles');
    }

    public function isAllDay(): bool
    {
        return !empty($this->eventData['isAllDay']);
    }

    /** Human readable local start, e.g. "Fri, May 29, 2026 7:30 PM". */
    public function when(): string
    {
        return EventSubject::formatWhen($this->eventData, 'D, M j, Y g:i A', 'D, M j, Y') ?? (string)$this->dtstart();
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return ['index' => $this->index, 'eventData' => $this->eventData, 'ics' => $this->ics];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self((int)($data['index'] ?? 0), is_array($data['eventData'] ?? null) ? $data['eventData'] : [], (string)($data['ics'] ?? ''));
    }

    /**
     * Shape returned to the web form, CLI and Chrome extension.
     *
     * @return array<string, mixed>
     */
    public function toClientArray(): array
    {
        return [
            'index' => $this->index,
            'summary' => $this->summary(),
            'dtstart' => $this->dtstart(),
            'dtend' => $this->dtend(),
            'timezone' => $this->timezone(),
            'isAllDay' => $this->isAllDay(),
            'location' => $this->location(),
            'when' => $this->when(),
            'ics' => $this->ics,
        ];
    }
}
