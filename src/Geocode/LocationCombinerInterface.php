<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

interface LocationCombinerInterface
{
    public function combine(string $original, string $geocoded, string $defaultCountry): ?string;
}
