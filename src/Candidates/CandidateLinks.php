<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

final class CandidateLinks
{
    public const ACTION_ALL = 'all';
    public const ACTION_ONE = 'one';
    public const ACTION_PICK = 'pick';
    public const ACTION_SEND = 'send';

    public static function baseUrl(array $env = null, array $server = null): string
    {
        $env ??= $_ENV;
        $server ??= $_SERVER;
        $base = trim((string)($env['PUBLIC_BASE_URL'] ?? ''));
        if ($base !== '') {
            return $base;
        }

        $host = (string)($server['HTTP_HOST'] ?? '');
        if ($host === '') {
            return '';
        }
        $https = !empty($server['HTTPS']) && $server['HTTPS'] !== 'off';
        $script = (string)($server['SCRIPT_NAME'] ?? '/');

        return ($https ? 'https://' : 'http://') . $host . $script;
    }

    public static function url(string $baseUrl, string $key, string $action, ?int $index = null): string
    {
        $base = $baseUrl === '' ? '/' : $baseUrl;
        $separator = str_contains($base, '?') ? '&' : '?';
        $query = ['candidates' => $key, 'action' => $action];
        if ($index !== null) {
            $query['idx'] = $index;
        }

        return $base . $separator . http_build_query($query);
    }
}
