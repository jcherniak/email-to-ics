<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Candidates\CandidateStore;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use PHPUnit\Framework\TestCase;

final class EditReplyFlowTest extends TestCase
{
    private string $dir;
    private CandidateStore $store;
    private DummyMailer $mailer;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/email-to-ics-edit-test-' . bin2hex(random_bytes(4));
        $this->store = new CandidateStore($this->dir, 3600);
        $this->mailer = new DummyMailer();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->dir);
    }

    private function processor(?DummyFetcher $fetcher = null): FakeEmailProcessor
    {
        return new FakeEmailProcessor($this->mailer, $fetcher ?? new DummyFetcher(null), null, null, $this->store);
    }

    private function replyBody(string $key, string $text, array $overrides = []): array
    {
        return array_merge([
            'From' => 'recipient@example.test',
            'FromName' => 'Recipient',
            'To' => "edit-{$key}@reply.example.test",
            'ToFull' => [['Email' => "edit-{$key}@reply.example.test", 'Name' => '']],
            'Cc' => '',
            'CcFull' => [],
            'Subject' => 'Re: Opera Parallele - Doubt',
            'MessageID' => 'reply-' . bin2hex(random_bytes(3)),
            'Date' => 'Fri, 1 May 2026 10:00:00 -0700',
            'TextBody' => $text,
            'HtmlBody' => '',
            'Attachments' => [],
        ], $overrides);
    }

    private function runReply(FakeEmailProcessor $processor, array $body): array
    {
        ob_start();
        try {
            $processor->processPostmarkRequest($body);
        } finally {
            $output = (string)ob_get_clean();
        }

        return json_decode($output, true) ?? ['raw' => $output];
    }

    private function allRequestText(array $request): string
    {
        $parts = [];
        foreach ($request['messages'] ?? [] as $message) {
            $content = $message['content'] ?? '';
            $parts[] = is_string($content) ? $content : json_encode($content, JSON_UNESCAPED_SLASHES);
        }

        return implode("\n", $parts);
    }

    public function testStatePathUsesStoredContentAndPreviousIcs(): void
    {
        $key = $this->store->newKey();
        $set = CandidateFixtures::presidioSet($key, ['expiresAt' => $this->store->expiresAtFor(), 'candidates' => array_slice(CandidateFixtures::presidioSet()->candidates, 0, 1)]);
        $this->store->save($set);
        $fetcher = new DummyFetcher(null);
        $processor = $this->processor($fetcher);
        $single = PresidioExpected::aiJson();
        $single['eventData'] = [$single['eventData'][0]];
        $single['eventData'][0]['dtstart'] = '2026-05-29T20:00:00';
        $processor->setFakeAiResponses([json_encode($single)]);

        $result = $this->runReply($processor, $this->replyBody($key, "Move it to 8pm please.\n\nOn Fri, May 1, 2026 Email to ICS wrote:\n> Source URL: " . PresidioExpected::URL . "\n> [source-url: " . PresidioExpected::URL . "]"));

        $this->assertSame('success', $result['status'] ?? null, json_encode($result));
        $this->assertSame([], $fetcher->requestedUrls, 'stored state means no refetch');
        $this->assertCount(1, $processor->aiRequests);
        $text = $this->allRequestText($processor->aiRequests[0]);
        $this->assertStringContainsString('*** EDIT REQUEST (round 1) ***', $text);
        $this->assertStringContainsString($set->candidates[0]->ics, $text, 'previous ICS is passed verbatim');
        $this->assertStringContainsString('--- PREVIOUS EVENT JSON ---', $text);
        $this->assertStringContainsString('Move it to 8pm please.', $text);
        $this->assertStringContainsString('<main><h1>Doubt</h1></main>', $text, 'stored source content is the page context');
        $this->assertStringNotContainsString('previous structured output unavailable', $text);

        $this->assertCount(1, $processor->sentEmails);
        $email = $processor->sentEmails[0];
        $this->assertSame('recipient@example.test', $email['toEmail']);
        $this->assertStringContainsString('DTSTART;TZID=America/Los_Angeles:20260529T200000', $email['ics']);
        $this->assertMatchesRegularExpression('/^edit-[a-f0-9]{32}@reply\.example\.test$/', $email['replyTo']);
        $this->assertStringNotContainsString($key, $email['replyTo'], 'edited events get a new key');
        $this->assertStringContainsString('[source-url: ' . PresidioExpected::URL . ']', $email['htmlBody']);
        $this->assertStringContainsString('Move it to 8pm please.', $email['htmlBody'], 'the reply is shown as the source data');

        $newKey = $result['candidateKey'];
        $newSet = $this->store->load($newKey);
        $this->assertNotNull($newSet);
        $this->assertSame($key, $newSet->previousKey);
        $this->assertSame($key, $newSet->rootKey);
        $this->assertSame(1, $newSet->editRound);
        $this->assertSame('edit', $newSet->origin);
        $this->assertSame(PresidioExpected::URL, $newSet->sourceUrl);
        $this->assertSame([], $this->mailer->messages, 'no error email');
    }

    public function testRoundCapSendsErrorEmailWithoutCallingTheModel(): void
    {
        $key = $this->store->newKey();
        $this->store->save(CandidateFixtures::presidioSet($key, ['expiresAt' => $this->store->expiresAtFor(), 'editRound' => 10]));
        $processor = $this->processor();

        $result = $this->runReply($processor, $this->replyBody($key, "Change it again"));

        $this->assertSame('error', $result['status'] ?? null);
        $this->assertSame([], $processor->aiRequests);
        $this->assertSame([], $processor->sentEmails);
        $this->assertCount(1, $this->mailer->messages);
        $this->assertStringContainsString('Edit Failed', $this->mailer->messages[0]->subject);
        $this->assertStringContainsString('limit 10', $this->mailer->messages[0]->htmlBody);
    }

    public function testExpiredStateFallsBackToQuotedSourceUrl(): void
    {
        $unknownKey = str_repeat('e', 32);
        $html = file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
        $fetcher = new DummyFetcher(new FetchResult(PresidioExpected::URL, $html, 'dummy'));
        $processor = $this->processor($fetcher);
        // Model-driven fetch: the model asks for fetch_direct on the quoted URL, then answers.
        $processor->setFakeAiResponses([FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => PresidioExpected::URL])]);
        $text = file_get_contents(__DIR__ . '/artifacts/sources/replies/gmail-text.txt');

        $result = $this->runReply($processor, $this->replyBody($unknownKey, $text, ['From' => 'confirmed@example.test']));

        $this->assertSame('success', $result['status'] ?? null, json_encode($result));
        $this->assertSame([PresidioExpected::URL], $fetcher->requestedUrls, 'the quoted source URL is fetched again through the fetch tool');
        $this->assertCount(2, $processor->aiRequests);
        $this->assertSame(['fetch_direct'], array_column(array_column($processor->aiRequests[0]['tools'], 'function'), 'name'));
        $requestText = $this->allRequestText($processor->aiRequests[0]);
        $this->assertStringContainsString('# FETCHING PROCEDURE', $requestText);
        $this->assertStringContainsString('previous structured output unavailable', $requestText);
        $toolMessages = array_values(array_filter($processor->aiRequests[1]['messages'], static fn(array $m): bool => ($m['role'] ?? '') === 'tool'));
        $this->assertCount(1, $toolMessages);
        $this->assertStringContainsString('Opera Parall', $toolMessages[0]['content'], 'fetched page content goes back to the model');
        $this->assertStringContainsString('Opera Parallele presents Doubt', $requestText, 'quoted email text is passed as context');
        $this->assertStringContainsString('Please move it to 8pm', $requestText);
        $this->assertStringNotContainsString('--- PREVIOUS ICS ---', $requestText);

        // Presidio fixture returns 3 events and the reply did not ask for <multiple>: a choice email goes out.
        $this->assertCount(1, $processor->sentEmails);
        $this->assertNull($processor->sentEmails[0]['ics']);
        $this->assertStringContainsString('3 possible events', $processor->sentEmails[0]['subject']);
        $this->assertSame('confirmed@example.test', $processor->sentEmails[0]['toEmail'], 'reply from the confirmed address targets the confirmed calendar');

        $newSet = $this->store->load($result['candidateKey']);
        $this->assertSame($unknownKey, $newSet?->previousKey);
        $this->assertSame(1, $newSet?->editRound);
        $this->assertFalse($newSet?->tentative);
        $this->assertStringContainsString('Doubt', (string)$newSet?->sourceContent, 'the fetched content is stored for later edits');
        $this->assertSame([], $this->mailer->messages);
    }

    public function testExpiredStateWithoutSourceUrlSendsErrorEmail(): void
    {
        $processor = $this->processor();

        $result = $this->runReply($processor, $this->replyBody(str_repeat('f', 32), "Move it to 8pm\n\n> nothing useful quoted"));

        $this->assertSame('error', $result['status'] ?? null);
        $this->assertSame([], $processor->aiRequests);
        $this->assertCount(1, $this->mailer->messages);
        $this->assertStringContainsString('no source URL was found', $this->mailer->messages[0]->htmlBody);
    }

    public function testMultipleInReplySendsEveryCandidate(): void
    {
        $key = $this->store->newKey();
        $this->store->save(CandidateFixtures::presidioSet($key, ['expiresAt' => $this->store->expiresAtFor()]));
        $processor = $this->processor();

        $result = $this->runReply($processor, $this->replyBody($key, "Add a 30 minute reminder <multiple>"));

        $this->assertSame('success', $result['status'] ?? null, json_encode($result));
        $this->assertCount(3, $processor->sentEmails);
        $this->assertSame('Opera Parallele - Doubt - May 29, 2026 7:30 PM', $processor->sentEmails[0]['subject']);
        $this->assertSame('Opera Parallele - Doubt - May 31, 2026 3:00 PM', $processor->sentEmails[2]['subject']);
        $text = $this->allRequestText($processor->aiRequests[0]);
        $this->assertStringContainsString('*** EDIT REQUEST (round 1) ***', $text);
        $this->assertSame(3, substr_count($text, 'BEGIN:VEVENT'), 'all three previous events are included');
    }
}
