<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Processed;

final class ProcessedRecordStore
{
    public function __construct(private readonly string $directory)
    {
    }

    public function directory(): string
    {
        return $this->directory;
    }

    public static function parseSizeToBytes(string|int $size): int
    {
        if (is_int($size)) {
            return max(0, $size);
        }

        $size = trim($size);
        if ($size === '') {
            return 0;
        }

        if (!preg_match('/^(\d+(?:\.\d+)?)\s*([kmgt]?b?|)$/i', $size, $matches)) {
            return (int)$size;
        }

        $value = (float)$matches[1];
        $unit = strtolower($matches[2] ?: 'b');
        $multipliers = [
            'b' => 1,
            'k' => 1024,
            'kb' => 1024,
            'm' => 1024 ** 2,
            'mb' => 1024 ** 2,
            'g' => 1024 ** 3,
            'gb' => 1024 ** 3,
            't' => 1024 ** 4,
            'tb' => 1024 ** 4,
        ];

        return (int)round($value * ($multipliers[$unit] ?? 1));
    }

    public function enforceMaxSize(string|int $maxSize): void
    {
        $maxBytes = self::parseSizeToBytes($maxSize);
        if ($maxBytes <= 0 || !is_dir($this->directory)) {
            return;
        }

        $files = array_map(
            static fn(string $path): array => [
                'path' => $path,
                'size' => filesize($path) ?: 0,
                'mtime' => filemtime($path) ?: 0,
            ],
            $this->files()
        );

        $total = array_sum(array_column($files, 'size'));
        if ($total <= $maxBytes) {
            return;
        }

        usort($files, static fn(array $a, array $b): int => ($a['mtime'] ?? 0) <=> ($b['mtime'] ?? 0));
        foreach ($files as $file) {
            if ($total <= $maxBytes) {
                break;
            }

            if (@unlink($file['path'])) {
                $total -= $file['size'];
            }
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listRecords(): array
    {
        $records = [];
        foreach ($this->files() as $path) {
            $id = $this->idFromPath($path);
            $data = $this->readDataByPath($path);
            $attempt = $this->latestAttempt($data);
            $records[] = array_merge([
                'id' => $id,
                'filename' => basename($path),
                'createdAt' => $this->createdAtFromPath($path),
                'status' => $attempt['status'] ?? null,
                'downloadedUrl' => $attempt['downloadedUrl'] ?? $this->extractUrlFromDecoded($attempt['emailHtml'] ?? null),
                'pageTitle' => $attempt['pageTitle'] ?? null,
                'parsedTitle' => $attempt['parsedTitle'] ?? $this->extractParsedTitle($attempt),
                'parsedDates' => $attempt['parsedDates'] ?? $this->extractParsedDates($attempt),
            ], ['mtime' => filemtime($path) ?: 0]);
        }

        usort($records, static fn(array $a, array $b): int => ($b['mtime'] ?? 0) <=> ($a['mtime'] ?? 0));

        return $records;
    }

    public function readRecord(string $id): ?ProcessedRecord
    {
        $path = $this->pathForId($id);
        if ($path === null) {
            return null;
        }

        $raw = $this->readRaw($path);
        $normalized = $this->normalizeLegacyJson($raw);
        $data = json_decode($normalized, true);
        if (!is_array($data)) {
            $data = [];
        }

        $attempt = $this->latestAttempt($data);

        return new ProcessedRecord(
            id: $this->idFromPath($path),
            path: $path,
            rawJson: $raw,
            normalizedJson: json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: $normalized,
            data: $data,
            latestAttempt: $attempt,
            downloadedContent: $this->decodeNullable($attempt['downloadedContent'] ?? null),
            emailHtml: $this->decodeNullable($attempt['emailHtml'] ?? null),
            pdfText: $this->decodeNullable($attempt['pdfText'] ?? null),
            screenshotBase64: $attempt['screenshot'] ?? null,
            generatedJson: $attempt['generatedJson'] ?? null,
            ics: $attempt['icsData'] ?? null,
        );
    }

    /**
     * @return string[]
     */
    private function files(): array
    {
        if (!is_dir($this->directory)) {
            return [];
        }

        return array_values(array_filter(array_merge(
            glob($this->directory . '/*.json') ?: [],
            glob($this->directory . '/*.json.gz') ?: [],
        ), 'is_file'));
    }

    private function pathForId(string $id): ?string
    {
        $safe = basename($id);
        foreach ($this->files() as $path) {
            if ($this->idFromPath($path) === $safe) {
                return $path;
            }
        }

        return null;
    }

    private function readDataByPath(string $path): array
    {
        $normalized = $this->normalizeLegacyJson($this->readRaw($path));
        $data = json_decode($normalized, true);

        return is_array($data) ? $data : [];
    }

    private function readRaw(string $path): string
    {
        if (str_ends_with($path, '.gz')) {
            $content = gzdecode(file_get_contents($path) ?: '');
            return $content === false ? '' : $content;
        }

        return file_get_contents($path) ?: '';
    }

    private function normalizeLegacyJson(string $raw): string
    {
        return preg_replace_callback(
            '/"icsData":\s*`(.*?)`/s',
            static fn(array $matches): string => '"icsData": ' . json_encode(trim($matches[1]), JSON_UNESCAPED_SLASHES),
            $raw
        ) ?? $raw;
    }

    private function latestAttempt(array $data): array
    {
        if ($data === []) {
            return [];
        }

        ksort($data);
        $latest = end($data);

        return is_array($latest) ? $latest : [];
    }

    private function idFromPath(string $path): string
    {
        $base = basename($path);
        return str_ends_with($base, '.json.gz') ? substr($base, 0, -3) : $base;
    }

    private function createdAtFromPath(string $path): ?string
    {
        if (preg_match('/^(\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2})-/', basename($path), $matches)) {
            return str_replace('.', ':', preg_replace('/^(\d{4}-\d{2}-\d{2})\./', '$1 ', $matches[1]));
        }

        return null;
    }

    private function decodeNullable(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $decoded = base64_decode($value, true);
        return $decoded === false ? $value : $decoded;
    }

    private function extractUrlFromDecoded(?string $encoded): ?string
    {
        $decoded = $this->decodeNullable($encoded);
        if ($decoded !== null && preg_match('/https?:\/\/\S+/i', $decoded, $matches)) {
            return rtrim($matches[0], " \t\n\r\0\x0B<br/>");
        }

        return null;
    }

    private function extractParsedTitle(array $attempt): ?string
    {
        $event = $this->firstEvent($attempt['generatedJson']['eventData'] ?? null);
        return is_array($event) ? ($event['summary'] ?? null) : null;
    }

    /**
     * @return string[]
     */
    private function extractParsedDates(array $attempt): array
    {
        $eventData = $attempt['generatedJson']['eventData'] ?? null;
        if (!is_array($eventData)) {
            return [];
        }

        $events = isset($eventData[0]) && is_array($eventData[0]) ? $eventData : [$eventData];
        return array_values(array_filter(array_map(
            static fn(array $event): ?string => $event['dtstart'] ?? null,
            $events
        )));
    }

    private function firstEvent(mixed $eventData): ?array
    {
        if (!is_array($eventData)) {
            return null;
        }

        return isset($eventData[0]) && is_array($eventData[0]) ? $eventData[0] : $eventData;
    }
}
