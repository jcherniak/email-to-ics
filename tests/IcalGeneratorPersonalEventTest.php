<?php

declare(strict_types=1);

use App\IcalGenerator;
use PHPUnit\Framework\TestCase;

final class IcalGeneratorPersonalEventTest extends TestCase
{
    private string $ics;

    protected function setUp(): void
    {
        $eventData = PresidioExpected::eventData()[0];
        $generator = new IcalGenerator();
        $this->ics = $generator->convertJsonToIcs($eventData, 'test@example.com');
    }

    public function testIcsContainsBeginVcalendar(): void
    {
        $this->assertStringContainsString('BEGIN:VCALENDAR', $this->ics);
    }

    public function testIcsContainsMethodPublish(): void
    {
        $this->assertStringContainsString('METHOD:PUBLISH', $this->ics);
    }

    public function testIcsContainsBeginVevent(): void
    {
        $this->assertStringContainsString('BEGIN:VEVENT', $this->ics);
    }

    public function testIcsContainsSummary(): void
    {
        $this->assertStringContainsString('SUMMARY:Opera Parallele - Doubt', $this->ics);
    }

    public function testIcsDoesNotContainMethodRequest(): void
    {
        $this->assertStringNotContainsString('METHOD:REQUEST', $this->ics);
    }

    public function testIcsDoesNotContainOrganizer(): void
    {
        $this->assertStringNotContainsString('ORGANIZER', $this->ics);
    }

    public function testIcsDoesNotContainAttendee(): void
    {
        $this->assertStringNotContainsString('ATTENDEE', $this->ics);
    }

    public function testIcsDoesNotContainRsvpTrue(): void
    {
        $this->assertStringNotContainsString('RSVP=TRUE', $this->ics);
    }

    public function testIcsDoesNotContainPartstatNeedsAction(): void
    {
        $this->assertStringNotContainsString('PARTSTAT=NEEDS-ACTION', $this->ics);
    }

    public function testCanonicalIcsMatchesFirstEmailArtifactWhenGenerated(): void
    {
        $artifactPath = __DIR__ . '/artifacts/outputs/presidio-email-1.expected.ics';
        if (!is_file($artifactPath)) {
            $this->markTestSkipped('Run php tests/generate-artifacts.php to create expected output artifacts.');
        }

        $this->assertSame(
            file_get_contents($artifactPath),
            PresidioExpected::canonicalizeIcs($this->ics)
        );
    }
}
