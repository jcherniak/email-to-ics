<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Mail;

interface MailerInterface
{
    public function send(EmailMessage $message): void;
}
