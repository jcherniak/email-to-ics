<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class CliInputSource implements InputSourceInterface
{
    /**
     * @param array<string, string|false|array<int, string|false>> $options
     */
    public function __construct(private readonly array $options)
    {
    }

    public function toProcessingInput(): ProcessingInput
    {
        return new ProcessingInput(
            url: (string)($this->options['url'] ?? ''),
            downloadedText: (string)($this->options['html'] ?? ''),
            display: (string)($this->options['display'] ?? 'display'),
            tentative: isset($this->options['tentative'])
                ? ((string)$this->options['tentative'] === '1' || strtolower((string)$this->options['tentative']) === 'true')
                : true,
            instructions: isset($this->options['instructions']) ? (string)$this->options['instructions'] : null,
            screenshotViewport: isset($this->options['screenshot_viewport']) ? (string)$this->options['screenshot_viewport'] : null,
            screenshotZoomed: isset($this->options['screenshot_zoomed']) ? (string)$this->options['screenshot_zoomed'] : null,
            requestedModel: isset($this->options['model']) ? (string)$this->options['model'] : null,
            needsReview: isset($this->options['review'])
                ? ((string)$this->options['review'] === '1' || strtolower((string)$this->options['review']) === 'true')
                : false,
            outputJsonOnly: isset($this->options['json']),
            cliDebug: isset($this->options['debug']),
            metadata: ['source' => 'cli'],
        );
    }
}
