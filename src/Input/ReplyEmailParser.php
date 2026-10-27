<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

/**
 * Understands a reply to one of our calendar emails: which edit key it was sent to, what the
 * user wrote above the quote, and the source URL carried inside the quoted original
 * (the "[source-url: ...]" marker line) for when the server-side state is gone.
 */
final class ReplyEmailParser
{
    public const KEY_PATTERN = '/edit-([a-f0-9]{32})@/i';
    public const MAX_QUOTED_TEXT = 8000;

    /**
     * @param array<string, mixed> $postmarkBody
     */
    public static function parse(array $postmarkBody): ParsedReply
    {
        $textBody = (string)($postmarkBody['TextBody'] ?? '');
        $htmlBody = (string)($postmarkBody['HtmlBody'] ?? '');
        $split = self::splitReply($textBody, $htmlBody);

        $newText = trim((string)($postmarkBody['StrippedTextReply'] ?? ''));
        if ($newText === '') {
            $newText = $split['new'];
        }

        [$instructions, $modelOverride] = self::splitModelOverride($newText);
        $multiRequested = EmailInputSource::containsMultipleToken($instructions) || preg_match('/\bMULTI\b/', $instructions) === 1;

        return new ParsedReply(
            self::findEditKey($postmarkBody),
            trim($instructions),
            self::extractQuotedSourceUrl($split['quoted'], $htmlBody),
            $modelOverride,
            $multiRequested,
            self::truncate($split['quoted'], self::MAX_QUOTED_TEXT),
        );
    }

    /**
     * @param array<string, mixed> $postmarkBody
     */
    public static function findEditKey(array $postmarkBody): ?string
    {
        $addresses = [];
        foreach (['ToFull', 'CcFull', 'BccFull'] as $field) {
            foreach ((array)($postmarkBody[$field] ?? []) as $entry) {
                if (is_array($entry) && isset($entry['Email'])) {
                    $addresses[] = (string)$entry['Email'];
                }
            }
        }
        foreach (['OriginalRecipient', 'To', 'Cc', 'Bcc'] as $field) {
            if (!empty($postmarkBody[$field]) && is_string($postmarkBody[$field])) {
                $addresses[] = $postmarkBody[$field];
            }
        }

        foreach ($addresses as $address) {
            if (preg_match(self::KEY_PATTERN, $address, $matches)) {
                return strtolower($matches[1]);
            }
        }

        return null;
    }

    /**
     * Splits the reply into the text the user wrote and the quoted original.
     *
     * @return array{new: string, quoted: string}
     */
    public static function splitReply(string $textBody, string $htmlBody): array
    {
        $text = str_replace(["\r\n", "\r"], "\n", $textBody);
        if (trim($text) === '' && trim($htmlBody) !== '') {
            return self::splitHtmlReply($htmlBody);
        }

        $patterns = [
            '/^[ \t]*>/m',
            '/^[ \t]*On\b[^\n]{0,300}?(?:\n[^\n]{0,300}?)?\bwrote:[ \t]*$/m',
            '/^[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/mi',
            '/^[ \t]*-{2,}[ \t]*Forwarded message[ \t]*-{2,}/mi',
            '/^[ \t]*From:[^\n]+\n(?:[^\n]*\n){0,3}?[ \t]*(?:Sent|Date):[ \t]/mi',
            '/^_{10,}[ \t]*$/m',
            '/^-- $/m',
        ];

        $cut = null;
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m, PREG_OFFSET_CAPTURE)) {
                $offset = $m[0][1];
                if ($cut === null || $offset < $cut) {
                    $cut = $offset;
                }
            }
        }

        if ($cut === null) {
            return ['new' => trim($text), 'quoted' => ''];
        }

        $quoted = substr($text, $cut);
        $quoted = preg_replace('/^[ \t]*(?:>[ \t]?)+/m', '', $quoted) ?? $quoted;

        return ['new' => trim(substr($text, 0, $cut)), 'quoted' => trim($quoted)];
    }

    /**
     * @return array{new: string, quoted: string}
     */
    private static function splitHtmlReply(string $htmlBody): array
    {
        $markers = [
            '/<blockquote\b/i',
            '/<div[^>]+class="[^"]*gmail_quote[^"]*"/i',
            '/<div[^>]+id="divRplyFwdMsg"/i',
            '/<div[^>]+id="appendonsend"/i',
            '/<hr\b[^>]*id="stopSpelling"/i',
        ];
        $cut = null;
        foreach ($markers as $pattern) {
            if (preg_match($pattern, $htmlBody, $m, PREG_OFFSET_CAPTURE)) {
                $offset = $m[0][1];
                if ($cut === null || $offset < $cut) {
                    $cut = $offset;
                }
            }
        }

        $toText = static function (string $html): string {
            $html = preg_replace('/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/i', "\n", $html) ?? $html;
            $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $text = preg_replace('/[ \t]+\n/', "\n", $text) ?? $text;
            $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

            return trim($text);
        };

        if ($cut === null) {
            return ['new' => $toText($htmlBody), 'quoted' => ''];
        }

        return ['new' => $toText(substr($htmlBody, 0, $cut)), 'quoted' => $toText(substr($htmlBody, $cut))];
    }

    /**
     * Source URL from the quoted original: the [source-url: ...] marker (text, then HTML), the
     * link after "Source URL:", or a bare URL after "Source URL:".
     */
    public static function extractQuotedSourceUrl(string $quotedText, string $htmlBody): ?string
    {
        $normalizedQuote = preg_replace('/^[ \t]*(?:>[ \t]?)+/m', '', str_replace(["\r\n", "\r"], "\n", $quotedText)) ?? $quotedText;

        $candidates = [];
        if (preg_match('/\[\s*source-url:\s*(.+?)\s*\]/is', $normalizedQuote, $m)) {
            $candidates[] = preg_replace('/\s+/', '', $m[1]);
        }

        $htmlText = html_entity_decode(strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody) ?? $htmlBody), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (preg_match('/\[\s*source-url:\s*(.+?)\s*\]/is', $htmlText, $m)) {
            $candidates[] = preg_replace('/\s+/', '', $m[1]);
        }

        if (preg_match('/Source URL:[^<]{0,40}<a\s[^>]*href="([^"]+)"/i', $htmlBody, $m)) {
            $candidates[] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        if (preg_match('/Source URL:\s*(https?:\/\/\S+)/i', $normalizedQuote, $m)) {
            $candidates[] = rtrim($m[1], '.,;)>');
        }

        foreach ($candidates as $candidate) {
            $candidate = trim((string)$candidate, " \t\n\r\0\x0B<>\"'");
            if ($candidate !== '' && filter_var($candidate, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @return array{0: string, 1: ?string} [text without the override line, model id]
     */
    public static function splitModelOverride(string $text): array
    {
        $model = null;
        $cleaned = preg_replace_callback('/^[ \t]*(?:--model|model:)[ \t]*(\S+)[ \t]*$/im', static function (array $m) use (&$model): string {
            $model ??= $m[1];
            return '';
        }, $text) ?? $text;

        return [trim($cleaned), $model];
    }

    private static function truncate(string $text, int $max): string
    {
        return strlen($text) > $max ? substr($text, 0, $max) . "\n[truncated]" : $text;
    }
}
