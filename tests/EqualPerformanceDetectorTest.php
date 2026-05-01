<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class EqualPerformanceDetectorTest extends TestCase
{
    private function invokeShouldExtractEqualPerformances(string $content, ?string $instructions = null): bool
    {
        $processor = new FakeEmailProcessor();
        $reflection = new ReflectionMethod($processor, 'shouldExtractEqualPerformances');
        $reflection->setAccessible(true);

        return $reflection->invoke($processor, $content, $instructions);
    }

    public function testPresidioWithNullInstructionsReturnsTrue(): void
    {
        $content = file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
        $this->assertTrue($this->invokeShouldExtractEqualPerformances($content, null));
    }

    public function testEqualPerformancesSimpleReturnsTrue(): void
    {
        $content = file_get_contents(__DIR__ . '/artifacts/sources/equal-performances-simple.html');
        $this->assertTrue($this->invokeShouldExtractEqualPerformances($content, null));
    }

    public function testPresidioWithSpecificInstructionsReturnsFalse(): void
    {
        $content = file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
        $this->assertFalse($this->invokeShouldExtractEqualPerformances($content, 'Only use the May 30 performance'));
    }

    public function testPrimaryDateWithRelatedReturnsFalse(): void
    {
        $content = file_get_contents(__DIR__ . '/artifacts/sources/primary-date-with-related.html');
        $this->assertFalse($this->invokeShouldExtractEqualPerformances($content, null));
    }
}
