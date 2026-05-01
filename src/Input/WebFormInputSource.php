<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class WebFormInputSource implements InputSourceInterface
{
    /**
     * @param array<string, mixed> $request
     */
    public function __construct(private readonly array $request)
    {
    }

    public function toProcessingInput(): ProcessingInput
    {
        $zoomed = $this->request['screenshot_zoomed'] ?? null;
        if (is_array($zoomed)) {
            $zoomed = $zoomed[0] ?? null;
        }

        return new ProcessingInput(
            url: (string)($this->request['url'] ?? ''),
            downloadedText: (string)($this->request['html'] ?? ''),
            display: (string)($this->request['display'] ?? 'email'),
            tentative: ($this->request['tentative'] ?? '1') === '1',
            instructions: isset($this->request['instructions']) ? (string)$this->request['instructions'] : null,
            screenshotViewport: isset($this->request['screenshot_viewport']) ? (string)$this->request['screenshot_viewport'] : null,
            screenshotZoomed: $zoomed !== null ? (string)$zoomed : null,
            requestedModel: isset($this->request['model']) ? (string)$this->request['model'] : null,
            needsReview: ($this->request['review'] ?? '0') === '1',
            fromExtension: ($this->request['fromExtension'] ?? 'false') === 'true',
            allowMultiDay: ($this->request['multiday'] ?? '0') === '1',
            metadata: ['source' => 'webform'],
        );
    }
}
