<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

/**
 * The "choose events" email: lists every candidate with a "use only this one" link,
 * plus "create all events" and "choose events" links. Every link opens a confirm page.
 */
final class CandidateEmailBuilder
{
    /**
     * @return array{subject: string, htmlBody: string}
     */
    public static function build(CandidateSet $set, string $baseUrl): array
    {
        $count = $set->count();
        $e = static fn(string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $items = '';
        foreach ($set->candidates as $candidate) {
            $oneUrl = $e(CandidateLinks::url($baseUrl, $set->key, CandidateLinks::ACTION_ONE, $candidate->index));
            $location = $candidate->location() !== '' ? '<br><span class="small">' . $e($candidate->location()) . '</span>' : '';
            $items .= '<li style="margin-bottom:10px">'
                . '<b>' . $e($candidate->summary()) . '</b><br>'
                . $e($candidate->when())
                . $location
                . '<br><a href="' . $oneUrl . '">Use only this one</a>'
                . '</li>';
        }

        $allUrl = $e(CandidateLinks::url($baseUrl, $set->key, CandidateLinks::ACTION_ALL));
        $pickUrl = $e(CandidateLinks::url($baseUrl, $set->key, CandidateLinks::ACTION_PICK));

        $htmlBody = '<p>' . $count . ' possible events were found. Choose what to add to your calendar:</p>'
            . "\n" . '<p><a href="' . $allUrl . '"><b>Create all ' . $count . ' events</b></a> &nbsp;|&nbsp; <a href="' . $pickUrl . '"><b>Choose events</b></a></p>'
            . "\n" . '<ol>' . $items . '</ol>'
            . "\n" . '<p class="small">Reply to this email with instructions to change the events (for example "use 8pm instead" or "add a 30 minute reminder").</p>'
            . "\n<hr>\n" . $set->htmlBody;

        return [
            'subject' => "{$set->baseSubject}: {$count} possible events - choose",
            'htmlBody' => $htmlBody,
        ];
    }
}
