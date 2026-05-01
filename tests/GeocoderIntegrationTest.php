<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Config\Environment;
use Dotenv\Dotenv;
use Jcherniak\EmailToIcs\Geocode\ChainGeocoder;
use Jcherniak\EmailToIcs\Geocode\GooglePlacesGeocoder;
use Jcherniak\EmailToIcs\Geocode\MapboxGeocoder;
use PHPUnit\Framework\TestCase;

final class GeocoderIntegrationTest extends TestCase
{
    private const LOOKUP = 'Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129';

    /** @var array<string, array{key: string, available: bool, error: array<string, mixed>|null}> */
    private static array $providers = [];

    public static function setUpBeforeClass(): void
    {
        $realEnv = self::loadRealEnvironment();
        $requireIntegration = self::requiredProviderSetting($realEnv);

        self::$providers = [
            'mapbox' => self::probeProvider(
                'mapbox',
                self::realEnvValue('MAPBOX_API_KEY', $realEnv),
                new MapboxGeocoder(self::realEnvValue('MAPBOX_API_KEY', $realEnv)),
                self::providerIsRequired('mapbox', $requireIntegration)
            ),
            'google' => self::probeProvider(
                'google',
                self::realEnvValue('GOOGLE_MAPS_API_KEY', $realEnv),
                new GooglePlacesGeocoder(self::realEnvValue('GOOGLE_MAPS_API_KEY', $realEnv)),
                self::providerIsRequired('google', $requireIntegration)
            ),
        ];
    }

    public function testMapboxGeocoderResolvesPresidioWhenKeyIsValid(): void
    {
        $this->skipProviderIfUnavailable('mapbox');

        $geocoder = new MapboxGeocoder(self::$providers['mapbox']['key']);
        $result = $geocoder->geocode(self::LOOKUP);

        $this->assertNotNull($result, json_encode($geocoder->getLastError(), JSON_PRETTY_PRINT) ?: 'Mapbox geocoder returned no result.');
        $this->assertSame('mapbox', $result->provider);
        $this->assertStringContainsStringIgnoringCase('San Francisco', $result->formattedLocation);
        $this->assertStringContainsString('99', $result->formattedLocation);
    }

    public function testGoogleGeocoderResolvesPresidioWhenKeyIsValid(): void
    {
        $this->skipProviderIfUnavailable('google');

        $geocoder = new GooglePlacesGeocoder(self::$providers['google']['key']);
        $result = $geocoder->geocode(self::LOOKUP);

        $this->assertNotNull($result, json_encode($geocoder->getLastError(), JSON_PRETTY_PRINT) ?: 'Google geocoder returned no result.');
        $this->assertSame('google', $result->provider);
        $this->assertStringContainsStringIgnoringCase('San Francisco', $result->formattedLocation);
    }

    public function testChainUsesMapboxBeforeGoogleWhenBothAreAvailable(): void
    {
        $this->skipProviderIfUnavailable('mapbox');

        $chain = new ChainGeocoder([
            'mapbox' => new MapboxGeocoder(self::$providers['mapbox']['key']),
            'google' => new GooglePlacesGeocoder(self::$providers['google']['key'] ?? ''),
        ]);

        $result = $chain->geocode(self::LOOKUP);

        $this->assertNotNull($result, json_encode($chain->getLastError(), JSON_PRETTY_PRINT) ?: 'Geocoder chain returned no result.');
        $this->assertSame('mapbox', $result->provider);
        $this->assertStringContainsStringIgnoringCase('San Francisco', $result->formattedLocation);
    }

    /**
     * @return array<string, string>
     */
    private static function loadRealEnvironment(): array
    {
        if (is_file(__DIR__ . '/../.env')) {
            return Dotenv::parse(file_get_contents(__DIR__ . '/../.env') ?: '');
        }

        return [];
    }

    /**
     * @param array<string, string> $realEnv
     */
    private static function requiredProviderSetting(array $realEnv): string
    {
        $fromProcess = getenv('TESTS_REQUIRE_GEOCODER_INTEGRATION');
        if ($fromProcess !== false && trim($fromProcess) !== '') {
            return strtolower(trim($fromProcess));
        }

        return strtolower(trim((string)($realEnv['TESTS_REQUIRE_GEOCODER_INTEGRATION'] ?? Environment::get('TESTS_REQUIRE_GEOCODER_INTEGRATION', '') ?? '')));
    }

    /**
     * @param array<string, string> $realEnv
     */
    private static function realEnvValue(string $key, array $realEnv): string
    {
        $fromProcess = getenv($key);
        if ($fromProcess !== false && trim($fromProcess) !== '') {
            return trim($fromProcess);
        }

        return trim((string)($realEnv[$key] ?? Environment::get($key, '') ?? ''));
    }

    private static function providerIsRequired(string $provider, string $setting): bool
    {
        if (in_array($setting, ['1', 'true', 'yes', 'all'], true)) {
            return true;
        }

        $requiredProviders = array_filter(array_map(
            static fn(string $configuredProvider): string => strtolower(trim($configuredProvider)),
            explode(',', $setting)
        ));

        return in_array($provider, $requiredProviders, true);
    }

    /**
     * @return array{key: string, available: bool, error: array<string, mixed>|null}
     */
    private static function probeProvider(string $name, string $key, object $geocoder, bool $providerRequired): array
    {
        if ($key === '' || str_starts_with($key, 'test-')) {
            $error = [
                'provider' => $name,
                'reason' => 'missing_api_key',
                'errorMessage' => "No real {$name} API key configured.",
            ];
            self::logProviderSkip($error);
            if ($providerRequired) {
                throw new RuntimeException("{$name} geocoder integration required but no real API key is configured.");
            }

            return ['key' => $key, 'available' => false, 'error' => $error];
        }

        $result = $geocoder->geocode(self::LOOKUP);
        if ($result !== null) {
            return ['key' => $key, 'available' => true, 'error' => null];
        }

        /** @var array<string, mixed>|null $error */
        $error = method_exists($geocoder, 'getLastError') ? $geocoder->getLastError() : null;
        $error ??= [
            'provider' => $name,
            'reason' => 'unknown_failure',
            'errorMessage' => "{$name} geocoder probe returned no result.",
        ];

        self::logProviderSkip($error);
        if ($providerRequired) {
            throw new RuntimeException("{$name} geocoder integration required but probe failed: " . json_encode($error, JSON_PRETTY_PRINT));
        }

        return ['key' => $key, 'available' => false, 'error' => $error];
    }

    /**
     * @param array<string, mixed> $error
     */
    private static function logProviderSkip(array $error): void
    {
        fwrite(STDERR, "\nSkipping live geocoder provider: " . json_encode($error, JSON_PRETTY_PRINT) . "\n");
    }

    private function skipProviderIfUnavailable(string $provider): void
    {
        $state = self::$providers[$provider] ?? null;
        if (($state['available'] ?? false) === true) {
            return;
        }

        $this->markTestSkipped("{$provider} geocoder key unavailable or invalid: " . json_encode($state['error'] ?? [], JSON_PRETTY_PRINT));
    }
}
