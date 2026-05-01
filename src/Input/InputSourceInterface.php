<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Input;

interface InputSourceInterface
{
    public function toProcessingInput(): ProcessingInput;
}
