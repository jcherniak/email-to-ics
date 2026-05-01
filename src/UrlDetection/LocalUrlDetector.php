<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\UrlDetection;

final class LocalUrlDetector implements UrlDetectorInterface
{
    public function detect(string $body): ?string
    {
        $text = $this->normalizeBody($body);

        foreach ($this->candidateUrls($text) as $candidate) {
            $url = $this->normalizeUrlCandidate($candidate);
            if ($url !== null) {
                return $url;
            }
        }

        return null;
    }

    private function normalizeBody(string $body): string
    {
        if (str_starts_with($body, "\xEF\xBB\xBF")) {
            $body = substr($body, 3);
        }

        $body = preg_replace('/<br\s*\/?>/i', "\n", $body) ?? $body;
        $body = html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5);

        return trim($body);
    }

    /**
     * @return list<string>
     */
    private function candidateUrls(string $body): array
    {
        $candidates = [];

        foreach (explode("\n", $body) as $line) {
            $line = trim($line);
            if (preg_match('/^URL:\s*(?<url>.+)$/i', $line, $matches)) {
                $candidates[] = $matches['url'];
            }
        }

        if (preg_match_all('~https?://[^\s<>"\']+~i', $body, $matches)) {
            array_push($candidates, ...$matches[0]);
        }

        return $candidates;
    }

    private function normalizeUrlCandidate(string $candidate): ?string
    {
        $candidate = html_entity_decode(strip_tags($candidate), ENT_QUOTES | ENT_HTML5);
        $candidate = trim($candidate, " \t\n\r\0\x0B<>\"'");
        $candidate = preg_replace('/[),.;:]+$/', '', $candidate) ?? $candidate;

        if (str_ends_with($candidate, '?')) {
            $candidate = substr($candidate, 0, -1);
        }

        return filter_var($candidate, FILTER_VALIDATE_URL) ? $candidate : null;
    }
}
