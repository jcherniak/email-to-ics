<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Web;

use Jcherniak\EmailToIcs\Input\ProcessingInput;
use RuntimeException;

/**
 * Runs a web form submission as a detached CLI process so the HTTP request can
 * return immediately (used by iOS Shortcuts via async=1). The CLI run emails
 * the resulting ICS, so this only supports the email display mode.
 */
final class BackgroundJobLauncher
{
    public function __construct(
        private readonly string $projectRoot,
        private readonly string $jobDir,
        private readonly string $phpBinary = '/usr/bin/php',
    ) {
    }

    /**
     * @return array{jobId: string, command: string, logFile: string}
     */
    public function prepare(ProcessingInput $input): array
    {
        if (trim($input->url) === '' && trim($input->downloadedText) === '' && trim((string)$input->instructions) === '') {
            throw new RuntimeException('Please provide a URL, HTML content, or Instructions.');
        }

        if (!is_dir($this->jobDir) && !mkdir($this->jobDir, 0700, true) && !is_dir($this->jobDir)) {
            throw new RuntimeException('Could not create background job directory.');
        }

        $jobId = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $logFile = $this->jobDir . '/' . $jobId . '.log';

        $args = [
            '--display=email',
            '--tentative=' . ($input->tentative ? '1' : '0'),
        ];
        if (trim($input->url) !== '') {
            $args[] = '--url=' . $input->url;
        }
        if (trim($input->downloadedText) !== '') {
            // argv entries are capped at 128 KiB on Linux, so large pages go via a file.
            $htmlFile = $this->jobDir . '/' . $jobId . '.html';
            if (file_put_contents($htmlFile, $input->downloadedText) === false) {
                throw new RuntimeException('Could not write HTML for background job.');
            }
            $args[] = '--html-file=' . $htmlFile;
        }
        if ($input->instructions !== null && trim($input->instructions) !== '') {
            $args[] = '--instructions=' . $input->instructions;
        }
        if ($input->requestedModel !== null && $input->requestedModel !== '') {
            $args[] = '--model=' . $input->requestedModel;
        }
        if ($input->allowMultiDay) {
            $args[] = '--multiday=1';
        }

        $command = sprintf(
            'cd %s && nohup %s %s %s > %s 2>&1 &',
            escapeshellarg($this->projectRoot),
            escapeshellarg($this->phpBinary),
            escapeshellarg($this->projectRoot . '/index.php'),
            implode(' ', array_map('escapeshellarg', $args)),
            escapeshellarg($logFile)
        );

        return ['jobId' => $jobId, 'command' => $command, 'logFile' => $logFile];
    }

    public function launch(ProcessingInput $input): string
    {
        $job = $this->prepare($input);
        exec($job['command']);
        return $job['jobId'];
    }
}
