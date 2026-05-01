<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class PresidioArtifactsTest extends TestCase
{
    private function outputArtifact(string $filename): string
    {
        $path = __DIR__ . '/artifacts/outputs/' . $filename;
        if (!is_file($path)) {
            $this->markTestSkipped("Run php tests/generate-artifacts.php to create {$filename}.");
        }

        return file_get_contents($path);
    }

    private function aiOutputArtifact(): array
    {
        $decoded = json_decode($this->outputArtifact('presidio-ai-output.expected.json'), true);
        $this->assertIsArray($decoded);

        return $decoded;
    }

    public function testPresidioAiOutputArtifactEqualsExpectedJson(): void
    {
        $this->assertSame(PresidioExpected::aiJson(), $this->aiOutputArtifact());
    }

    public function testPresidioAiOutputArtifactHasThreeEvents(): void
    {
        $artifact = $this->aiOutputArtifact();

        $this->assertTrue($artifact['success']);
        $this->assertIsArray($artifact['eventData']);
        $this->assertCount(3, $artifact['eventData']);
    }

    public function testPresidioAiOutputArtifactHasExpectedDatesTimezoneAndUrl(): void
    {
        $events = $this->aiOutputArtifact()['eventData'];

        $this->assertSame('2026-05-29T19:30:00', $events[0]['dtstart']);
        $this->assertSame('2026-05-30T19:30:00', $events[1]['dtstart']);
        $this->assertSame('2026-05-31T15:00:00', $events[2]['dtstart']);

        foreach ($events as $event) {
            $this->assertSame('America/Los_Angeles', $event['timezone']);
            $this->assertSame(PresidioExpected::URL, $event['url']);
        }
    }

    public function testOutputSourceArtifactsExist(): void
    {
        $this->assertFileExists(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
        $this->assertFileExists(__DIR__ . '/artifacts/sources/equal-performances-simple.html');
        $this->assertFileExists(__DIR__ . '/artifacts/sources/primary-date-with-related.html');
    }
}
