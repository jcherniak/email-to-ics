<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;

/**
 * Gzipped JSON files named <key>.json.gz under the candidates directory.
 */
final class CandidateStore
{
    public const KEY_PATTERN = '/^[a-f0-9]{32}$/';

    public function __construct(
        private readonly string $directory,
        private readonly int $ttlSeconds = 30 * 24 * 3600,
        private readonly string|int $maxSize = '50M',
    ) {
    }

    public static function fromEnvironment(string $projectRoot, array $env = null): self
    {
        $env ??= $_ENV;
        $dir = trim((string)($env['CANDIDATES_DIR'] ?? ''));
        if ($dir === '') {
            $dir = rtrim($projectRoot, '/') . '/candidates';
        }
        $days = (float)($env['CANDIDATE_TTL_DAYS'] ?? 30);
        $ttl = (int)round(($days > 0 ? $days : 30) * 24 * 3600);

        return new self($dir, $ttl, (string)($env['MAX_CANDIDATES_DIR_SIZE'] ?? '50M'));
    }

    public function directory(): string
    {
        return $this->directory;
    }

    public function ttlSeconds(): int
    {
        return $this->ttlSeconds;
    }

    public function newKey(): string
    {
        return bin2hex(random_bytes(16));
    }

    public static function isValidKey(?string $key): bool
    {
        return $key !== null && preg_match(self::KEY_PATTERN, $key) === 1;
    }

    public function expiresAtFor(?int $now = null): string
    {
        return date('c', ($now ?? time()) + $this->ttlSeconds);
    }

    public function save(CandidateSet $set): void
    {
        if (!self::isValidKey($set->key)) {
            throw new \InvalidArgumentException('Candidate set key is not a 32-hex string');
        }
        if (!is_dir($this->directory) && !@mkdir($this->directory, 0770, true) && !is_dir($this->directory)) {
            throw new \RuntimeException("Cannot create candidates directory {$this->directory}");
        }

        $json = json_encode($set->toArray(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new \RuntimeException('Cannot encode candidate set: ' . json_last_error_msg());
        }
        $bytes = gzencode($json, 6);
        if ($bytes === false || file_put_contents($this->pathFor($set->key), $bytes, LOCK_EX) === false) {
            throw new \RuntimeException("Cannot write candidate set {$set->key}");
        }
    }

    public function load(?string $key, ?int $now = null): ?CandidateSet
    {
        if (!self::isValidKey($key)) {
            return null;
        }

        $path = $this->pathFor((string)$key);
        if (!is_file($path)) {
            return null;
        }

        $raw = gzdecode((string)file_get_contents($path));
        $data = $raw === false ? null : json_decode($raw, true);
        if (!is_array($data)) {
            @unlink($path);
            return null;
        }

        $set = CandidateSet::fromArray($data);
        if ($set->isExpired($now)) {
            @unlink($path);
            return null;
        }

        return $set;
    }

    public function exists(string $key): bool
    {
        return self::isValidKey($key) && is_file($this->pathFor($key));
    }

    public function delete(string $key): void
    {
        if (self::isValidKey($key)) {
            @unlink($this->pathFor($key));
        }
    }

    /** Removes expired sets, then trims the directory to its size cap (oldest first). */
    public function cleanup(?int $now = null): void
    {
        if (!is_dir($this->directory)) {
            return;
        }

        $now ??= time();
        foreach (glob($this->directory . '/*.json.gz') ?: [] as $path) {
            $mtime = filemtime($path) ?: $now;
            if ($mtime + $this->ttlSeconds <= $now) {
                @unlink($path);
            }
        }

        $maxBytes = ProcessedRecordStore::parseSizeToBytes($this->maxSize);
        if ($maxBytes <= 0) {
            return;
        }

        $files = [];
        foreach (glob($this->directory . '/*.json.gz') ?: [] as $path) {
            $files[] = ['path' => $path, 'size' => filesize($path) ?: 0, 'mtime' => filemtime($path) ?: 0];
        }
        $total = array_sum(array_column($files, 'size'));
        usort($files, static fn(array $a, array $b): int => $a['mtime'] <=> $b['mtime']);
        foreach ($files as $file) {
            if ($total <= $maxBytes) {
                break;
            }
            if (@unlink($file['path'])) {
                $total -= $file['size'];
            }
        }
    }

    private function pathFor(string $key): string
    {
        return $this->directory . '/' . $key . '.json.gz';
    }
}
