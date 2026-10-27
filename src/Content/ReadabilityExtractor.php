<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Content;

use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Runs scripts/readability.mjs (Mozilla Readability + jsdom) through a node subprocess.
 * Any failure degrades to the lightened full page instead of an error.
 */
final class ReadabilityExtractor
{
    public const REASON_DISABLED = 'disabled';
    public const REASON_NODE_MISSING = 'node_missing';
    public const REASON_PROCESS_FAILED = 'process_failed';
    public const REASON_TIMEOUT = 'timeout';
    public const REASON_INVALID_JSON = 'invalid_json';
    public const REASON_TOO_SHORT = 'too_short';
    public const REASON_PLAIN_TEXT = 'plain_text';

    /** @var null|callable(array<int, string>, string, float): array{exitCode: int, stdout: string, stderr: string, timedOut: bool} */
    private $runner;

    public function __construct(
        private readonly ?string $nodeBinary = null,
        private readonly ?string $scriptPath = null,
        private readonly float $timeoutSeconds = 20.0,
        private readonly int $minTextLength = 200,
        ?callable $runner = null,
        private readonly bool $enabled = true,
    ) {
        $this->runner = $runner;
    }

    public static function fromEnvironment(array $env = null, ?string $projectRoot = null): self
    {
        $env ??= $_ENV;
        $projectRoot ??= dirname(__DIR__, 2);
        $node = trim((string)($env['READABILITY_NODE_BINARY'] ?? ''));
        $timeout = (float)($env['READABILITY_TIMEOUT'] ?? 20);
        $minLength = (int)($env['READABILITY_MIN_TEXT_LENGTH'] ?? 200);
        $enabledRaw = strtolower(trim((string)($env['READABILITY_ENABLED'] ?? '1')));
        $enabled = !in_array($enabledRaw, ['0', 'false', 'no', 'off'], true);

        return new self(
            $node !== '' ? $node : null,
            $projectRoot . '/scripts/readability.mjs',
            $timeout > 0 ? $timeout : 20.0,
            $minLength >= 0 ? $minLength : 200,
            null,
            $enabled,
        );
    }

    public function extract(string $html, ?string $url = null, string $contentType = 'html'): ExtractedContent
    {
        if ($contentType === 'text') {
            $text = trim(HtmlLightener::normalizeUtf8($html));
            $wrapped = '<pre>' . htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</pre>';
            return new ExtractedContent($wrapped, $wrapped, null, $text, ExtractedContent::METHOD_TEXT, self::REASON_PLAIN_TEXT);
        }

        $fullHtml = HtmlLightener::lighten($html);
        $fallbackTitle = HtmlTitle::extract($html);

        if (!$this->enabled) {
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_DISABLED);
        }

        $node = $this->resolveNodeBinary();
        if ($node === null) {
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_NODE_MISSING);
        }

        $script = $this->scriptPath ?? dirname(__DIR__, 2) . '/scripts/readability.mjs';
        if (!is_file($script)) {
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_NODE_MISSING);
        }

        try {
            $run = ($this->runner ?? [$this, 'runProcess'])([$node, $script, (string)$url], $html, $this->timeoutSeconds);
        } catch (\Throwable $e) {
            $this->log('Readability subprocess error: ' . $e->getMessage());
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_PROCESS_FAILED);
        }

        if ($run['timedOut'] ?? false) {
            $this->log("Readability timed out after {$this->timeoutSeconds}s");
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_TIMEOUT);
        }

        if (($run['exitCode'] ?? 1) !== 0) {
            $this->log('Readability exited with code ' . ($run['exitCode'] ?? '?') . ': ' . trim((string)($run['stderr'] ?? '')));
            $reason = ($run['exitCode'] ?? 1) === 127 ? self::REASON_NODE_MISSING : self::REASON_PROCESS_FAILED;
            return $this->fallback($fullHtml, $fallbackTitle, $reason);
        }

        $decoded = json_decode((string)($run['stdout'] ?? ''), true);
        if (!is_array($decoded)) {
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_INVALID_JSON);
        }

        $textContent = trim((string)($decoded['textContent'] ?? ''));
        $content = $decoded['content'] ?? null;
        if (!is_string($content) || trim($content) === '' || strlen($textContent) < $this->minTextLength) {
            $this->log('Readability output too short (' . strlen($textContent) . " chars < {$this->minTextLength}); using full page");
            return $this->fallback($fullHtml, $fallbackTitle, self::REASON_TOO_SHORT);
        }

        $title = isset($decoded['title']) && is_string($decoded['title']) && trim($decoded['title']) !== ''
            ? trim($decoded['title'])
            : $fallbackTitle;

        $this->log('Readability extracted ' . strlen($content) . ' bytes of HTML (' . strlen($textContent) . ' text chars) from ' . strlen($html) . ' bytes');

        return new ExtractedContent(HtmlLightener::normalizeUtf8($content), $fullHtml, $title, $textContent, ExtractedContent::METHOD_READABILITY);
    }

    private function fallback(string $fullHtml, ?string $title, string $reason): ExtractedContent
    {
        $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($fullHtml), ENT_QUOTES | ENT_HTML5)) ?? '');

        return new ExtractedContent(null, $fullHtml, $title, $text, ExtractedContent::METHOD_FALLBACK, $reason);
    }

    private function resolveNodeBinary(): ?string
    {
        if ($this->nodeBinary !== null && $this->nodeBinary !== '') {
            if (str_contains($this->nodeBinary, '/')) {
                return is_executable($this->nodeBinary) ? $this->nodeBinary : null;
            }

            return (new ExecutableFinder())->find($this->nodeBinary);
        }

        return (new ExecutableFinder())->find('node');
    }

    /**
     * @param array<int, string> $command
     * @return array{exitCode: int, stdout: string, stderr: string, timedOut: bool}
     */
    private function runProcess(array $command, string $stdin, float $timeout): array
    {
        $process = new Process($command);
        $process->setInput($stdin);
        $process->setTimeout($timeout);

        try {
            $process->run();
        } catch (ProcessTimedOutException $e) {
            return ['exitCode' => -1, 'stdout' => '', 'stderr' => $e->getMessage(), 'timedOut' => true];
        }

        return [
            'exitCode' => (int)$process->getExitCode(),
            'stdout' => $process->getOutput(),
            'stderr' => $process->getErrorOutput(),
            'timedOut' => false,
        ];
    }

    private function log(string $message): void
    {
        if (function_exists('errlog')) {
            errlog($message);
        }
    }
}
