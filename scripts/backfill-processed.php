<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;

$processedDir = $argv[1] ?? (__DIR__ . '/../processed');
if (!is_dir($processedDir)) {
    fwrite(STDERR, "Processed directory not found: {$processedDir}\n");
    exit(1);
}

$files = array_values(array_filter(array_merge(
    glob($processedDir . '/*.json') ?: [],
    glob($processedDir . '/*.json.gz') ?: [],
), 'is_file'));

$updated = 0;
$compressed = 0;
$skipped = 0;

foreach ($files as $path) {
    $raw = readProcessedFile($path);
    $normalized = normalizeLegacyJson($raw);
    $data = trim($normalized) === '' ? [] : json_decode($normalized, true);
    if (!is_array($data)) {
        fwrite(STDERR, "Skipping invalid JSON: {$path}\n");
        $skipped++;
        continue;
    }

    $changed = $normalized !== $raw;
    foreach ($data as &$attempt) {
        if (!is_array($attempt)) {
            continue;
        }

        $before = $attempt;
        backfillAttempt($attempt);
        if ($attempt !== $before) {
            $changed = true;
        }
    }
    unset($attempt);

    $targetPath = str_ends_with($path, '.gz') ? $path : $path . '.gz';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        fwrite(STDERR, "Could not encode JSON: {$path}\n");
        $skipped++;
        continue;
    }

    if ($changed || $targetPath !== $path) {
        $encoded = gzencode($json, 6);
        if ($encoded === false) {
            fwrite(STDERR, "Could not gzip JSON: {$path}\n");
            $skipped++;
            continue;
        }

        $tmp = $targetPath . '.tmp';
        file_put_contents($tmp, $encoded, LOCK_EX);
        rename($tmp, $targetPath);

        if ($targetPath !== $path) {
            unlink($path);
            $compressed++;
        } else {
            $updated++;
        }
    }
}

echo json_encode([
    'processedDir' => realpath($processedDir) ?: $processedDir,
    'files' => count($files),
    'updated' => $updated,
    'compressed' => $compressed,
    'skipped' => $skipped,
    'maxSizeBytesDefault' => ProcessedRecordStore::parseSizeToBytes('100M'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

function readProcessedFile(string $path): string
{
    $content = file_get_contents($path) ?: '';
    if (str_ends_with($path, '.gz')) {
        $decoded = gzdecode($content);
        return $decoded === false ? '' : $decoded;
    }

    return $content;
}

function normalizeLegacyJson(string $raw): string
{
    return preg_replace_callback(
        '/"icsData":\s*`(.*?)`/s',
        static fn(array $matches): string => '"icsData": ' . json_encode(trim($matches[1]), JSON_UNESCAPED_SLASHES),
        $raw
    ) ?? $raw;
}

/**
 * @param array<string, mixed> $attempt
 */
function backfillAttempt(array &$attempt): void
{
    $decodedEmail = decodeNullable($attempt['emailHtml'] ?? null);
    $decodedDownloaded = decodeNullable($attempt['downloadedContent'] ?? null);
    $ics = is_string($attempt['icsData'] ?? null) ? $attempt['icsData'] : '';

    $attempt['downloadedUrl'] ??= extractUrl($decodedEmail) ?? extractUrl($decodedDownloaded) ?? extractUrl($ics);
    $attempt['pageTitle'] ??= extractPageTitle($decodedDownloaded) ?? extractPageTitle($decodedEmail);

    $generatedJson = $attempt['generatedJson'] ?? null;
    if (!is_array($generatedJson)) {
        $generatedJson = minimalGeneratedJsonFromIcs($ics);
        if ($generatedJson !== null) {
            $attempt['generatedJson'] = $generatedJson;
        }
    }

    $eventData = is_array($attempt['generatedJson'] ?? null) ? ($attempt['generatedJson']['eventData'] ?? null) : null;
    $events = eventDataItems($eventData);
    $attempt['parsedTitle'] ??= $events[0]['summary'] ?? extractIcsValue($ics, 'SUMMARY');
    $attempt['parsedDates'] ??= array_values(array_filter(array_map(
        static fn(array $event): ?string => $event['dtstart'] ?? null,
        $events
    ))) ?: extractIcsDates($ics);
}

function decodeNullable(mixed $value): ?string
{
    if (!is_string($value) || $value === '') {
        return null;
    }

    $decoded = base64_decode($value, true);
    return $decoded === false ? $value : $decoded;
}

function extractUrl(?string $text): ?string
{
    if ($text !== null && preg_match('/https?:\/\/[^\s<>"\']+/i', $text, $matches)) {
        return rtrim($matches[0], ".,;)");
    }

    return null;
}

function extractPageTitle(?string $html): ?string
{
    if ($html === null || $html === '') {
        return null;
    }

    foreach (['title', 'h1'] as $tag) {
        if (preg_match('/<' . $tag . '[^>]*>(.*?)<\/' . $tag . '>/is', $html, $matches)) {
            $title = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5));
            if ($title !== '') {
                return $title;
            }
        }
    }

    return null;
}

function minimalGeneratedJsonFromIcs(string $ics): ?array
{
    $summary = extractIcsValue($ics, 'SUMMARY');
    $dates = extractIcsDates($ics);
    if ($summary === null && $dates === []) {
        return null;
    }

    return [
        'success' => true,
        'eventData' => [
            'summary' => $summary,
            'dtstart' => $dates[0] ?? null,
        ],
    ];
}

function extractIcsValue(string $ics, string $field): ?string
{
    if (preg_match('/^' . preg_quote($field, '/') . '(?:;[^:]*)?:(.+)$/mi', $ics, $matches)) {
        return trim(str_replace('\\,', ',', $matches[1]));
    }

    return null;
}

/**
 * @return string[]
 */
function extractIcsDates(string $ics): array
{
    if (!preg_match_all('/^DTSTART(?:;[^:]*)?:(.+)$/mi', $ics, $matches)) {
        return [];
    }

    return array_values(array_map('trim', $matches[1]));
}

/**
 * @return array<int, array<string, mixed>>
 */
function eventDataItems(mixed $eventData): array
{
    if (!is_array($eventData)) {
        return [];
    }

    if (isset($eventData[0]) && is_array($eventData[0])) {
        return $eventData;
    }

    return [$eventData];
}
