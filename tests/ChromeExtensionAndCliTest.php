<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class ChromeExtensionAndCliTest extends TestCase
{
    public function testChromeExtensionUsesSharedPromptPolicyFile(): void
    {
        $backendPolicy = __DIR__ . '/../prompt/system_prompt_policy.xml';
        $extensionPolicy = __DIR__ . '/../chrome-extension/system_prompt_policy.xml';

        $this->assertFileExists($backendPolicy);
        $this->assertFileExists($extensionPolicy);
        $this->assertSame(file_get_contents($backendPolicy), file_get_contents($extensionPolicy));
    }

    public function testChromeManifestExposesSharedPromptPolicy(): void
    {
        $manifest = file_get_contents(__DIR__ . '/../chrome-extension/manifest.json');

        $this->assertStringContainsString('system_prompt_policy.xml', $manifest);
    }

    public function testChromeEmailProcessorUsesPersonalEventCalendarMethod(): void
    {
        $script = file_get_contents(__DIR__ . '/../chrome-extension/email-processor.js');

        $this->assertStringContainsString('system_prompt_policy.xml', $script);
        $this->assertStringContainsString('METHOD:PUBLISH', $script);
        $this->assertStringNotContainsString('METHOD:REQUEST', $script);
        $this->assertStringNotContainsString('ORGANIZER:', $script);
    }

    public function testCliTestHarnessOptionsAreRegistered(): void
    {
        $index = file_get_contents(__DIR__ . '/../index.php');

        $this->assertStringContainsString('test-email-text', $index);
        $this->assertStringContainsString('test-email-file', $index);
        $this->assertStringContainsString('current-date', $index);
        $this->assertStringContainsString('test-seed', $index);
    }
}
