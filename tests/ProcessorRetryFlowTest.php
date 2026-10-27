<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Content\ReadabilityExtractor;
use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface;
use Jcherniak\EmailToIcs\Generation\GenerationOutcome;
use Jcherniak\EmailToIcs\Generation\StaticContentProvider;
use Jcherniak\EmailToIcs\Generation\UrlLevelContentProvider;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use PHPUnit\Framework\TestCase;

final class ProcessorRetryFlowTest extends TestCase
{
    private function extractorWithSnippet(): ReadabilityExtractor
    {
        $text = str_repeat('Opera Parallele presents Doubt at the Presidio Theatre on May 29. ', 8);
        $runner = static fn(array $command, string $stdin, float $timeout): array => [
            'exitCode' => 0,
            'stdout' => json_encode(['title' => 'Doubt', 'content' => '<article><p>' . $text . '</p></article>', 'textContent' => $text, 'length' => strlen($text)]),
            'stderr' => '',
            'timedOut' => false,
        ];

        return new ReadabilityExtractor('/usr/bin/env', __FILE__, 20.0, 100, $runner);
    }

    private function runGeneration(FakeEmailProcessor $processor, $provider, array $models = ['test/model']): GenerationOutcome
    {
        $method = new ReflectionMethod($processor, 'runGeneration');
        $method->setAccessible(true);

        return $method->invoke($processor, $models, $provider, null, null, null, true, PresidioExpected::URL, false);
    }

    public function testRetriesAcrossVariantsAndLevelsThenSucceeds(): void
    {
        $directFetcher = new DummyFetcher(new FetchResult(PresidioExpected::URL, '<html><body>' . file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html') . '</body></html>', 'direct'));
        $firecrawlFetcher = new DummyFetcher(new FetchResult(PresidioExpected::URL, '<html><body><p>Firecrawl copy of the Doubt page, May 29 2026 7:30 PM</p></body></html>', 'firecrawl'));
        $chain = new ChainUrlFetcher(['direct' => $directFetcher, 'firecrawl' => $firecrawlFetcher]);
        $processor = new FakeEmailProcessor(new DummyMailer(), $chain, null, $this->extractorWithSnippet());
        $processor->setFakeAiResponses([
            '{"not": "the schema"}',
            json_encode(['success' => false, 'errorMessage' => 'Email didn\'t contain dates or times', 'eventData' => null, 'emailSubject' => 'x', 'locationLookup' => '']),
            // third attempt (firecrawl/full) succeeds with the Presidio fixture
        ]);
        $provider = new UrlLevelContentProvider($chain, $this->extractorWithSnippet(), PresidioExpected::URL, static fn(string $page, ?string $title): string => "URL\n\n--- HTML ---\n" . $page);

        $outcome = $this->runGeneration($processor, $provider);

        $this->assertTrue($outcome->success);
        $this->assertSame(['direct/snippet', 'direct/full', 'firecrawl/full'], array_map(static fn($a) => $a->label(), $outcome->attempts));
        $this->assertStringContainsString('schema validation', $outcome->attempts[0]->error);
        $this->assertSame("Email didn't contain dates or times", $outcome->attempts[1]->error);
        $this->assertSame(3, $outcome->winning?->eventCount);
        $this->assertCount(3, $processor->aiRequests);
        $this->assertSame([PresidioExpected::URL], $directFetcher->requestedUrls, 'direct level fetched exactly once');
        $this->assertCount(1, $firecrawlFetcher->requestedUrls);

        $request = $processor->aiRequests[0];
        $this->assertArrayNotHasKey(0, $request, 'stray provider element must be gone');
        $this->assertTrue($request['response_format']['json_schema']['strict']);
        $this->assertStringContainsString('Opera Parallele presents Doubt', json_encode($request['messages']));
        $this->assertStringContainsString('Firecrawl copy', json_encode($processor->aiRequests[2]['messages']));
        $this->assertSame('firecrawl', $outcome->contentUsed?->fetch?->method);
        $this->assertSame('fetched', $outcome->fetchSummary['direct']['status']);
        $this->assertSame(['snippet', 'full'], $outcome->fetchSummary['direct']['variants']);
    }

    public function testSchemaValidationRejectsMissingRequiredField(): void
    {
        $json = PresidioExpected::aiJson();
        unset($json['eventData'][1]['timezone']);
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null));
        $processor->setFakeAiResponses([json_encode($json)]);
        $provider = new StaticContentProvider('<p>page</p>', static fn(string $page, ?string $title): string => $page);

        $outcome = $this->runGeneration($processor, $provider);

        $this->assertFalse($outcome->success);
        $this->assertStringContainsString('AI response failed schema validation', $outcome->attempts[0]->error);
        $this->assertSame(GenerationOutcome::STOP_ALL_FAILED, $outcome->stopReason);
    }

    public function testStaticProviderOffersSnippetAndFullForProvidedHtml(): void
    {
        $provider = new StaticContentProvider('<html><body><article>' . str_repeat('x ', 10) . '</article><script>1</script></body></html>', static fn(string $page, ?string $title): string => 'F:' . $page, $this->extractorWithSnippet(), 'https://example.test');

        $variants = $provider->variantsForLevel(StaticContentProvider::LEVEL);

        $this->assertSame(['snippet', 'full'], array_map(static fn($v) => $v->variant, $variants));
        $this->assertStringStartsWith('F:<article>', $variants[0]->text);
        $this->assertStringNotContainsString('<script>', $variants[1]->text);
        $this->assertSame([], $provider->variantsForLevel('other'));

        $empty = new StaticContentProvider('', static fn(string $page, ?string $title): string => 'email-only');
        $this->assertSame('email-only', $empty->firstText());
        $this->assertSame('provided', $empty->variantsForLevel('provided')[0]->variant);
    }

    public function testUrlProviderWithNonChainFetcherUsesSingleLevel(): void
    {
        $fetcher = new class implements UrlFetcherInterface {
            public int $calls = 0;
            public function fetch(string $url): ?FetchResult { $this->calls++; throw new RuntimeException('blocked'); }
        };
        $provider = new UrlLevelContentProvider($fetcher, $this->extractorWithSnippet(), 'https://example.test/x', static fn(string $page, ?string $title): string => $page);

        $this->assertSame(['fetch'], $provider->levels());
        $this->assertSame([], $provider->variantsForLevel('fetch'));
        $this->assertSame([], $provider->variantsForLevel('fetch'));
        $this->assertSame(1, $fetcher->calls);
        $this->assertStringContainsString('blocked', (string)$provider->lastError('fetch'));
        $this->assertFalse($provider->hasAnyContent());
        $this->assertSame('failed', $provider->fetchSummary()['fetch']['status']);
    }
}
