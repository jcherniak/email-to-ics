<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Calendar\IcalGenerator;
use Jcherniak\EmailToIcs\Candidates\Candidate;
use Jcherniak\EmailToIcs\Candidates\CandidateSet;
use Jcherniak\EmailToIcs\Mail\CalendarEmailBody;

final class CandidateFixtures
{
    public const KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    public const BASE_URL = 'https://example.test/ics/';

    public static function presidioSet(string $key = self::KEY, array $overrides = []): CandidateSet
    {
        $generator = new IcalGenerator();
        $candidates = [];
        foreach (PresidioExpected::eventData() as $index => $eventData) {
            $candidates[] = new Candidate($index, $eventData, PresidioExpected::canonicalizeIcs($generator->convertJsonToIcs($eventData, 'calendar@example.test')));
        }

        return CandidateSet::fromArray(array_merge([
            'key' => $key,
            'createdAt' => '2026-05-01T10:00:00+00:00',
            'expiresAt' => '2026-05-31T10:00:00+00:00',
            'candidates' => $candidates,
            'baseSubject' => 'Opera Parallele - Doubt',
            'sourceUrl' => PresidioExpected::URL,
            'sourceLabel' => 'email input',
            'sourceContent' => '<main><h1>Doubt</h1></main>',
            'htmlBody' => CalendarEmailBody::build(PresidioExpected::URL, 'email input', '<p>source data</p>', '<main><h1>Doubt</h1></main>'),
            'model' => 'test/model',
            'instructions' => null,
            'multiMode' => true,
            'tentative' => true,
            'recipientEmail' => 'recipient@example.test',
            'originalEmail' => ['MessageID' => 'orig-message-id', 'From' => 'sender@example.test', 'Subject' => 'Doubt tickets'],
            'inReplyTo' => 'orig-message-id',
            'origin' => 'postmark',
            'rootKey' => $key,
        ], $overrides));
    }
}
