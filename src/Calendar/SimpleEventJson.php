<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Calendar;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use Throwable;

/**
 * Flattens AI eventData into a small JSON shape for clients such as iOS Shortcuts.
 * Timed events get ISO 8601 timestamps with UTC offsets; all-day events get dates.
 */
final class SimpleEventJson
{
    /**
     * @param array<mixed> $eventData A single event, or a list of events in multi-day mode
     * @return array<string, mixed>|list<array<string, mixed>>
     */
    public static function fromEventData(array $eventData): array
    {
        if (array_is_list($eventData)) {
            return array_map(self::fromSingleEvent(...), $eventData);
        }

        return self::fromSingleEvent($eventData);
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    private static function fromSingleEvent(array $event): array
    {
        $isAllDay = !empty($event['isAllDay']);

        return [
            'name' => (string)($event['summary'] ?? ''),
            'description' => str_replace('\\n', "\n", (string)($event['description'] ?? '')),
            'start' => self::formatDate($event['dtstart'] ?? null, $event['timezone'] ?? null, $isAllDay),
            'end' => self::formatDate($event['dtend'] ?? null, $event['timezone'] ?? null, $isAllDay),
            'location' => (string)($event['location'] ?? ''),
        ];
    }

    private static function formatDate(mixed $value, mixed $timezone, bool $isAllDay): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            $zone = new DateTimeZone(is_string($timezone) && $timezone !== '' ? $timezone : 'America/Los_Angeles');
            $date = new DateTimeImmutable($value, $zone);
        } catch (Throwable) {
            return $value;
        }

        return $isAllDay ? $date->format('Y-m-d') : $date->format(DateTimeInterface::ATOM);
    }
}
