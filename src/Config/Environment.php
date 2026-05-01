<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Config;

use Dotenv\Dotenv;

final class Environment
{
    public static function load(string $directory): void
    {
        Dotenv::createImmutable($directory)->load();
        self::overlayProcessEnvironment();
    }

    public static function overlayProcessEnvironment(): void
    {
        $processEnvironment = getenv();
        if (!is_array($processEnvironment)) {
            return;
        }

        foreach ($processEnvironment as $key => $value) {
            if (!is_string($key) || !is_string($value)) {
                continue;
            }

            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $processValue = getenv($key);
        if (is_string($processValue)) {
            return $processValue;
        }

        return isset($_ENV[$key]) ? (string)$_ENV[$key] : $default;
    }
}
