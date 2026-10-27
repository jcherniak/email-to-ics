<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Content;

/**
 * Lossless-for-text reduction of a full HTML page: removes script/style/svg/iframe
 * blocks and comments that carry no event information but dominate token counts.
 * No truncation is applied.
 */
final class HtmlLightener
{
    private const BLOCK_TAGS = ['script', 'style', 'noscript', 'svg', 'iframe', 'template', 'canvas', 'video', 'audio', 'object', 'embed'];

    public static function lighten(string $html): string
    {
        $html = self::normalizeUtf8($html);
        $html = preg_replace('/<!--.*?-->/s', '', $html) ?? $html;

        foreach (self::BLOCK_TAGS as $tag) {
            $html = preg_replace('/<' . $tag . '\b[^>]*>.*?<\/' . $tag . '\s*>/is', '', $html) ?? $html;
        }

        // Self-closing or unclosed leftovers of the same tags.
        $html = preg_replace('/<(?:' . implode('|', self::BLOCK_TAGS) . ')\b[^>]*\/?>/i', '', $html) ?? $html;

        // Inline base64 blobs (images embedded as data URIs) are never useful to the model.
        $html = preg_replace('/(src|href)=(["\'])data:[^"\']{64,}\2/i', '$1=$2data:omitted$2', $html) ?? $html;

        $html = preg_replace('/[ \t]+\n/', "\n", $html) ?? $html;
        $html = preg_replace('/\n{3,}/', "\n\n", $html) ?? $html;

        return trim($html);
    }

    public static function normalizeUtf8(string $text): string
    {
        $encoding = mb_detect_encoding($text, mb_detect_order(), true);
        if ($encoding && $encoding !== 'UTF-8') {
            $text = mb_convert_encoding($text, 'UTF-8', $encoding);
        }

        return mb_convert_encoding($text, 'UTF-8', 'UTF-8');
    }
}
