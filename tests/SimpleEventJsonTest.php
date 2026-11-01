<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Calendar\SimpleEventJson;
use PHPUnit\Framework\TestCase;

final class SimpleEventJsonTest extends TestCase
{
    public function testTimedEventUsesOffsetTimestamps(): void
    {
        $json = SimpleEventJson::fromEventData([
            'summary' => 'SF Symphony - Mahler 5',
            'description' => 'Line one\nLine two',
            'htmlDescription' => '<p>Line one</p>',
            'dtstart' => '2026-11-14T19:30:00',
            'dtend' => '2026-11-14T21:30:00',
            'timezone' => 'America/Los_Angeles',
            'location' => 'Davies Symphony Hall, 201 Van Ness Ave, San Francisco, CA',
            'url' => 'https://example.test/event',
            'isAllDay' => false,
        ]);

        $this->assertSame([
            'name' => 'SF Symphony - Mahler 5',
            'description' => "Line one\nLine two",
            'start' => '2026-11-14T19:30:00-08:00',
            'end' => '2026-11-14T21:30:00-08:00',
            'location' => 'Davies Symphony Hall, 201 Van Ness Ave, San Francisco, CA',
        ], $json);
    }

    public function testAllDayEventUsesDatesAndMissingEndIsNull(): void
    {
        $json = SimpleEventJson::fromEventData([
            'summary' => 'Street Fair',
            'dtstart' => '2026-07-04',
            'dtend' => '',
            'timezone' => 'America/New_York',
            'isAllDay' => true,
        ]);

        $this->assertSame('2026-07-04', $json['start']);
        $this->assertNull($json['end']);
        $this->assertSame('', $json['location']);
    }

    public function testMultiDayModeReturnsList(): void
    {
        $json = SimpleEventJson::fromEventData([
            ['summary' => 'Night 1', 'dtstart' => '2026-03-01T20:00:00', 'timezone' => 'UTC'],
            ['summary' => 'Night 2', 'dtstart' => '2026-03-02T20:00:00', 'timezone' => 'UTC'],
        ]);

        $this->assertCount(2, $json);
        $this->assertSame('Night 2', $json[1]['name']);
        $this->assertSame('2026-03-02T20:00:00+00:00', $json[1]['start']);
    }
}
