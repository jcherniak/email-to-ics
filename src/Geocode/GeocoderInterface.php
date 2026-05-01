<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

interface GeocoderInterface
{
    public function geocode(string $lookup): ?GeocodingResult;

    /**
     * @return array<string, mixed>|null
     */
    public function getLastError(): ?array;
}
