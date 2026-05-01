<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Config\Environment;
use PHPUnit\Framework\TestCase;

final class EnvironmentPrecedenceTest extends TestCase
{
    public function testProcessEnvironmentOverridesDotenvInEnvAndServerGlobals(): void
    {
        $key = 'EMAIL_TO_ICS_PRECEDENCE_TEST_' . bin2hex(random_bytes(4));
        $dir = sys_get_temp_dir() . '/email-to-ics-env-' . bin2hex(random_bytes(4));
        mkdir($dir);
        file_put_contents($dir . '/.env', "{$key}=from-dotenv\n");

        $previousProcessValue = getenv($key);
        $previousEnvValue = $_ENV[$key] ?? null;
        $previousServerValue = $_SERVER[$key] ?? null;

        try {
            putenv("{$key}=from-process");
            unset($_ENV[$key], $_SERVER[$key]);

            Environment::load($dir);

            $this->assertSame('from-process', getenv($key));
            $this->assertSame('from-process', $_ENV[$key]);
            $this->assertSame('from-process', $_SERVER[$key]);
            $this->assertSame('from-process', Environment::get($key));
        } finally {
            if ($previousProcessValue === false) {
                putenv($key);
            } else {
                putenv("{$key}={$previousProcessValue}");
            }

            if ($previousEnvValue === null) {
                unset($_ENV[$key]);
            } else {
                $_ENV[$key] = $previousEnvValue;
            }

            if ($previousServerValue === null) {
                unset($_SERVER[$key]);
            } else {
                $_SERVER[$key] = $previousServerValue;
            }

            @unlink($dir . '/.env');
            @rmdir($dir);
        }
    }
}
