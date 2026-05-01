<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;
use Jcherniak\EmailToIcs\Web\ProcessedDebugView;
use PHPUnit\Framework\TestCase;

final class ProcessedDebugViewTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/email-to-ics-processed-test-' . bin2hex(random_bytes(4));
        mkdir($this->dir, 0777, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->dir);
    }

    public function testProcessedRecordStoreReadsLegacyBacktickIcsAndMetadata(): void
    {
        $path = $this->dir . '/2026-05-01.12.00.00-message-Test.json';
        file_put_contents($path, <<<'JSON'
{
  "2026-05-01 12:00:00": {
    "dateEnded": "2026-05-01 12:00:01",
    "status": "success",
    "icsData": `
BEGIN:VCALENDAR
END:VCALENDAR
`,
    "downloadedContent": "PGh0bWw+PC9odG1sPg==",
    "downloadedUrl": "https://example.test/event",
    "pageTitle": "Example Page",
    "parsedTitle": "Parsed Event",
    "parsedDates": ["2026-05-29T19:30:00"],
    "generatedJson": {"success": true, "eventData": {"summary": "Parsed Event", "dtstart": "2026-05-29T19:30:00"}}
  }
}
JSON);

        $store = new ProcessedRecordStore($this->dir);
        $records = $store->listRecords();
        $record = $store->readRecord('2026-05-01.12.00.00-message-Test.json');

        $this->assertCount(1, $records);
        $this->assertSame('https://example.test/event', $records[0]['downloadedUrl']);
        $this->assertSame('Parsed Event', $records[0]['parsedTitle']);
        $this->assertSame(['2026-05-29T19:30:00'], $records[0]['parsedDates']);
        $this->assertNotNull($record);
        $this->assertSame("BEGIN:VCALENDAR\nEND:VCALENDAR", $record->ics);
        $this->assertSame('<html></html>', $record->downloadedContent);
    }

    public function testDebugViewIsDisabledByDefaultAndRendersRecordTableWhenEnabled(): void
    {
        $this->assertFalse(ProcessedDebugView::isEnabled([]));
        $this->assertTrue(ProcessedDebugView::isEnabled(['DEBUG_PROCESSED_VIEW_ENABLED' => 'true']));

        file_put_contents($this->dir . '/2026-05-01.12.00.00-message-Test.json', json_encode([
            '2026-05-01 12:00:00' => [
                'status' => 'success',
                'downloadedUrl' => 'https://example.test/event',
                'pageTitle' => 'Example Page',
                'parsedTitle' => 'Parsed Event',
                'parsedDates' => ['2026-05-29T19:30:00'],
            ],
        ], JSON_PRETTY_PRINT));

        $html = (new ProcessedDebugView(new ProcessedRecordStore($this->dir)))->renderIndex();

        $this->assertStringContainsString('Processed Debug', $html);
        $this->assertStringContainsString('https://example.test/event', $html);
        $this->assertStringContainsString('Parsed Event', $html);
    }

    public function testProcessedStoreReadsGzipAndEnforcesMaxSize(): void
    {
        $old = $this->dir . '/2026-05-01.10.00.00-old-Test.json.gz';
        $new = $this->dir . '/2026-05-01.11.00.00-new-Test.json.gz';

        file_put_contents($old, gzencode(json_encode([
            '2026-05-01 10:00:00' => ['status' => 'success', 'parsedTitle' => 'Old Event'],
        ], JSON_PRETTY_PRINT)));
        file_put_contents($new, gzencode(json_encode([
            '2026-05-01 11:00:00' => ['status' => 'success', 'parsedTitle' => 'New Event'],
        ], JSON_PRETTY_PRINT)));
        touch($old, time() - 100);
        touch($new, time());

        $store = new ProcessedRecordStore($this->dir);
        $this->assertSame(100 * 1024 * 1024, ProcessedRecordStore::parseSizeToBytes('100M'));
        $this->assertSame('New Event', $store->listRecords()[0]['parsedTitle']);

        $store->enforceMaxSize(filesize($new) + 1);

        $this->assertFileDoesNotExist($old);
        $this->assertFileExists($new);
    }
}
