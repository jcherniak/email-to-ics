<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface;
use Jcherniak\EmailToIcs\Input\CliInputSource;
use Jcherniak\EmailToIcs\Input\EmailInputSource;
use Jcherniak\EmailToIcs\Input\RawEmailTextInputSource;
use Jcherniak\EmailToIcs\Input\WebFormInputSource;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use PHPUnit\Framework\TestCase;

final class DependencyInjectionRefactorTest extends TestCase
{
    public function testEmailProcessorUsesInjectedDummyMailer(): void
    {
        $mailer = new DummyMailer();
        $processor = new EmailProcessor($mailer);

        $sent = $processor->sendCalendarEmailsForEventData(
            PresidioExpected::eventData(),
            'recipient@example.test',
            'Opera Parallele - Doubt',
            '<p>Body</p>'
        );

        $this->assertSame(3, $sent);
        $this->assertCount(3, $mailer->messages);
        $this->assertSame('recipient@example.test', $mailer->messages[0]->to);
        $this->assertSame('Opera Parallele - Doubt - May 29, 2026 7:30 PM', $mailer->messages[0]->subject);
        $this->assertCount(1, $mailer->messages[0]->attachments);
        $this->assertSame('event.ics', $mailer->messages[0]->attachments[0]->name);
        $this->assertSame('text/calendar; method=PUBLISH; charset=UTF-8', $mailer->messages[0]->attachments[0]->contentType);
    }

    public function testEmailProcessorUsesInjectedFetcher(): void
    {
        $fetcher = new DummyFetcher(new FetchResult(
            'https://example.test/event',
            '<html><title>Injected Fetch</title><body>Event</body></html>',
            'dummy',
            'base64-screenshot'
        ));
        $processor = new EmailProcessor(new DummyMailer(), $fetcher);
        $method = new ReflectionMethod($processor, 'fetch_url');
        $method->setAccessible(true);

        $content = $method->invoke($processor, 'https://example.test/event');

        $this->assertSame('<html><title>Injected Fetch</title><body>Event</body></html>', $content);
        $this->assertSame(['https://example.test/event'], $fetcher->requestedUrls);
    }

    public function testChainFetcherFallsBackAfterFailure(): void
    {
        $failingFetcher = new class implements UrlFetcherInterface {
            public int $calls = 0;

            public function fetch(string $url): ?FetchResult
            {
                $this->calls++;
                throw new RuntimeException('first fetcher failed');
            }
        };
        $dummyFetcher = new DummyFetcher(new FetchResult('https://example.test/fallback', '<html>Fallback</html>', 'dummy'));
        $chain = new ChainUrlFetcher([
            'failing' => $failingFetcher,
            'dummy' => $dummyFetcher,
        ]);

        $result = $chain->fetch('https://example.test/fallback');

        $this->assertSame(1, $failingFetcher->calls);
        $this->assertSame(['https://example.test/fallback'], $dummyFetcher->requestedUrls);
        $this->assertSame('<html>Fallback</html>', $result?->content);
    }

    public function testInputSourcesNormalizeWebCliRawEmailAndPostmarkInputs(): void
    {
        $web = (new WebFormInputSource([
            'url' => 'https://example.test/web',
            'html' => '<html>saved</html>',
            'display' => 'email',
            'tentative' => '0',
            'instructions' => 'Use the evening show',
            'review' => '1',
            'fromExtension' => 'true',
            'multiday' => '1',
            'model' => 'test/model',
        ]))->toProcessingInput();

        $this->assertSame('https://example.test/web', $web->url);
        $this->assertFalse($web->tentative);
        $this->assertTrue($web->needsReview);
        $this->assertTrue($web->fromExtension);
        $this->assertTrue($web->allowMultiDay);

        $cli = (new CliInputSource([
            'url' => 'https://example.test/cli',
            'display' => 'download',
            'tentative' => 'false',
            'json' => false,
            'debug' => false,
        ]))->toProcessingInput();

        $this->assertSame('https://example.test/cli', $cli->url);
        $this->assertSame('download', $cli->display);
        $this->assertFalse($cli->tentative);
        $this->assertTrue($cli->outputJsonOnly);
        $this->assertTrue($cli->cliDebug);

        $raw = (new RawEmailTextInputSource('Show on Friday', 'Focus May 30', 'test/model', true))->toProcessingInput();
        $this->assertSame('Show on Friday', $raw->downloadedText);
        $this->assertSame('Focus May 30', $raw->instructions);
        $this->assertTrue($raw->outputJsonOnly);
        $this->assertTrue($raw->allowMultiDay);

        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => "URL: https://example.test/postmark\nInstructions: Focus May 30\nMULTI",
            'HtmlBody' => '<p>Email</p>',
        ]);

        $this->assertSame('https://example.test/postmark', $email['url']);
        $this->assertSame('Focus May 30', $email['instructions']);
        $this->assertTrue($email['hasMultiFlag']);
        $this->assertSame('<p>Email</p>', $email['htmlBody']);
    }
}
