<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * Body of every outgoing calendar email: source URL line, a machine-readable [source-url: ...]
 * marker (so a reply still carries the URL when server state is gone), the source data block, and
 * the cleaned source page.
 */
final class CalendarEmailBody
{
    public const MARKER_PREFIX = '[source-url: ';
    public const MARKER_SUFFIX = ']';

    public static function sourceUrlLine(?string $sourceUrl): string
    {
        $sourceUrl = trim((string)$sourceUrl);
        if ($sourceUrl === '') {
            return '<p>Source URL: (none)</p>';
        }

        $escapedUrl = htmlspecialchars($sourceUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<p>Source URL: <a href="' . $escapedUrl . '">' . $escapedUrl . '</a></p>';
    }

    public static function markerLine(?string $sourceUrl): string
    {
        $sourceUrl = trim((string)$sourceUrl);
        if ($sourceUrl === '') {
            return '';
        }

        $escapedUrl = htmlspecialchars($sourceUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<p class="ics-source-marker">' . self::MARKER_PREFIX . $escapedUrl . self::MARKER_SUFFIX . '</p>';
    }

    public static function build(?string $sourceUrl, string $sourceLabel, string $sourceDataHtml, ?string $downloadedText = null): string
    {
        $sourceLabel = htmlspecialchars($sourceLabel, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $sourceDataHtml = str_replace("\xEF\xBB\xBF", '', $sourceDataHtml);
        $htmlBody = self::sourceUrlLine($sourceUrl);
        $marker = self::markerLine($sourceUrl);
        if ($marker !== '') {
            $htmlBody .= "\n" . $marker;
        }
        $htmlBody .= "\n\n<p>-----Source data ({$sourceLabel})-----</p>\n<div>{$sourceDataHtml}</div>";

        if (!empty($downloadedText)) {
            $downloadedText = self::sanitize($downloadedText);
            $htmlBody .= "\n\n<p>-----Source page (cleaned)-----</p>\n<div>\n\t{$downloadedText}\n</div>";
        }

        return $htmlBody;
    }

    public static function sanitize(string $html): string
    {
        $config = (new HtmlSanitizerConfig())
            ->allowSafeElements()
            ->allowStaticElements()
            ->allowElement('div')
            ->allowElement('a', ['href', 'title'])
            ->allowElement('span', '*')
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->allowLinkSchemes(['https', 'http', 'mailto']);

        return (new HtmlSanitizer($config))->sanitizeFor('div', $html);
    }
}
