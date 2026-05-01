<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

final class DummyMailer implements MailerInterface
{
    /** @var EmailMessage[] */
    public array $messages = [];

    public function send(EmailMessage $message): void
    {
        $this->messages[] = $message;
    }
}
