<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Candidates;

final class DeliveryPlanner
{
    public const SINGLE = 'single';
    public const ALL = 'all';
    public const CANDIDATES = 'candidates';

    /**
     * One candidate: send it. Several with an explicit "send all" request (<multiple>, MULTI, form checkbox):
     * one email per event. Several otherwise: a choice email with links.
     */
    public static function plan(int $candidateCount, bool $sendAllRequested): string
    {
        if ($candidateCount <= 1) {
            return self::SINGLE;
        }

        return $sendAllRequested ? self::ALL : self::CANDIDATES;
    }
}
