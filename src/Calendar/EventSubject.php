<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Calendar;

final class EventSubject
{
    /**
     * Suffixes the subject with the event's local date (and time unless all-day) when several events are sent.
     *
     * @param array<string, mixed> $eventData
     */
    public static function withDate(string $subject, array $eventData, int $eventCount): string
    {
        if ($eventCount <= 1 || empty($eventData['dtstart'])) {
            return $subject;
        }

        $dateText = self::formatWhen($eventData);
        if ($dateText === null) {
            return $subject;
        }

        return str_contains($subject, $dateText) ? $subject : "{$subject} - {$dateText}";
    }

    /**
     * "May 29, 2026 7:30 PM" or "May 29, 2026" for all-day events; null when the date cannot be parsed.
     *
     * @param array<string, mixed> $eventData
     */
    public static function formatWhen(array $eventData, string $format = 'M j, Y g:i A', string $allDayFormat = 'M j, Y'): ?string
    {
        if (empty($eventData['dtstart'])) {
            return null;
        }

        try {
            $timezone = new \DateTimeZone((string)($eventData['timezone'] ?? 'America/Los_Angeles'));
        } catch (\Throwable) {
            $timezone = new \DateTimeZone('America/Los_Angeles');
        }

        try {
            $date = new \DateTimeImmutable((string)$eventData['dtstart'], $timezone);
        } catch (\Throwable) {
            return null;
        }

        return !empty($eventData['isAllDay']) ? $date->format($allDayFormat) : $date->format($format);
    }
}
