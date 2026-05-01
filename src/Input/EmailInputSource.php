<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class EmailInputSource
{
    /**
     * @param array<string, mixed> $postmarkBody
     * @return array{url: ?string, instructions: ?string, hasMultiFlag: bool, textBody: string, htmlBody: string}
     */
    public function parsePostmarkDirectives(array $postmarkBody): array
    {
        $htmlBody = (string)($postmarkBody['HtmlBody'] ?? '');
        $textBody = (string)($postmarkBody['TextBody'] ?? '');

        if ($htmlBody === '' && $textBody !== '') {
            $htmlBody = nl2br(htmlspecialchars($textBody));
        }

        $url = null;
        $instructions = null;
        $hasMultiFlag = false;

        foreach (explode("\n", $textBody) as $line) {
            $trimmed = trim($line);
            if (preg_match('/^URL:\s*(.+)$/i', $trimmed, $matches)) {
                $url = trim($matches[1]);
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

            if ($url === null && filter_var($trimmed, FILTER_VALIDATE_URL)) {
                $url = $trimmed;
            }
        }

        if ($url === null && filter_var(trim($textBody), FILTER_VALIDATE_URL)) {
            $url = trim($textBody);
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
