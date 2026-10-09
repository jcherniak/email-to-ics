<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Input\CliInputSource;
use Jcherniak\EmailToIcs\Input\ProcessingInput;
use Jcherniak\EmailToIcs\Web\BackgroundJobLauncher;
use PHPUnit\Framework\TestCase;

final class BackgroundJobLauncherTest extends TestCase
{
    private string $jobDir;

    protected function setUp(): void
    {
        $this->jobDir = sys_get_temp_dir() . '/email-to-ics-jobs-test-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->jobDir . '/*') ?: [] as $file) {
            unlink($file);
        }
        if (is_dir($this->jobDir)) {
            rmdir($this->jobDir);
        }
    }

    public function testPrepareBuildsDetachedCliCommandWithHtmlFile(): void
    {
        $launcher = new BackgroundJobLauncher('/srv/app', $this->jobDir, '/usr/bin/php');
        $job = $launcher->prepare(new ProcessingInput(
            url: 'https://example.test/event?a=1',
            downloadedText: '<html><body>It\'s on</body></html>',
            display: 'dataurl',
            tentative: false,
            instructions: 'Focus on the 7pm show',
            requestedModel: '~openai/gpt-sol-latest',
            allowMultiDay: true,
        ));

        $cmd = $job['command'];
        $this->assertStringStartsWith("cd '/srv/app' && nohup '/usr/bin/php' '/srv/app/index.php' ", $cmd);
        $this->assertStringContainsString("'--display=email'", $cmd);
        $this->assertStringContainsString("'--tentative=0'", $cmd);
        $this->assertStringContainsString("'--url=https://example.test/event?a=1'", $cmd);
        $this->assertStringContainsString("'--instructions=Focus on the 7pm show'", $cmd);
        $this->assertStringContainsString("'--model=~openai/gpt-sol-latest'", $cmd);
        $this->assertStringContainsString("'--multiday=1'", $cmd);
        $this->assertStringEndsWith(" > " . escapeshellarg($job['logFile']) . " 2>&1 &", $cmd);

        // HTML goes through a file so argv limits are never hit, and shell quoting is applied.
        $htmlFile = $this->jobDir . '/' . $job['jobId'] . '.html';
        $this->assertFileExists($htmlFile);
        $this->assertSame('<html><body>It\'s on</body></html>', file_get_contents($htmlFile));
        $this->assertStringContainsString(escapeshellarg('--html-file=' . $htmlFile), $cmd);
        $this->assertStringNotContainsString("It's on", $cmd);
    }

    public function testPrepareOmitsEmptyOptionalArguments(): void
    {
        $launcher = new BackgroundJobLauncher('/srv/app', $this->jobDir);
        $job = $launcher->prepare(new ProcessingInput(url: 'https://example.test/'));

        $this->assertStringContainsString("'--tentative=1'", $job['command']);
        $this->assertStringNotContainsString('--html-file', $job['command']);
        $this->assertStringNotContainsString('--instructions', $job['command']);
        $this->assertStringNotContainsString('--model', $job['command']);
        $this->assertStringNotContainsString('--multiday', $job['command']);
        $this->assertSame([], glob($this->jobDir . '/*.html') ?: []);
    }

    public function testPrepareRejectsEmptyInput(): void
    {
        $launcher = new BackgroundJobLauncher('/srv/app', $this->jobDir);

        $this->expectException(RuntimeException::class);
        $launcher->prepare(new ProcessingInput(url: '  ', downloadedText: ''));
    }

    public function testCliInputSourceReadsMultidayFlag(): void
    {
        $this->assertTrue((new CliInputSource(['url' => 'x', 'multiday' => '1']))->toProcessingInput()->allowMultiDay);
        $this->assertTrue((new CliInputSource(['url' => 'x', 'multiday' => 'true']))->toProcessingInput()->allowMultiDay);
        $this->assertFalse((new CliInputSource(['url' => 'x', 'multiday' => '0']))->toProcessingInput()->allowMultiDay);
        $this->assertFalse((new CliInputSource(['url' => 'x']))->toProcessingInput()->allowMultiDay);
    }
}
