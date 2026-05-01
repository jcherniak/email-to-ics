<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class EmailProcessorPromptAndEmailTest extends TestCase
{
    private const TESTING_SEED = 12345;
    private const RECIPIENT_EMAIL = 'recipient@example.test';
    private const BASE_SUBJECT = 'Opera Parallele - Doubt';

    private function presidioHtml(): string
    {
        return file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
    }

    private function callGenerateIcalEvent(FakeEmailProcessor $processor): array
    {
        $reflection = new ReflectionMethod($processor, 'generateIcalEvent');
        $reflection->setAccessible(true);

        return $reflection->invokeArgs($processor, [
            $this->presidioHtml(),
            null,
            null,
            null,
            null,
            false,
            true,
            PresidioExpected::URL,
        ]);
    }

    private function firstSystemPrompt(array $request): string
    {
        foreach ($request['messages'] ?? [] as $message) {
            if (($message['role'] ?? null) === 'system' && is_string($message['content'] ?? null)) {
                return $message['content'];
            }
        }

        $this->fail('No string system prompt was captured in the AI request.');
    }

    private function allRequestText(array $request): string
    {
        $parts = [];
        foreach ($request['messages'] ?? [] as $message) {
            $content = $message['content'] ?? '';
            $parts[] = is_string($content)
                ? $content
                : json_encode($content, JSON_UNESCAPED_SLASHES);
        }

        return implode("\n", $parts);
    }

    private function outputArtifact(string $filename): string
    {
        $path = __DIR__ . '/artifacts/outputs/' . $filename;
        if (!is_file($path)) {
            $this->markTestSkipped("Run php tests/generate-artifacts.php to create {$filename}.");
        }

        return file_get_contents($path);
    }

    private function emailSummaryArtifact(): array
    {
        $decoded = json_decode($this->outputArtifact('presidio-email-summary.expected.json'), true);
        $this->assertIsArray($decoded);

        return $decoded;
    }

    public function testGenerateIcalEventReturnsThreeEventsAndCapturesSeed(): void
    {
        $processor = new FakeEmailProcessor();
        $processor->setCurrentDateForTesting('2026-05-01');
        $processor->setAiSeedForTesting(self::TESTING_SEED);

        $result = $this->callGenerateIcalEvent($processor);

        $this->assertTrue($result['success']);
        $this->assertCount(3, $result['eventData']);
        $this->assertCount(1, $processor->aiRequests);
        $this->assertSame(self::TESTING_SEED, $processor->aiRequests[0]['seed'] ?? null);
    }

    public function testGenerateIcalEventDoesNotSendSeedByDefault(): void
    {
        $processor = new FakeEmailProcessor();
        $processor->setCurrentDateForTesting('2026-05-01');

        $this->callGenerateIcalEvent($processor);

        $this->assertCount(1, $processor->aiRequests);
        $this->assertArrayNotHasKey('seed', $processor->aiRequests[0]);
    }

    public function testGenerateIcalEventPromptIncludesSharedPolicyDateAndSourceUrl(): void
    {
        $processor = new FakeEmailProcessor();
        $processor->setCurrentDateForTesting('2026-05-01');
        $processor->setAiSeedForTesting(self::TESTING_SEED);

        $this->callGenerateIcalEvent($processor);

        $request = $processor->aiRequests[0];
        $systemPrompt = $this->firstSystemPrompt($request);
        $allText = $this->allRequestText($request);

        $this->assertStringContainsString('prompt-policy id="email-to-ics-event-selection"', $systemPrompt);
        $this->assertStringContainsString('today (05/01)', $systemPrompt);
        $this->assertStringContainsString('2026', $systemPrompt);
        $this->assertStringContainsString(PresidioExpected::URL, $allText);
    }

    public function testSendCalendarEmailsForEventDataRecordsThreeSingleEventEmails(): void
    {
        $processor = new FakeEmailProcessor();
        $sent = $processor->sendCalendarEmailsForEventData(
            PresidioExpected::eventData(),
            self::RECIPIENT_EMAIL,
            self::BASE_SUBJECT,
            '<p>Body</p>'
        );

        $this->assertSame(3, $sent);
        $this->assertCount(3, $processor->sentEmails);
    }

    public function testSentEmailsMatchOutputArtifacts(): void
    {
        $summary = $this->emailSummaryArtifact();
        $processor = new FakeEmailProcessor();

        $processor->sendCalendarEmailsForEventData(
            PresidioExpected::eventData(),
            self::RECIPIENT_EMAIL,
            self::BASE_SUBJECT,
            '<p>Body</p>'
        );

        foreach ($processor->sentEmails as $index => $email) {
            $this->assertSame($summary[$index]['subject'], $email['subject']);
            $this->assertSame('text/calendar; method=PUBLISH; charset=UTF-8', $email['attachmentMeta']['ContentType']);
            $this->assertSame(1, substr_count($email['ics'], 'BEGIN:VEVENT'));

            $expectedIcs = $this->outputArtifact($summary[$index]['canonicalIcsFile']);
            $this->assertSame($expectedIcs, PresidioExpected::canonicalizeIcs($email['ics']));
        }
    }
}
