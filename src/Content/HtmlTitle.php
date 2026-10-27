<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Content;

final class HtmlTitle
{
    public static function extract(?string $html): ?string
    {
        if ($html === null || $html === '') {
            return null;
        }

        foreach (['/<title[^>]*>(.*?)<\/title>/is', '/<h1[^>]*>(.*?)<\/h1>/is'] as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $title = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5));
                $title = preg_replace('/\s+/', ' ', $title) ?? $title;
                if ($title !== '') {
                    return $title;
                }
            }
        }

        return null;
    }
}
