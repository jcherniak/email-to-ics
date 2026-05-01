<?php

declare(strict_types=1);

final class PresidioExpected
{
    public const URL = 'https://www.presidiotheatre.org/show-details/opera-parallele-doubt-at-the-presidio-theatre';

    public static function aiJson(): array
    {
        return [
            'success' => true,
            'errorMessage' => '',
            'eventData' => self::eventData(),
            'emailSubject' => 'Opera Parallele - Doubt',
            'locationLookup' => '',
        ];
    }

    public static function eventData(): array
    {
        return [
            self::event('2026-05-29T19:30:00', '2026-05-29T22:30:00'),
            self::event('2026-05-30T19:30:00', '2026-05-30T22:30:00'),
            self::event('2026-05-31T15:00:00', '2026-05-31T18:00:00'),
        ];
    }

    public static function canonicalizeIcs(string $ics): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($ics));
        $normalized = preg_replace('/^UID:.*$/m', 'UID:<uid>', $normalized);
        $normalized = preg_replace('/^DTSTAMP:.*$/m', 'DTSTAMP:<dtstamp>', $normalized);

        return $normalized . "\n";
    }

    private static function event(string $dtstart, string $dtend): array
    {
        return [
            'summary' => 'Opera Parallele - Doubt',
            'description' => "World premiere immersive opera performance of Doubt at the Presidio Theatre.\n\nSource: " . self::URL,
            'htmlDescription' => '<p>World premiere immersive opera performance of Doubt at the Presidio Theatre.</p><p><a href="' . self::URL . '">Source</a></p>',
            'dtstart' => $dtstart,
            'dtend' => $dtend,
            'timezone' => 'America/Los_Angeles',
            'location' => 'Presidio Theatre, 99 Moraga Ave, San Francisco, CA',
            'url' => self::URL,
            'isAllDay' => false,
        ];
    }
}
