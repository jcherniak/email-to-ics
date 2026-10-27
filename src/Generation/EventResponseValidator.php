<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

/**
 * Decides whether a parsed model response counts as a successful generation.
 * Returns null on success, or a short reason string.
 */
final class EventResponseValidator
{
    public function validate(mixed $eventDetails): ?string
    {
        if (!is_array($eventDetails)) {
            return 'no response';
        }

        if (($eventDetails['success'] ?? false) !== true) {
            $message = trim((string)($eventDetails['errorMessage'] ?? ''));
            return $message !== '' ? $message : 'model reported failure';
        }

        $events = self::normalizeEvents($eventDetails['eventData'] ?? null);
        if ($events === []) {
            return 'no events returned';
        }

        foreach ($events as $i => $event) {
            if (!is_array($event)) {
                return "event {$i} is not an object";
            }
            if (trim((string)($event['summary'] ?? '')) === '') {
                return "event {$i} missing summary";
            }
            if (trim((string)($event['dtstart'] ?? '')) === '') {
                return "event {$i} missing dtstart";
            }
        }

        return null;
    }

    /** @return list<mixed> */
    public static function normalizeEvents(mixed $eventData): array
    {
        if (!is_array($eventData) || $eventData === []) {
            return [];
        }

        if (array_is_list($eventData)) {
            return $eventData;
        }

        return [$eventData];
    }

    public static function countEvents(mixed $eventDetails): int
    {
        return is_array($eventDetails) ? count(self::normalizeEvents($eventDetails['eventData'] ?? null)) : 0;
    }
}
