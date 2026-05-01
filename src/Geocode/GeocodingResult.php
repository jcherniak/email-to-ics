<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

final class GeocodingResult
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public readonly string $formattedLocation,
        public readonly string $provider,
        public readonly array $metadata = [],
    ) {
    }
}
