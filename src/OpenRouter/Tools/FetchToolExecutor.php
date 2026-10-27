<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\OpenRouter\Tools;

use Jcherniak\EmailToIcs\Content\HtmlLightener;
use Jcherniak\EmailToIcs\Content\HtmlTitle;
use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface;
use Jcherniak\EmailToIcs\OpenRouter\ToolExecutorInterface;

/**
 * One fetch level exposed to the model as a function tool. Wraps a UrlFetcherInterface
 * (DirectUrlFetcher, FirecrawlUrlFetcher, TinyFish*Fetcher) and returns a compact JSON result.
 */
final class FetchToolExecutor implements ToolExecutorInterface
{
    public ?FetchResult $lastResult = null;
    public ?string $lastContent = null;

    public function __construct(
        private readonly string $name,
        private readonly string $description,
        private readonly UrlFetcherInterface $fetcher,
        private readonly int $maxChars = 150000,
    ) {
    }

    public function name(): string
    {
        return $this->name;
    }

    public function definition(): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $this->name,
                'description' => $this->description,
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'url' => ['type' => 'string', 'description' => 'Absolute http(s) URL of the page to fetch.'],
                    ],
                    'required' => ['url'],
                    'additionalProperties' => false,
                ],
            ],
        ];
    }

    public function execute(array $arguments): array
    {
        $url = trim((string)($arguments['url'] ?? ''));
        if ($url === '' || !preg_match('/^https?:\/\//i', $url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return $this->error($url, 'url must be an absolute http(s) URL');
        }

        try {
            $result = $this->fetcher->fetch($url);
        } catch (\Throwable $e) {
            return $this->error($url, ChainUrlFetcher::describeFailure($e));
        }

        if ($result === null || trim($result->content) === '') {
            return $this->error($url, 'no content returned');
        }

        $content = $result->isHtml() ? HtmlLightener::lighten($result->content) : HtmlLightener::normalizeUtf8($result->content);
        $truncated = false;
        if (strlen($content) > $this->maxChars) {
            $content = substr($content, 0, $this->maxChars) . "\n[truncated: content exceeded {$this->maxChars} characters]";
            $truncated = true;
        }

        $this->lastResult = $result;
        $this->lastContent = $content;

        return [
            'status' => 'ok',
            'tool' => $this->name,
            'url' => $url,
            'final_url' => $result->finalUrl ?? $url,
            'title' => $result->title ?? ($result->isHtml() ? HtmlTitle::extract($result->content) : null),
            'content_type' => $result->contentType,
            'status_code' => $result->statusCode,
            'truncated' => $truncated,
            'content' => $content,
            'error' => null,
        ];
    }

    private function error(string $url, string $message): array
    {
        return [
            'status' => 'error',
            'tool' => $this->name,
            'url' => $url,
            'final_url' => null,
            'title' => null,
            'content' => null,
            'error' => $message,
        ];
    }
}
