<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Content\ExtractedContent;
use Jcherniak\EmailToIcs\Content\HtmlLightener;
use Jcherniak\EmailToIcs\Content\ReadabilityExtractor;
use PHPUnit\Framework\TestCase;

final class ReadabilityExtractorTest extends TestCase
{
    private static function page(): string
    {
        return '<html><head><title>Concert &amp; Talk</title><style>.x{}</style><script>var a = 1;</script></head>'
            . '<body><nav>Menu</nav><main><h1>Concert</h1><p>Friday <time datetime="2025-10-03T19:30">Oct 3 at 7:30 PM</time> at <a href="https://venue.test">Davies Hall</a></p></main>'
            . '<svg><path d="M0 0"/></svg><!-- tracking --><img src="data:image/png;base64,' . str_repeat('A', 100) . '"></body></html>';
    }

    private function fakeRunner(array $result, array &$calls = null): callable
    {
        return static function (array $command, string $stdin, float $timeout) use ($result, &$calls): array {
            $calls[] = ['command' => $command, 'stdin' => $stdin, 'timeout' => $timeout];
            return $result + ['exitCode' => 0, 'stdout' => '', 'stderr' => '', 'timedOut' => false];
        };
    }

    public function testReadabilitySuccessProducesSnippetAndLightenedFullPage(): void
    {
        $calls = [];
        $text = str_repeat('Concert on Friday at 7:30 PM. ', 10);
        $runner = $this->fakeRunner(['stdout' => json_encode([
            'title' => 'Concert',
            'content' => '<div><p>' . $text . '</p></div>',
            'textContent' => $text,
            'length' => strlen($text),
        ])], $calls);
        $extractor = new ReadabilityExtractor('/usr/bin/env', __FILE__, 7.5, 50, $runner);

        $result = $extractor->extract(self::page(), 'https://example.test/page');

        $this->assertSame(ExtractedContent::METHOD_READABILITY, $result->method);
        $this->assertTrue($result->hasSnippet());
        $this->assertSame('Concert', $result->title);
        $this->assertStringContainsString('7:30 PM', $result->primaryHtml());
        $this->assertStringNotContainsString('<script', $result->fullHtml);
        $this->assertStringNotContainsString('<svg', $result->fullHtml);
        $this->assertStringContainsString('<time datetime="2025-10-03T19:30">', $result->fullHtml);
        $this->assertSame('https://example.test/page', $calls[0]['command'][2]);
        $this->assertSame(self::page(), $calls[0]['stdin']);
        $this->assertSame(7.5, $calls[0]['timeout']);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('fallbackCases')]
    public function testFallbackReasons(array $runResult, string $expectedReason): void
    {
        $extractor = new ReadabilityExtractor('/usr/bin/env', __FILE__, 20.0, 200, $this->fakeRunner($runResult));

        $result = $extractor->extract(self::page(), 'https://example.test/page');

        $this->assertSame(ExtractedContent::METHOD_FALLBACK, $result->method);
        $this->assertSame($expectedReason, $result->fallbackReason);
        $this->assertNull($result->snippetHtml);
        $this->assertFalse($result->hasSnippet());
        $this->assertStringContainsString('Davies Hall', $result->primaryHtml());
        $this->assertStringNotContainsString('<script', $result->primaryHtml());
        $this->assertSame('Concert & Talk', $result->title);
        $this->assertStringContainsString('Oct 3 at 7:30 PM', $result->textContent);
    }

    public static function fallbackCases(): array
    {
        return [
            'process failed' => [['exitCode' => 1, 'stderr' => 'boom'], ReadabilityExtractor::REASON_PROCESS_FAILED],
            'node missing exit 127' => [['exitCode' => 127], ReadabilityExtractor::REASON_NODE_MISSING],
            'timeout' => [['exitCode' => -1, 'timedOut' => true], ReadabilityExtractor::REASON_TIMEOUT],
            'invalid json' => [['stdout' => 'not json'], ReadabilityExtractor::REASON_INVALID_JSON],
            'too short' => [['stdout' => json_encode(['content' => '<p>short</p>', 'textContent' => 'short', 'length' => 5])], ReadabilityExtractor::REASON_TOO_SHORT],
            'null parse' => [['stdout' => json_encode(['content' => null, 'textContent' => '', 'length' => 0])], ReadabilityExtractor::REASON_TOO_SHORT],
        ];
    }

    public function testDisabledAndMissingNodeFallBackWithoutRunningAnything(): void
    {
        $calls = [];
        $runner = $this->fakeRunner([], $calls);

        $disabled = new ReadabilityExtractor(null, __FILE__, 20.0, 200, $runner, false);
        $this->assertSame(ReadabilityExtractor::REASON_DISABLED, $disabled->extract(self::page())->fallbackReason);

        $missing = new ReadabilityExtractor('/definitely/not/a/node/binary', __FILE__, 20.0, 200, $runner);
        $this->assertSame(ReadabilityExtractor::REASON_NODE_MISSING, $missing->extract(self::page())->fallbackReason);

        $this->assertSame([], $calls);
    }

    public function testPlainTextContentIsWrappedForBothTiers(): void
    {
        $extractor = new ReadabilityExtractor('/usr/bin/env', __FILE__, 20.0, 200, $this->fakeRunner([]));

        $result = $extractor->extract("Doubt\nFriday <May 29> 7:30 PM", null, 'text');

        $this->assertSame(ExtractedContent::METHOD_TEXT, $result->method);
        $this->assertSame($result->snippetHtml, $result->fullHtml);
        $this->assertStringStartsWith('<pre>', $result->fullHtml);
        $this->assertStringContainsString('&lt;May 29&gt;', $result->fullHtml);
    }

    public function testLightenerKeepsLinksAndTimesButDropsBlobs(): void
    {
        $light = HtmlLightener::lighten(self::page());

        $this->assertStringContainsString('<a href="https://venue.test">', $light);
        $this->assertStringContainsString('datetime="2025-10-03T19:30"', $light);
        $this->assertStringNotContainsString('var a = 1', $light);
        $this->assertStringNotContainsString('.x{}', $light);
        $this->assertStringNotContainsString('tracking', $light);
        $this->assertStringNotContainsString(str_repeat('A', 100), $light);
        $this->assertStringContainsString('data:omitted', $light);
    }

    public function testFromEnvironmentReadsSettings(): void
    {
        $extractor = ReadabilityExtractor::fromEnvironment([
            'READABILITY_ENABLED' => '0',
        ], dirname(__DIR__));

        $this->assertSame(ReadabilityExtractor::REASON_DISABLED, $extractor->extract(self::page())->fallbackReason);
    }

    public function testRealNodeScriptExtractsPresidioContent(): void
    {
        $root = dirname(__DIR__);
        $node = (new \Symfony\Component\Process\ExecutableFinder())->find('node');
        if ($node === null || !is_dir($root . '/node_modules/@mozilla/readability') || !is_dir($root . '/node_modules/jsdom')) {
            $this->markTestSkipped('node or Readability dependencies are not installed');
        }

        $extractor = ReadabilityExtractor::fromEnvironment([], $root);
        $html = file_get_contents($root . '/tests/artifacts/sources/presidio-opera-parallele-doubt.html');

        $result = $extractor->extract($html, 'https://www.presidiotheatre.org/doubt');

        $this->assertSame(ExtractedContent::METHOD_READABILITY, $result->method, (string)$result->fallbackReason);
        $this->assertStringContainsString('Doubt', $result->textContent);
        $this->assertGreaterThan(200, strlen($result->textContent));
        $this->assertLessThan(strlen($html), strlen($result->primaryHtml()));
    }
}
