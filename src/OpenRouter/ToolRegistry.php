<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter;

use Jcherniak\EmailToIcs\Fetch\DirectUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\FirecrawlUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\TinyFishBrowserUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\TinyFishFetchUrlFetcher;
use Jcherniak\EmailToIcs\OpenRouter\Tools\FetchToolExecutor;

/**
 * Ordered fetch tools offered to the model: fetch_direct -> fetch_with_firecrawl ->
 * fetch_with_tinyfish -> render_with_tinyfish_browser. Tools whose keys are missing are omitted.
 */
final class ToolRegistry
{
    public const FETCH_DIRECT = 'fetch_direct';
    public const FETCH_FIRECRAWL = 'fetch_with_firecrawl';
    public const FETCH_TINYFISH = 'fetch_with_tinyfish';
    public const RENDER_TINYFISH_BROWSER = 'render_with_tinyfish_browser';

    /** @var array<string, ToolExecutorInterface> */
    private array $tools = [];

    /**
     * @param list<ToolExecutorInterface> $tools in escalation order
     */
    public function __construct(array $tools)
    {
        foreach ($tools as $tool) {
            $this->tools[$tool->name()] = $tool;
        }
    }

    public static function fromEnvironment(array $env = null): self
    {
        $env ??= $_ENV;
        $maxChars = max(1000, (int)($env['TOOL_CONTENT_MAX_CHARS'] ?? 150000));
        $tools = [new FetchToolExecutor(
            self::FETCH_DIRECT,
            'Level 1: plain HTTP GET of the page (fast, free). Use this FIRST for every URL.',
            DirectUrlFetcher::fromEnvironment($env),
            $maxChars
        )];

        $firecrawl = FirecrawlUrlFetcher::fromEnvironment($env);
        if ($firecrawl !== null) {
            $tools[] = new FetchToolExecutor(
                self::FETCH_FIRECRAWL,
                'Level 2: Firecrawl rendered fetch (runs JavaScript, handles many bot walls). Use ONLY after fetch_direct returned an error, empty or near-empty content, or a block/captcha/login/cookie wall.',
                $firecrawl,
                $maxChars
            );
        }

        $tinyFish = TinyFishFetchUrlFetcher::fromEnvironment($env);
        if ($tinyFish !== null) {
            $tools[] = new FetchToolExecutor(
                self::FETCH_TINYFISH,
                'Level 3: TinyFish full-browser fetch returning cleaned HTML. Use ONLY after fetch_with_firecrawl failed or returned unusable content.',
                $tinyFish,
                $maxChars
            );
        }

        $browser = TinyFishBrowserUrlFetcher::fromEnvironment($env);
        if ($browser !== null) {
            $tools[] = new FetchToolExecutor(
                self::RENDER_TINYFISH_BROWSER,
                'Level 4 (slow, last resort): a remote stealth browser agent loads the page and returns its visible text. Use ONLY after every earlier level failed.',
                $browser,
                $maxChars
            );
        }

        return new self($tools);
    }

    /** @return list<string> */
    public function orderedNames(): array
    {
        return array_keys($this->tools);
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    public function get(string $name): ?ToolExecutorInterface
    {
        return $this->tools[$name] ?? null;
    }

    /** @return list<array<string, mixed>> */
    public function definitions(): array
    {
        return array_values(array_map(static fn(ToolExecutorInterface $t): array => $t->definition(), $this->tools));
    }

    /** Name of the tool after $name in escalation order, or null when $name is the last one. */
    public function nextAfter(?string $name): ?string
    {
        $names = $this->orderedNames();
        if ($name === null) {
            return $names[0] ?? null;
        }
        $index = array_search($name, $names, true);

        return $index === false ? null : ($names[$index + 1] ?? null);
    }

    /**
     * @param array<string, mixed> $arguments
     * @return array<string, mixed>
     */
    public function execute(string $name, array $arguments): array
    {
        $tool = $this->tools[$name] ?? null;
        if ($tool === null) {
            return ['status' => 'error', 'tool' => $name, 'error' => "unknown tool {$name}; available: " . implode(', ', $this->orderedNames())];
        }

        return $tool->execute($arguments);
    }
}
