<?php

declare(strict_types=1);

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\DirectUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Fetch\FirecrawlUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\TinyFishBrowserUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\TinyFishFetchUrlFetcher;
use PHPUnit\Framework\TestCase;

final class FetchChainTest extends TestCase
{
    /** @var array<int, array{request: \Psr\Http\Message\RequestInterface}> */
    private array $history = [];

    private function mockClient(array $responses): Client
    {
        $this->history = [];
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->history));

        return new Client(['handler' => $stack]);
    }

    private function lastRequestJson(): array
    {
        $request = $this->history[count($this->history) - 1]['request'];
        $request->getBody()->rewind();

        return json_decode((string)$request->getBody(), true);
    }

    public function testFirecrawlRequestShapeAndParsing(): void
    {
        $client = $this->mockClient([
            new Response(200, [], json_encode([
                'success' => true,
                'data' => [
                    'rawHtml' => '<html><head><title>Firecrawl Page</title></head><body>Concert</body></html>',
                    'metadata' => ['title' => 'Firecrawl Page', 'url' => 'https://example.test/final', 'statusCode' => 200],
                ],
            ])),
        ]);
        $fetcher = new FirecrawlUrlFetcher('fc-key', $client, 45, 1500);

        $result = $fetcher->fetch('https://example.test/event');

        $request = $this->history[0]['request'];
        $this->assertSame(FirecrawlUrlFetcher::ENDPOINT, (string)$request->getUri());
        $this->assertSame('Bearer fc-key', $request->getHeaderLine('Authorization'));
        $json = $this->lastRequestJson();
        $this->assertSame('https://example.test/event', $json['url']);
        $this->assertSame(['rawHtml'], $json['formats']);
        $this->assertFalse($json['onlyMainContent']);
        $this->assertSame(1500, $json['waitFor']);
        $this->assertSame(45000, $json['timeout']);

        $this->assertInstanceOf(FetchResult::class, $result);
        $this->assertSame('firecrawl', $result->method);
        $this->assertSame('Firecrawl Page', $result->title);
        $this->assertSame('https://example.test/final', $result->finalUrl);
        $this->assertSame(200, $result->statusCode);
        $this->assertSame('html', $result->contentType);
        $this->assertStringContainsString('Concert', $result->content);
    }

    public function testFirecrawlFailureThrowsAndEmptyContentReturnsNull(): void
    {
        $fetcher = new FirecrawlUrlFetcher('fc-key', $this->mockClient([
            new Response(402, [], json_encode(['success' => false, 'error' => 'Insufficient credits'])),
        ]));
        try {
            $fetcher->fetch('https://example.test/event');
            $this->fail('Expected exception');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('firecrawl: Insufficient credits', $e->getMessage());
        }

        $fetcher = new FirecrawlUrlFetcher('fc-key', $this->mockClient([
            new Response(200, [], json_encode(['success' => true, 'data' => ['rawHtml' => '', 'metadata' => []]])),
        ]));
        $this->assertNull($fetcher->fetch('https://example.test/event'));

        $fetcher = new FirecrawlUrlFetcher('fc-key', $this->mockClient([
            new Response(200, [], json_encode(['success' => true, 'data' => ['rawHtml' => '<p>blocked</p>', 'metadata' => ['statusCode' => 403]]])),
        ]));
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('target page returned HTTP 403');
        $fetcher->fetch('https://example.test/event');
    }

    public function testTinyFishFetchRequestShapeAndParsing(): void
    {
        $client = $this->mockClient([
            new Response(200, [], json_encode([
                'results' => [[
                    'url' => 'https://example.test/event',
                    'final_url' => 'https://example.test/event?x=1',
                    'title' => 'TinyFish Page',
                    'format' => 'html',
                    'text' => '<main>Opera on Friday</main>',
                ]],
                'errors' => [],
            ])),
        ]);
        $fetcher = new TinyFishFetchUrlFetcher('tf-key', $client, 200);

        $result = $fetcher->fetch('https://example.test/event');

        $request = $this->history[0]['request'];
        $this->assertSame(TinyFishFetchUrlFetcher::ENDPOINT, (string)$request->getUri());
        $this->assertSame('tf-key', $request->getHeaderLine('X-API-Key'));
        $json = $this->lastRequestJson();
        $this->assertSame(['https://example.test/event'], $json['urls']);
        $this->assertSame('html', $json['format']);
        $this->assertSame(0, $json['ttl']);
        $this->assertSame(TinyFishFetchUrlFetcher::MAX_PER_URL_TIMEOUT_MS, $json['per_url_timeout_ms']);

        $this->assertSame('tinyfish_fetch', $result?->method);
        $this->assertSame('TinyFish Page', $result->title);
        $this->assertSame('https://example.test/event?x=1', $result->finalUrl);
        $this->assertSame('<main>Opera on Friday</main>', $result->content);
    }

    public function testTinyFishFetchErrorsThrow(): void
    {
        $fetcher = new TinyFishFetchUrlFetcher('tf-key', $this->mockClient([
            new Response(200, [], json_encode([
                'results' => [],
                'errors' => [['url' => 'https://example.test/event', 'code' => 'fetch_failed', 'message' => 'blocked by origin']],
            ])),
        ]));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tinyfish_fetch: fetch_failed: blocked by origin');
        $fetcher->fetch('https://example.test/event');
    }

    public function testTinyFishBrowserRequestShapeAndParsing(): void
    {
        $client = $this->mockClient([
            new Response(200, [], json_encode([
                'run_id' => 'run-1',
                'status' => 'COMPLETED',
                'num_of_steps' => 4,
                'result' => ['title' => 'Rendered Page', 'content' => "Doubt\nFriday May 29 7:30 PM"],
                'error' => null,
            ])),
        ]);
        $fetcher = new TinyFishBrowserUrlFetcher('tf-key', $client, 120, 'stealth');

        $result = $fetcher->fetch('https://example.test/event');

        $request = $this->history[0]['request'];
        $this->assertSame(TinyFishBrowserUrlFetcher::ENDPOINT, (string)$request->getUri());
        $this->assertSame('tf-key', $request->getHeaderLine('X-API-Key'));
        $json = $this->lastRequestJson();
        $this->assertSame('https://example.test/event', $json['url']);
        $this->assertSame('stealth', $json['browser_profile']);
        $this->assertTrue($json['proxy_config']['enabled']);
        $this->assertSame(120, $json['agent_config']['max_duration_seconds']);
        $this->assertSame(['title', 'content'], $json['output_schema']['required']);

        $this->assertSame('tinyfish_browser', $result?->method);
        $this->assertSame('text', $result->contentType);
        $this->assertFalse($result->isHtml());
        $this->assertSame('Rendered Page', $result->title);
        $this->assertSame('run-1', $result->metadata['run_id']);
        $this->assertStringContainsString('May 29', $result->content);
    }

    public function testTinyFishBrowserFailedRunThrows(): void
    {
        $fetcher = new TinyFishBrowserUrlFetcher('tf-key', $this->mockClient([
            new Response(200, [], json_encode(['run_id' => 'run-2', 'status' => 'FAILED', 'result' => null, 'error' => ['message' => 'navigation timeout']])),
        ]));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tinyfish_browser:');
        $fetcher->fetch('https://example.test/event');
    }

    public function testDirectFetcherRecordsMetadata(): void
    {
        $client = $this->mockClient([
            new Response(200, ['X-Guzzle-Redirect-History' => ['https://example.test/final']], '<html><title>Direct &amp; Title</title><body>x</body></html>'),
        ]);
        $fetcher = new DirectUrlFetcher($client, 12);

        $result = $fetcher->fetch('https://example.test/start');

        $this->assertSame('direct', $result?->method);
        $this->assertSame(200, $result->statusCode);
        $this->assertSame('Direct & Title', $result->title);
        $this->assertSame('https://example.test/final', $result->finalUrl);
    }

    public function testChainLevelsFollowEnvironmentKeys(): void
    {
        $this->assertSame(['direct'], ChainUrlFetcher::fromEnvironment([])->levelNames());
        $this->assertSame(['direct', 'firecrawl'], ChainUrlFetcher::fromEnvironment(['FIRECRAWL_API_KEY' => 'fc'])->levelNames());
        $this->assertSame(
            ['direct', 'firecrawl', 'tinyfish_fetch', 'tinyfish_browser'],
            ChainUrlFetcher::fromEnvironment(['FIRECRAWL_API_KEY' => 'fc', 'TINYFISH_API_KEY' => 'tf'])->levelNames()
        );
        $this->assertSame(['direct', 'tinyfish_fetch', 'tinyfish_browser'], ChainUrlFetcher::fromEnvironment(['TINYFISH_API_KEY' => 'tf'])->levelNames());
    }

    public function testFetchLevelDispatchesAndPropagatesErrors(): void
    {
        $direct = new DummyFetcher(null);
        $firecrawl = new DummyFetcher(new FetchResult('https://example.test/e', '<html>fc</html>', 'firecrawl'));
        $chain = new ChainUrlFetcher(['direct' => $direct, 'firecrawl' => $firecrawl]);

        $this->assertNull($chain->fetchLevel('direct', 'https://example.test/e'));
        $this->assertSame('<html>fc</html>', $chain->fetchLevel('firecrawl', 'https://example.test/e')?->content);
        $this->assertSame(['https://example.test/e'], $direct->requestedUrls);
        $this->assertTrue($chain->hasLevel('firecrawl'));
        $this->assertFalse($chain->hasLevel('tinyfish_fetch'));

        $this->expectException(InvalidArgumentException::class);
        $chain->fetchLevel('nope', 'https://example.test/e');
    }

    public function testFetchResultSummary(): void
    {
        $result = new FetchResult('https://a', 'abc', 'direct', null, [], 'https://b', 'T', 200, 'html');
        $summary = $result->toSummary();
        $this->assertSame('direct', $summary['method']);
        $this->assertSame(3, $summary['bytes']);
        $this->assertSame('https://b', $summary['finalUrl']);
        $this->assertFalse($summary['hasScreenshot']);
    }
}
