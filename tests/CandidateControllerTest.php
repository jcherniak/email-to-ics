<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Candidates\CandidateStore;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use Jcherniak\EmailToIcs\Web\CandidateController;
use PHPUnit\Framework\TestCase;

final class CandidateControllerTest extends TestCase
{
    private string $dir;
    private CandidateStore $store;
    private FakeEmailProcessor $processor;
    private string $key;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/email-to-ics-controller-test-' . bin2hex(random_bytes(4));
        $this->store = new CandidateStore($this->dir, 3600);
        $this->processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null), null, null, $this->store);
        $this->key = $this->store->newKey();
        $this->store->save(CandidateFixtures::presidioSet($this->key, ['expiresAt' => $this->store->expiresAtFor()]));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->dir);
    }

    private function controller(bool $requireConfirm = true): CandidateController
    {
        return new CandidateController($this->store, fn() => $this->processor, $requireConfirm, 'https://example.test/ics/');
    }

    private function capture(callable $fn): string
    {
        ob_start();
        try {
            $fn();
        } finally {
            $output = (string)ob_get_clean();
        }

        return $output;
    }

    public function testInvalidMissingAndExpiredKeys(): void
    {
        $c = $this->controller();
        $this->assertStringContainsString('not valid', $this->capture(fn() => $c->handle('GET', ['candidates' => 'nope', 'action' => 'all'], [])));
        $this->assertStringContainsString('not found', $this->capture(fn() => $c->handle('GET', ['candidates' => str_repeat('c', 32), 'action' => 'all'], [])));

        $expiredKey = $this->store->newKey();
        $this->store->save(CandidateFixtures::presidioSet($expiredKey, ['expiresAt' => date('c', time() - 10)]));
        $this->assertStringContainsString('expired', $this->capture(fn() => $c->handle('GET', ['candidates' => $expiredKey, 'action' => 'all'], [])));
        $this->assertSame([], $this->processor->sentEmails);
    }

    public function testGetLinksRenderConfirmPagesWithoutSending(): void
    {
        $c = $this->controller();

        $all = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'all'], []));
        $this->assertStringContainsString('Create all 3 events', $all);
        $this->assertSame(3, substr_count($all, 'name="idx[]"'));
        $this->assertStringContainsString("action=\"https://example.test/ics/?candidates={$this->key}&amp;action=send\"", $all);

        $one = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'one', 'idx' => '1'], []));
        $this->assertStringContainsString('Create this event', $one);
        $this->assertStringContainsString('Sat, May 30, 2026 7:30 PM', $one);
        $this->assertSame(1, substr_count($one, 'name="idx[]"'));

        $pick = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'pick'], []));
        $this->assertSame(3, substr_count($pick, 'type="checkbox"'));
        $this->assertStringContainsString('Send selected events', $pick);

        $bad = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'one', 'idx' => '7'], []));
        $this->assertStringContainsString('does not exist', $bad);

        $this->assertSame([], $this->processor->sentEmails, 'GET never sends when confirmation is required');
    }

    public function testPostSendSendsSelectedCandidates(): void
    {
        $c = $this->controller();

        $out = $this->capture(fn() => $c->handle('POST', ['candidates' => $this->key, 'action' => 'send'], ['idx' => ['0', '2']]));

        $this->assertStringContainsString('2 calendar emails sent to recipient@example.test', $out);
        $this->assertCount(2, $this->processor->sentEmails);
        $this->assertSame('Opera Parallele - Doubt - May 29, 2026 7:30 PM', $this->processor->sentEmails[0]['subject']);
        $this->assertSame('Opera Parallele - Doubt - May 31, 2026 3:00 PM', $this->processor->sentEmails[1]['subject']);
        $this->assertSame([0, 2], $this->store->load($this->key)?->sentIndexes);

        $again = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'pick'], []));
        $this->assertSame(2, substr_count($again, 'already sent'));

        $invalid = $this->capture(fn() => $c->handle('POST', ['candidates' => $this->key, 'action' => 'send'], ['idx' => ['5']]));
        $this->assertStringContainsString('Invalid selection', $invalid);
        $this->assertCount(2, $this->processor->sentEmails);
    }

    public function testGetSendsImmediatelyWhenConfirmNotRequired(): void
    {
        $c = $this->controller(false);

        $out = $this->capture(fn() => $c->handle('GET', ['candidates' => $this->key, 'action' => 'one', 'idx' => '1'], []));

        $this->assertStringContainsString('1 calendar email sent', $out);
        $this->assertCount(1, $this->processor->sentEmails);
        $this->assertSame('Opera Parallele - Doubt', $this->processor->sentEmails[0]['subject']);
    }

    public function testConfirmEndpointJson(): void
    {
        $c = $this->controller();

        $all = json_decode($this->capture(fn() => $c->handleConfirm(['confirmationToken' => $this->key])), true);
        $this->assertSame('success', $all['status']);
        $this->assertSame(3, $all['sent']);
        $this->assertCount(3, $this->processor->sentEmails);

        $some = json_decode($this->capture(fn() => $c->handleConfirm(['candidateKey' => $this->key, 'indexes' => [1]])), true);
        $this->assertSame(1, $some['sent']);
        $this->assertSame([1], $some['sentIndexes']);
        $this->assertCount(4, $this->processor->sentEmails);

        $bad = json_decode($this->capture(fn() => $c->handleConfirm(['confirmationToken' => 'zzz'])), true);
        $this->assertStringContainsString('Invalid', $bad['error']);
        $missing = json_decode($this->capture(fn() => $c->handleConfirm(['confirmationToken' => str_repeat('d', 32)])), true);
        $this->assertStringContainsString('not found', $missing['error']);
    }
}
