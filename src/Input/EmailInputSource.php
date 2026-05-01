<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class EmailInputSource
{
    private function bodyTextForDirectives(string $textBody, string $htmlBody): string
    {
        if ($htmlBody === '') {
            return $textBody;
        }

        $htmlText = preg_replace('/<br\s*\/?>/i', "\n", $htmlBody) ?? $htmlBody;
        $htmlText = html_entity_decode(strip_tags($htmlText), ENT_QUOTES | ENT_HTML5);

        return trim($textBody . "\n" . $htmlText);
    }

    private function cleanDirectiveLine(string $line): string
    {
        if (str_starts_with($line, "\xEF\xBB\xBF")) {
            $line = substr($line, 3);
        }
        $line = html_entity_decode(strip_tags($line), ENT_QUOTES | ENT_HTML5);

        return trim($line);
    }

    private function normalizeUrlCandidate(string $candidate): ?string
    {
        $candidate = $this->cleanDirectiveLine($candidate);
        $candidate = trim($candidate, " \t\n\r\0\x0B<>\"'");
        $candidate = preg_replace('/[),.;:]+$/', '', $candidate) ?? $candidate;

        if (str_ends_with($candidate, '?')) {
            $candidate = substr($candidate, 0, -1);
        }

        return filter_var($candidate, FILTER_VALIDATE_URL) ? $candidate : null;
    }

    /**
     * @return array{0: string, 1: ?string}
     */
    private function splitSeparatedInstructions(string $directiveText): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $directiveText);

        if (preg_match('/\A(?<prefix>.*?(?:https?:\/\/\S+|URL\s*:).*?)\s+-{2,}\s+(?<instructions>.*)\z/is', $normalized, $matches)) {
            $instructions = trim($matches['instructions']);
            if ($instructions !== '') {
                return [
                    $matches['prefix'],
                    $instructions,
                ];
            }
        }

        return [$directiveText, null];
    }


    /**
     * @param array<string, mixed> $postmarkBody
     * @return array{url: ?string, instructions: ?string, hasMultiFlag: bool, textBody: string, htmlBody: string}
     */
    public function parsePostmarkDirectives(array $postmarkBody): array
    {
        $originalHtmlBody = (string)($postmarkBody['HtmlBody'] ?? '');
        $htmlBody = $originalHtmlBody;
        $textBody = (string)($postmarkBody['TextBody'] ?? '');

        if ($htmlBody === '' && $textBody !== '') {
            $htmlBody = nl2br(htmlspecialchars($textBody));
        }

        $url = null;
        $instructions = null;
        $hasMultiFlag = false;
        $directiveText = $this->bodyTextForDirectives($textBody, $originalHtmlBody);
        [$directiveText, $separatedInstructions] = $this->splitSeparatedInstructions($directiveText);

        foreach (explode("\n", $directiveText) as $line) {
            $trimmed = $this->cleanDirectiveLine($line);
            if (preg_match('/^URL:\s*(.+)$/i', $trimmed, $matches)) {
                $url = $this->normalizeUrlCandidate($matches[1]) ?? trim($matches[1]);
                continue;
            }

            if (preg_match('/^Instructions:\s*(.+)$/i', $trimmed, $matches)) {
                $instructions = trim($matches[1]);
                continue;
            }

            if (strcasecmp($trimmed, 'MULTI') === 0) {
                $hasMultiFlag = true;
                continue;
            }

            if ($url === null) {
                $url = $this->normalizeUrlCandidate($trimmed);
            }
        }

        if ($separatedInstructions !== null) {
            $instructions = $separatedInstructions;
        }

        if ($url === null) {
            $url = $this->normalizeUrlCandidate($directiveText);
        }

        return [
            'url' => $url,
            'instructions' => $instructions,
            'hasMultiFlag' => $hasMultiFlag,
            'textBody' => $textBody,
            'htmlBody' => $htmlBody,
        ];
    }
}
