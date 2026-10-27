<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

final class ModelOrder
{
    /**
     * Order: explicitly requested model, DEFAULT_MODEL, ALTERNATE_MODEL, then the remaining allowed models.
     *
     * @param iterable<string> $allowed
     * @param null|callable(string): bool $isKnown filters out models the OpenRouter catalog does not list
     * @return list<string>
     */
    public static function build(?string $default, ?string $alternate, iterable $allowed, ?string $requested = null, ?callable $isKnown = null): array
    {
        $ordered = [];
        foreach ([$requested, $default, $alternate] as $candidate) {
            self::push($ordered, $candidate, $isKnown);
        }
        foreach ($allowed as $candidate) {
            self::push($ordered, is_string($candidate) ? $candidate : null, $isKnown);
        }

        return $ordered;
    }

    /** @param list<string> $ordered */
    private static function push(array &$ordered, ?string $candidate, ?callable $isKnown): void
    {
        $candidate = trim((string)$candidate, " \t\n\r\0\x0B\"'");
        if ($candidate === '' || in_array($candidate, $ordered, true)) {
            return;
        }
        if ($isKnown !== null && !$isKnown($candidate)) {
            return;
        }
        $ordered[] = $candidate;
    }
}
