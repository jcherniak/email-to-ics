<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\UrlDetection;

final class ChainUrlDetector implements UrlDetectorInterface
{
    /**
     * @param list<UrlDetectorInterface> $detectors
     */
    public function __construct(private readonly array $detectors)
    {
    }

    public function detect(string $body): ?string
    {
        foreach ($this->detectors as $detector) {
            $url = $detector->detect($body);
            if ($url !== null) {
                return $url;
            }
        }

        return null;
    }
}
