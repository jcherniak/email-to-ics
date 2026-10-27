<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Generation\ContentVariant;
use Jcherniak\EmailToIcs\Generation\ContentVariantProvider;
use Jcherniak\EmailToIcs\Generation\EventResponseValidator;
use Jcherniak\EmailToIcs\Generation\GenerationOutcome;
use Jcherniak\EmailToIcs\Generation\GenerationRetryRunner;
use Jcherniak\EmailToIcs\Generation\ModelOrder;
use PHPUnit\Framework\TestCase;

final class GenerationRetryRunnerTest extends TestCase
{
    /**
     * @param array<string, list<string>|null> $levels level => variants (null = fetch failed)
     */
    private function provider(array $levels, ?int &$fetchCount = null): ContentVariantProvider
    {
        $fetchCount = 0;
        return new class($levels, $fetchCount) implements ContentVariantProvider {
            private array $cache = [];
            public function __construct(private array $levels, private int &$fetchCount) {}
            public function levels(): array { return array_keys($this->levels); }
            public function variantsForLevel(string $level): array
            {
                if (!isset($this->cache[$level])) {
                    $this->fetchCount++;
                    $variants = $this->levels[$level] ?? null;
                    $this->cache[$level] = $variants === null ? [] : array_map(
                        static fn(string $v): ContentVariant => new ContentVariant($level, $v, "{$level}:{$v} text", "{$level}:{$v} page", null),
                        $variants
                    );
                }
                return $this->cache[$level];
            }
            public function lastError(string $level): ?string { return ($this->levels[$level] ?? null) === null ? 'HTTP 403' : null; }
            public function firstText(): ?string
            {
                foreach ($this->levels() as $l) { $v = $this->variantsForLevel($l); if ($v !== []) { return $v[0]->text; } }
                return null;
            }
            public function fullText(): ?string
            {
                foreach ($this->levels() as $l) { $v = $this->variantsForLevel($l); if ($v !== []) { return $v[count($v) - 1]->text; } }
                return null;
            }
            public function fetchSummary(): array { return array_map(static fn($v) => ['status' => $v === null ? 'failed' : 'fetched'], $this->levels); }
        };
    }

    private function success(int $events = 1): array
    {
        $event = ['summary' => 'Event', 'dtstart' => '2026-05-29T19:30:00'];
        return ['success' => true, 'errorMessage' => '', 'eventData' => array_fill(0, $events, $event), 'emailSubject' => 'Event', 'locationLookup' => ''];
    }

    private function failure(string $message = 'bad'): array
    {
        return ['success' => false, 'errorMessage' => $message, 'eventData' => null, 'emailSubject' => 'Error', 'locationLookup' => null];
    }

    /** @return list<string> */
    private function sequence(GenerationOutcome $outcome): array
    {
        return array_map(static fn($a) => "{$a->model},{$a->level},{$a->variant}", $outcome->attempts);
    }

    public function testOrderIsSnippetThenFullThenLaterLevelsFullThenNextModel(): void
    {
        $provider = $this->provider([
            'direct' => ['snippet', 'full'],
            'firecrawl' => ['full'],
            'tinyfish_fetch' => ['full'],
        ], $fetchCount);
        $calls = [];
        $runner = new GenerationRetryRunner(function (string $model, ContentVariant $v) use (&$calls): array {
            $calls[] = "{$model}:{$v->label()}";
            return count($calls) === 7 ? $this->success(2) : $this->failure('nope #' . count($calls));
        }, new EventResponseValidator(), 24, 600, null, static fn() => null);

        $outcome = $runner->run(['m1', 'm2'], $provider);

        $this->assertTrue($outcome->success);
        $this->assertSame([
            'm1,direct,snippet', 'm1,direct,full', 'm1,firecrawl,full', 'm1,tinyfish_fetch,full',
            'm2,direct,snippet', 'm2,direct,full', 'm2,firecrawl,full',
        ], $this->sequence($outcome));
        $this->assertSame('m2', $outcome->winning?->model);
        $this->assertSame('firecrawl/full', $outcome->contentUsed?->label());
        $this->assertSame(2, $outcome->winning->eventCount);
        $this->assertSame(GenerationOutcome::STOP_SUCCESS, $outcome->stopReason);
        $this->assertSame(3, $fetchCount, 'each level is fetched once across models');
        $this->assertStringContainsString('nope #1', $outcome->attempts[0]->error);
    }

    public function testFailedFetchLevelIsRecordedOnceAndSkipped(): void
    {
        $provider = $this->provider(['direct' => null, 'firecrawl' => ['snippet', 'full']]);
        $runner = new GenerationRetryRunner(fn() => $this->failure(), new EventResponseValidator(), 24, 600, null, static fn() => null);

        $outcome = $runner->run(['m1', 'm2'], $provider);

        $this->assertFalse($outcome->success);
        $this->assertSame([
            'm1,direct,none', 'm1,firecrawl,snippet', 'm1,firecrawl,full', 'm2,firecrawl,snippet', 'm2,firecrawl,full',
        ], $this->sequence($outcome));
        $this->assertSame('fetch failed: HTTP 403', $outcome->attempts[0]->error);
        $this->assertFalse($outcome->attempts[0]->counted);
        $this->assertSame(GenerationOutcome::STOP_ALL_FAILED, $outcome->stopReason);
        $this->assertStringContainsString('Fetch level direct: failed', $outcome->attemptLog());
    }

    public function testNoContentAnywhereStopsWithNoContent(): void
    {
        $provider = $this->provider(['direct' => null]);
        $runner = new GenerationRetryRunner(fn() => $this->success(), new EventResponseValidator(), 24, 600, null, static fn() => null);

        $outcome = $runner->run(['m1'], $provider);

        $this->assertFalse($outcome->success);
        $this->assertSame(GenerationOutcome::STOP_NO_CONTENT, $outcome->stopReason);
        $this->assertStringContainsString('No content could be fetched', $outcome->eventDetails['errorMessage']);
    }

    public function testMaxAttemptsCap(): void
    {
        $provider = $this->provider(['direct' => ['snippet', 'full'], 'firecrawl' => ['full']]);
        $runner = new GenerationRetryRunner(fn() => $this->failure(), new EventResponseValidator(), 3, 600, null, static fn() => null);

        $outcome = $runner->run(['m1', 'm2'], $provider);

        $this->assertCount(3, $outcome->attempts);
        $this->assertSame(GenerationOutcome::STOP_MAX_ATTEMPTS, $outcome->stopReason);
    }

    public function testTimeBudgetStopsTheLoop(): void
    {
        $provider = $this->provider(['direct' => ['snippet', 'full']]);
        $now = 0.0;
        $clock = function () use (&$now): float { return $now; };
        $runner = new GenerationRetryRunner(function () use (&$now) { $now += 400; return $this->failure(); }, new EventResponseValidator(), 24, 600, $clock, static fn() => null);

        $outcome = $runner->run(['m1', 'm2'], $provider);

        $this->assertSame(['m1,direct,snippet', 'm1,direct,full'], $this->sequence($outcome));
        $this->assertSame(GenerationOutcome::STOP_TIME_BUDGET, $outcome->stopReason);
        $this->assertSame(400000, $outcome->attempts[0]->durationMs);
    }

    public function testExceptionsFromGeneratorAreRecordedAsFailures(): void
    {
        $provider = $this->provider(['provided' => ['provided']]);
        $runner = new GenerationRetryRunner(function () { throw new RuntimeException('boom'); }, new EventResponseValidator(), 24, 600, null, static fn() => null);

        $outcome = $runner->run(['m1'], $provider);

        $this->assertSame('Exception: boom', $outcome->attempts[0]->error);
        $this->assertSame('Exception: boom', $outcome->eventDetails['errorMessage']);
    }

    public function testValidatorRejectsIncompleteResponses(): void
    {
        $validator = new EventResponseValidator();
        $this->assertSame('model reported failure', $validator->validate(['success' => false, 'errorMessage' => '']));
        $this->assertSame('No dates found', $validator->validate(['success' => false, 'errorMessage' => 'No dates found']));
        $this->assertSame('no events returned', $validator->validate(['success' => true, 'eventData' => []]));
        $this->assertSame('no events returned', $validator->validate(['success' => true, 'eventData' => null]));
        $this->assertSame('event 1 missing dtstart', $validator->validate(['success' => true, 'eventData' => [
            ['summary' => 'A', 'dtstart' => '2026-01-01T10:00:00'],
            ['summary' => 'B', 'dtstart' => ''],
        ]]));
        $this->assertSame('event 0 missing summary', $validator->validate(['success' => true, 'eventData' => ['summary' => '', 'dtstart' => '2026-01-01']]));
        $this->assertNull($validator->validate(['success' => true, 'eventData' => ['summary' => 'Single', 'dtstart' => '2026-01-01']]));
        $this->assertSame(3, EventResponseValidator::countEvents(PresidioExpected::aiJson()));
    }

    public function testModelOrder(): void
    {
        $this->assertSame(
            ['req', 'default', 'alt', 'a', 'b'],
            ModelOrder::build('default', 'alt', ['"a"', 'default', ' b ', 'alt', ''], 'req')
        );
        $this->assertSame(['default', 'b'], ModelOrder::build('default', 'alt', ['a', 'b'], null, static fn(string $m) => $m !== 'alt' && $m !== 'a'));
        $this->assertSame([], ModelOrder::build(null, null, []));
    }
}
