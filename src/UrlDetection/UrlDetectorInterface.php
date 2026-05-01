<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\UrlDetection;

interface UrlDetectorInterface
{
    public function detect(string $body): ?string;
}
