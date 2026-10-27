<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Candidates\CandidateEmailBuilder;
use Jcherniak\EmailToIcs\Candidates\CandidateLinks;
use Jcherniak\EmailToIcs\Candidates\CandidateSet;
use Jcherniak\EmailToIcs\Candidates\CandidateStore;
use Jcherniak\EmailToIcs\Candidates\DeliveryPlanner;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Input\EmailInputSource;
use Jcherniak\EmailToIcs\Input\WebFormInputSource;
use Jcherniak\EmailToIcs\Mail\CalendarEmailBody;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use PHPUnit\Framework\TestCase;

final class CandidateFlowTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/email-to-ics-candidate-test-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->dir);
    }

    public function testStoreRoundTripExpiryAndCleanup(): void
    {
        $store = new CandidateStore($this->dir, 3600, '1M');
        $set = CandidateFixtures::presidioSet($store->newKey(), ['expiresAt' => $store->expiresAtFor(1000)]);

        $store->save($set);
        $loaded = $store->load($set->key, 2000);

        $this->assertNotNull($loaded);
        $this->assertSame($set->key, $loaded->key);
        $this->assertCount(3, $loaded->candidates);
        $this->assertSame('Opera Parallele - Doubt', $loaded->candidate(1)?->summary());
        $this->assertSame('2026-05-30T19:30:00', $loaded->candidate(1)?->dtstart());
        $this->assertSame('orig-message-id', $loaded->inReplyTo);
        $this->assertSame([0, 1, 2], $loaded->allIndexes());
        $this->assertTrue($store->exists($set->key));

        $this->assertNull($store->load('not-a-key'));
        $this->assertNull($store->load(str_repeat('b', 32)));
        $this->assertNull($store->load($set->key, 1000 + 3600 + 1), 'expired sets return null');
        $this->assertFalse($store->exists($set->key), 'expired sets are deleted on load');

        $store->save($set);
        touch($this->dir . '/' . $set->key . '.json.gz', 10);
        $store->cleanup(10 + 3600 + 1);
        $this->assertFalse($store->exists($set->key), 'cleanup removes expired files');

        $this->expectException(InvalidArgumentException::class);
        $store->save($set->with(['key' => 'bad']));
    }

    public function testWithSentTracksIndexes(): void
    {
        $set = CandidateFixtures::presidioSet()->withSent([2, 0]);
        $this->assertSame([0, 2], $set->sentIndexes);
        $this->assertSame(CandidateSet::STATUS_SENT, $set->status);
        $this->assertSame([0, 1, 2], $set->withSent([1])->sentIndexes);
    }

    public function testChoiceEmailMatchesArtifact(): void
    {
        $built = CandidateEmailBuilder::build(CandidateFixtures::presidioSet(), CandidateFixtures::BASE_URL);
        $expectedPath = __DIR__ . '/artifacts/outputs/presidio-candidate-email.expected.html';
        if (!is_file($expectedPath)) {
            $this->markTestSkipped('Run php tests/generate-artifacts.php to create the candidate email artifact.');
        }

        $this->assertSame(trim(file_get_contents($expectedPath)), trim($built['htmlBody']));
        $this->assertSame('Opera Parallele - Doubt: 3 possible events - choose', $built['subject']);

        $key = CandidateFixtures::KEY;
        $body = $built['htmlBody'];
        $this->assertStringContainsString("https://example.test/ics/?candidates={$key}&amp;action=all", $body);
        $this->assertStringContainsString("https://example.test/ics/?candidates={$key}&amp;action=pick", $body);
        foreach ([0, 1, 2] as $index) {
            $this->assertStringContainsString("https://example.test/ics/?candidates={$key}&amp;action=one&amp;idx={$index}", $body);
        }
        $this->assertSame(3, substr_count($body, 'Use only this one'));
        $this->assertStringContainsString('Fri, May 29, 2026 7:30 PM', $body);
        $this->assertStringContainsString('Sun, May 31, 2026 3:00 PM', $body);
        $this->assertStringContainsString('[source-url: ' . PresidioExpected::URL . ']', $body);
        $this->assertStringContainsString('-----Source data (email input)-----', $body);
    }

    public function testCalendarEmailBodyCarriesMarkerAfterSourceUrl(): void
    {
        $body = CalendarEmailBody::build('https://example.test/e?x=1&y=2', 'form input', '<pre>URL: x</pre>', '<p>page</p><script>x</script>');

        $this->assertStringStartsWith('<p>Source URL: <a href="https://example.test/e?x=1&amp;y=2">', $body);
        $this->assertSame(1, substr_count($body, '[source-url: '));
        $this->assertLessThan(strpos($body, '-----Source data'), strpos($body, '[source-url: https://example.test/e?x=1&amp;y=2]'));
        $this->assertStringNotContainsString('<script>', $body);
        $this->assertSame('<p>Source URL: (none)</p>', CalendarEmailBody::sourceUrlLine(''));
        $this->assertSame('', CalendarEmailBody::markerLine(null));
    }

    public function testLinksAndBaseUrl(): void
    {
        $this->assertSame('https://x.test/?candidates=k&action=one&idx=2', CandidateLinks::url('https://x.test/', 'k', 'one', 2));
        $this->assertSame('https://x.test/index.php?a=1&candidates=k&action=pick', CandidateLinks::url('https://x.test/index.php?a=1', 'k', 'pick'));
        $this->assertSame('https://base.test/app/', CandidateLinks::baseUrl(['PUBLIC_BASE_URL' => 'https://base.test/app/'], []));
        $this->assertSame('https://host.test/email-to-ics/index.php', CandidateLinks::baseUrl([], ['HTTP_HOST' => 'host.test', 'HTTPS' => 'on', 'SCRIPT_NAME' => '/email-to-ics/index.php']));
        $this->assertSame('', CandidateLinks::baseUrl([], []));
    }

    public function testDeliveryPlanner(): void
    {
        $this->assertSame(DeliveryPlanner::SINGLE, DeliveryPlanner::plan(1, false));
        $this->assertSame(DeliveryPlanner::SINGLE, DeliveryPlanner::plan(1, true));
        $this->assertSame(DeliveryPlanner::SINGLE, DeliveryPlanner::plan(0, false));
        $this->assertSame(DeliveryPlanner::CANDIDATES, DeliveryPlanner::plan(3, false));
        $this->assertSame(DeliveryPlanner::ALL, DeliveryPlanner::plan(3, true));
    }

    public function testMultipleTokenDetection(): void
    {
        $source = new EmailInputSource();

        $this->assertTrue($source->parsePostmarkDirectives(['TextBody' => "https://example.test/e\n<multiple>", 'HtmlBody' => ''])['hasMultiFlag']);
        $this->assertTrue($source->parsePostmarkDirectives(['TextBody' => '', 'HtmlBody' => '<p>https://example.test/e</p><p>&lt;Multiple&gt;</p>'])['hasMultiFlag']);
        $this->assertTrue($source->parsePostmarkDirectives(['TextBody' => "https://example.test/e -- <MULTIPLE> please", 'HtmlBody' => ''])['hasMultiFlag']);
        $this->assertTrue($source->parsePostmarkDirectives(['TextBody' => "https://example.test/e\nMULTI", 'HtmlBody' => ''])['hasMultiFlag']);
        $parsed = $source->parsePostmarkDirectives(['TextBody' => "https://example.test/e\nmultiple events please", 'HtmlBody' => '']);
        $this->assertFalse($parsed['hasMultiFlag']);
        $this->assertSame('https://example.test/e', $parsed['url']);

        $input = (new WebFormInputSource(['url' => 'https://example.test/e', 'fromExtension' => '1', 'instructions' => 'send <multiple>']))->toProcessingInput();
        $this->assertTrue($input->fromExtension);
        $this->assertTrue($input->allowMultiDay);
    }

    public function testPromptSchemaIsAlwaysArrayAndCarriesCandidatePolicy(): void
    {
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null));
        $processor->setCurrentDateForTesting('2026-05-01');
        $build = new ReflectionMethod($processor, 'buildGenerationRequest');
        $build->setAccessible(true);

        foreach ([false, true] as $multi) {
            [$request, $schema] = $build->invoke($processor, 'test/model', '<p>page</p>', null, null, null, $multi, PresidioExpected::URL);
            $this->assertSame('array', $schema['properties']['eventData']['type']);
            $this->assertSame(1, $schema['properties']['eventData']['minItems']);
            $this->assertSame($schema, $request['response_format']['json_schema']['schema']);
            $this->assertArrayNotHasKey(0, $request);
            $system = $request['messages'][0]['content'];
            $this->assertStringContainsString('<candidate-rule>', $system);
            $this->assertStringContainsString('eventData is ALWAYS an ARRAY', $system);
            if ($multi) {
                $this->assertStringContainsString('Multi-Day Mode (ENABLED)', $system);
            } else {
                $this->assertStringContainsString('CANDIDATE POLICY: eventData is always an ARRAY. In this mode return exactly ONE event object', $system);
            }
        }
    }

    public function testSendCandidateEventsSendsOneEmailPerSelectedCandidate(): void
    {
        $store = new CandidateStore($this->dir, 3600);
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null), null, null, $store);
        $set = CandidateFixtures::presidioSet($store->newKey(), ['expiresAt' => $store->expiresAtFor(), 'attachments' => [['Name' => 'tickets.pdf', 'Content' => base64_encode('pdf'), 'ContentType' => 'application/pdf']]]);
        $store->save($set);

        $sent = $processor->sendCandidateEvents($set, [2, 0]);

        $this->assertSame(2, $sent);
        $this->assertCount(2, $processor->sentEmails);
        $this->assertSame('Opera Parallele - Doubt - May 29, 2026 7:30 PM', $processor->sentEmails[0]['subject']);
        $this->assertSame('Opera Parallele - Doubt - May 31, 2026 3:00 PM', $processor->sentEmails[1]['subject']);
        $this->assertSame('recipient@example.test', $processor->sentEmails[0]['toEmail']);
        $this->assertSame('orig-message-id', $processor->sentEmails[0]['inReplyTo']);
        $this->assertStringContainsString('Attachment: tickets.pdf', $processor->sentEmails[0]['ics']);
        $this->assertSame(1, substr_count($processor->sentEmails[0]['ics'], 'BEGIN:VEVENT'));
        $this->assertSame('tickets.pdf', $processor->sentEmails[0]['otherAttachments'][0]['Name']);
        $this->assertSame([0, 2], $store->load($set->key)?->sentIndexes);

        $single = $processor->sendCandidateEvents($set, [1]);
        $this->assertSame(1, $single);
        $this->assertSame('Opera Parallele - Doubt', $processor->sentEmails[2]['subject'], 'single send keeps the plain subject');

        $this->expectException(InvalidArgumentException::class);
        $processor->sendCandidateEvents($set, [9]);
    }

    public function testSendCandidateChoiceEmail(): void
    {
        $store = new CandidateStore($this->dir, 3600);
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null), null, null, $store);
        $set = CandidateFixtures::presidioSet($store->newKey(), ['expiresAt' => $store->expiresAtFor()]);

        $processor->sendCandidateChoiceEmail($set);

        $this->assertCount(1, $processor->sentEmails);
        $email = $processor->sentEmails[0];
        $this->assertNull($email['ics']);
        $this->assertSame('Opera Parallele - Doubt: 3 possible events - choose', $email['subject']);
        $this->assertStringContainsString("?candidates={$set->key}&amp;action=all", $email['htmlBody']);
        $this->assertSame('orig-message-id', $email['inReplyTo']);
    }
}
