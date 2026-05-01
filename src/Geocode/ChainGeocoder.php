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
    public function __construct(
        array $geocoders,
        private readonly ?LocationCombinerInterface $locationCombiner = null,
        private readonly string $defaultCountry = 'US',
    ) {
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

        $combiner = null;
        $combineModel = trim((string)($env['GEOCODE_COMBINE_MODEL'] ?? '~anthropic/claude-haiku-latest'));
        $openRouterKey = trim((string)($env['OPENROUTER_KEY'] ?? ''));
        if ($combineModel !== '' && $openRouterKey !== '' && !str_starts_with($openRouterKey, 'test-')) {
            $combiner = new AiLocationCombiner(
                \Jcherniak\EmailToIcs\OpenRouter\OpenRouterChatClient::fromApiKey($openRouterKey),
                $combineModel,
                static fn(string $message): null => \function_exists('errlog') ? \errlog($message) : null
            );
        }

        return new self($geocoders, $combiner, (string)($env['GEOCODE_DEFAULT_COUNTRY'] ?? 'US'));
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
                    $result = $this->combineLocation($lookup, $result);
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

    private function combineLocation(string $lookup, GeocodingResult $result): GeocodingResult
    {
        if ($this->locationCombiner === null) {
            return $result;
        }

        $combined = $this->locationCombiner->combine($lookup, $result->formattedLocation, $this->defaultCountry);
        if ($combined === null || trim($combined) === '') {
            return $result;
        }

        if (\function_exists('errlog') && $combined !== $result->formattedLocation) {
            \errlog("Geocode combine changed location from '{$result->formattedLocation}' to '{$combined}'");
        }

        return new GeocodingResult($combined, $result->provider, $result->metadata + [
            'uncombinedLocation' => $result->formattedLocation,
            'combinedLocation' => $combined,
        ]);
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
