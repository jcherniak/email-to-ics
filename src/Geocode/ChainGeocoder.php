<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

final class ChainGeocoder implements GeocoderInterface
{
    /** @var array<string, GeocoderInterface> */
    private array $geocoders;

    /** @var array<int, array<string, mixed>> */
    private array $lastErrors = [];

    /**
     * @param array<string, GeocoderInterface> $geocoders
     */
    public function __construct(array $geocoders)
    {
        $this->geocoders = $geocoders;
    }

    public static function fromEnvironment(array $env = null): self
    {
        $env ??= $_ENV;
        $available = [
            'mapbox' => new MapboxGeocoder($env['MAPBOX_API_KEY'] ?? ''),
            'google' => new GooglePlacesGeocoder($env['GOOGLE_MAPS_API_KEY'] ?? ''),
        ];

        $order = array_filter(array_map(
            static fn(string $provider): string => strtolower(trim($provider)),
            explode(',', $env['GEOCODER_ORDER'] ?? 'mapbox,google')
        ));

        $geocoders = [];
        foreach ($order as $provider) {
            if (isset($available[$provider])) {
                $geocoders[$provider] = $available[$provider];
            }
        }

        return new self($geocoders);
    }

    public function geocode(string $lookup): ?GeocodingResult
    {
        $this->lastErrors = [];

        if ($this->geocoders === []) {
            $this->lastErrors[] = [
                'provider' => 'chain',
                'lookup' => $lookup,
                'reason' => 'no_configured_geocoders',
            ];
            return null;
        }

        foreach ($this->geocoders as $name => $geocoder) {
            if (\function_exists('errlog')) {
                \errlog("Attempting geocode using {$name}: {$lookup}");
            }

            try {
                $result = $geocoder->geocode($lookup);
                if ($result !== null && $result->formattedLocation !== '') {
                    if (\function_exists('errlog')) {
                        \errlog("Successfully geocoded using {$name}: {$result->formattedLocation}");
                    }
                    return $result;
                }

                $this->lastErrors[] = $geocoder->getLastError() ?? [
                    'provider' => $name,
                    'lookup' => $lookup,
                    'reason' => 'not_found',
                ];
            } catch (\Throwable $e) {
                $this->lastErrors[] = [
                    'provider' => $name,
                    'lookup' => $lookup,
                    'reason' => 'exception',
                    'errorMessage' => $e->getMessage(),
                ];

                if (\function_exists('errlog')) {
                    \errlog("Geocoder {$name} failed with exception: " . $e->getMessage());
                }
            }
        }

        if (\function_exists('errlog')) {
            \errlog("All geocoders failed for lookup: {$lookup}");
        }

        return null;
    }

    public function getLastError(): ?array
    {
        if ($this->lastErrors === []) {
            return null;
        }

        return [
            'provider' => 'chain',
            'reason' => 'all_failed',
            'errors' => $this->lastErrors,
        ];
    }
}
