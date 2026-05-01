<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

final class RawEmailTextInputSource implements InputSourceInterface
{
    public function __construct(
        private readonly string $text,
        private readonly ?string $instructions = null,
        private readonly ?string $requestedModel = null,
        private readonly bool $cliDebug = false,
    ) {
    }

    public function toProcessingInput(): ProcessingInput
    {
        return new ProcessingInput(
            downloadedText: $this->text,
            display: 'display',
            instructions: $this->instructions,
            requestedModel: $this->requestedModel,
            outputJsonOnly: true,
            cliDebug: $this->cliDebug,
            allowMultiDay: true,
            metadata: ['source' => 'raw-email-text'],
        );
    }
}
