<?php

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use Jcherniak\EmailToIcs\Fetch\DummyFetcher;
use Jcherniak\EmailToIcs\Fetch\FetchResult;
use Jcherniak\EmailToIcs\Generation\GenerationOutcome;
use Jcherniak\EmailToIcs\Generation\StaticContentProvider;
use Jcherniak\EmailToIcs\Generation\ToolDrivenContentProvider;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use Jcherniak\EmailToIcs\OpenRouter\OpenRouterToolLoop;
use Jcherniak\EmailToIcs\OpenRouter\ToolRegistry;
use Jcherniak\EmailToIcs\OpenRouter\Tools\FetchToolExecutor;
use PHPUnit\Framework\TestCase;

final class OpenRouterToolLoopTest extends TestCase
{
    private function finalResponse(string $content): Response
    {
        return new Response(200, [], json_encode(['choices' => [['finish_reason' => 'stop', 'message' => ['role' => 'assistant', 'content' => $content]]]]));
    }

    private function registry(array $fetchers): ToolRegistry
    {
        $tools = [];
        foreach ($fetchers as $name => $fetcher) {
            $tools[] = new FetchToolExecutor($name, "tool {$name}", $fetcher, 200);
        }

        return new ToolRegistry($tools);
    }

    /**
     * @param list<Response> $responses
     * @return array{loop: OpenRouterToolLoop, requests: array}
     */
    private function loop(array $responses, ToolRegistry $registry, int $max = 8, int $perTool = 3): array
    {
        $requests = [];
        $post = function (array $request) use (&$requests, &$responses): Response {
            $requests[] = $request;
            if ($responses === []) {
                throw new RuntimeException('no scripted response left');
            }
            return array_shift($responses);
        };
        $holder = ['loop' => new OpenRouterToolLoop($post, $registry, $max, $perTool, static fn() => null)];
        $holder['requests'] = &$requests;

        return $holder;
    }

    public function testToolCallIsExecutedAndTranscriptIsReplayed(): void
    {
        $direct = new DummyFetcher(new FetchResult('https://x.test/e', '<html><title>T</title><body>Doubt May 29 7:30 PM' . str_repeat(' pad', 100) . '<script>no</script></body></html>', 'direct', null, [], 'https://x.test/final', 'T', 200));
        $registry = $this->registry(['fetch_direct' => $direct, 'fetch_with_firecrawl' => new DummyFetcher(null)]);
        $h = $this->loop([
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'https://x.test/e'], 'c1'),
            $this->finalResponse('{"success":true}'),
        ], $registry);

        $result = $h['loop']->run(['model' => 'm', 'messages' => [['role' => 'system', 'content' => 'sys'], ['role' => 'user', 'content' => 'go']]]);

        $this->assertNull($result->error);
        $this->assertSame('{"success":true}', $result->finalContent);
        $this->assertSame(1, $result->toolCalls);
        $this->assertSame(2, $result->requests);
        $this->assertCount(2, $h['requests']);
        foreach ($h['requests'] as $request) {
            $this->assertSame(['fetch_direct', 'fetch_with_firecrawl'], array_column(array_column($request['tools'], 'function'), 'name'));
            $this->assertFalse($request['parallel_tool_calls']);
            $this->assertSame('auto', $request['tool_choice']);
        }
        $roles = array_column($h['requests'][1]['messages'], 'role');
        $this->assertSame(['system', 'user', 'assistant', 'tool'], $roles);
        $toolMessage = $h['requests'][1]['messages'][3];
        $this->assertSame('c1', $toolMessage['tool_call_id']);
        $payload = json_decode($toolMessage['content'], true);
        $this->assertSame('ok', $payload['status']);
        $this->assertSame('https://x.test/final', $payload['final_url']);
        $this->assertTrue($payload['truncated']);
        $this->assertStringNotContainsString('<script>', $payload['content']);
        $this->assertSame(['https://x.test/e'], $direct->requestedUrls);
        $this->assertSame('fetch_direct', $result->lastSuccessfulTool()['tool']);
        $this->assertSame('fetch_with_firecrawl', $registry->nextAfter('fetch_direct'));
        $this->assertNull($registry->nextAfter('fetch_with_firecrawl'));
    }

    public function testErrorsUnknownToolsAndCapsAreReportedToTheModel(): void
    {
        $failing = new class implements \Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface {
            public function fetch(string $url): ?FetchResult { throw new RuntimeException('blocked 403'); }
        };
        $registry = $this->registry(['fetch_direct' => $failing]);
        $responses = [
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'https://x.test/e'], 'c1'),
            FakeEmailProcessor::toolCallResponse('nope', ['url' => 'https://x.test/e'], 'c2'),
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'not a url'], 'c3'),
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'https://x.test/e'], 'c4'),
            $this->finalResponse('done'),
        ];
        $h = $this->loop($responses, $registry, 8, 2);

        $result = $h['loop']->run(['model' => 'm', 'messages' => [['role' => 'user', 'content' => 'go']]]);

        $this->assertSame('done', $result->finalContent);
        $this->assertSame(3, $result->toolCalls, 'unknown-tool calls count, over-cap calls do not');
        $this->assertSame(['error', 'error', 'error', 'error'], array_column($result->trace, 'status'));
        $this->assertStringContainsString('blocked 403', $result->trace[0]['error']);
        $this->assertStringContainsString('unknown tool', $result->trace[1]['error']);
        $this->assertStringContainsString('absolute http(s) URL', $result->trace[2]['error']);
        $this->assertStringContainsString('may only be called 2 times', $result->trace[3]['error']);
        $this->assertNull($result->lastSuccessfulTool());

        // Total cap: after the limit the model is told to answer (tool_choice none) and extra calls are refused.
        $h = $this->loop([
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'https://x.test/e'], 'c1'),
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => 'https://x.test/e'], 'c2'),
            $this->finalResponse('capped'),
        ], $registry, 1, 3);
        $result = $h['loop']->run(['model' => 'm', 'messages' => [['role' => 'user', 'content' => 'go']]]);
        $this->assertSame('capped', $result->finalContent);
        $this->assertSame(1, $result->toolCalls);
        $this->assertStringContainsString('tool call limit of 1', $result->trace[1]['error']);
        $this->assertSame('none', $h['requests'][1]['tool_choice']);
        $this->assertSame('none', $h['requests'][2]['tool_choice']);
    }

    public function testHttpErrorAndMalformedResponses(): void
    {
        $registry = $this->registry(['fetch_direct' => new DummyFetcher(null)]);
        $h = $this->loop([new Response(429, [], json_encode(['error' => ['message' => 'rate limited']]))], $registry);
        $result = $h['loop']->run(['model' => 'm', 'messages' => []]);
        $this->assertStringContainsString('error status 429: rate limited', $result->error);

        $h = $this->loop([new Response(200, [], 'not json')], $registry);
        $this->assertStringContainsString('Invalid JSON', $h['loop']->run(['model' => 'm', 'messages' => []])->error);

        $h = $this->loop([new Response(200, [], json_encode(['choices' => []]))], $registry);
        $this->assertStringContainsString("missing 'choices'", $h['loop']->run(['model' => 'm', 'messages' => []])->error);
    }

    public function testRegistryFromEnvironmentOmitsKeylessLevels(): void
    {
        $this->assertSame(['fetch_direct'], ToolRegistry::fromEnvironment([])->orderedNames());
        $this->assertSame(['fetch_direct', 'fetch_with_firecrawl'], ToolRegistry::fromEnvironment(['FIRECRAWL_API_KEY' => 'x'])->orderedNames());
        $this->assertSame(
            ['fetch_direct', 'fetch_with_firecrawl', 'fetch_with_tinyfish', 'render_with_tinyfish_browser'],
            ToolRegistry::fromEnvironment(['FIRECRAWL_API_KEY' => 'x', 'TINYFISH_API_KEY' => 'y'])->orderedNames()
        );
        $definition = ToolRegistry::fromEnvironment([])->definitions()[0];
        $this->assertSame('function', $definition['type']);
        $this->assertSame(['url'], $definition['function']['parameters']['required']);
    }

    private function runGeneration(FakeEmailProcessor $processor, $provider, array $models = ['test/model']): GenerationOutcome
    {
        $method = new ReflectionMethod($processor, 'runGeneration');
        $method->setAccessible(true);

        return $method->invoke($processor, $models, $provider, null, null, null, true, 'https://x.test/e', false);
    }

    public function testProcessorToolFlowRepromptsOnceThenMovesToNextModel(): void
    {
        $html = file_get_contents(__DIR__ . '/artifacts/sources/presidio-opera-parallele-doubt.html');
        $direct = new DummyFetcher(null);
        $firecrawl = new DummyFetcher(new FetchResult(PresidioExpected::URL, $html, 'firecrawl'));
        $registry = $this->registry(['fetch_direct' => $direct, 'fetch_with_firecrawl' => $firecrawl]);
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null), null, null, null, $registry);
        $processor->setFakeAiResponses([
            // model 1: fetch_direct fails, model answers garbage -> re-prompt once -> still garbage
            FakeEmailProcessor::toolCallResponse('fetch_direct', ['url' => PresidioExpected::URL], 'c1'),
            $this->finalResponse('{"not":"valid"}'),
            $this->finalResponse('still not valid'),
            // model 2: fetches with firecrawl and answers with the Presidio fixture
            FakeEmailProcessor::toolCallResponse('fetch_with_firecrawl', ['url' => PresidioExpected::URL], 'c2'),
        ]);
        $provider = new ToolDrivenContentProvider(PresidioExpected::URL, static fn(string $u): string => "{$u}\nfetch it");

        $outcome = $this->runGeneration($processor, $provider, ['model-a', 'model-b']);

        $this->assertTrue($outcome->success);
        $this->assertSame(['model-a', 'model-b'], array_column(array_map(static fn($a) => $a->toArray(), $outcome->attempts), 'model'));
        $this->assertSame(['tools', 'tools'], array_column(array_map(static fn($a) => $a->toArray(), $outcome->attempts), 'level'));
        $this->assertCount(5, $processor->aiRequests);
        $reprompt = $processor->aiRequests[2]['messages'];
        $last = $reprompt[count($reprompt) - 1];
        $this->assertSame('user', $last['role']);
        $this->assertStringContainsString('next fetch level (fetch_with_firecrawl)', $last['content']);
        $this->assertSame(['fetch_direct', 'fetch_with_firecrawl'], array_column(array_column($processor->aiRequests[0]['tools'], 'function'), 'name'));
        $this->assertStringContainsString('# FETCHING PROCEDURE', json_encode($processor->aiRequests[0]['messages']));
        $this->assertSame([PresidioExpected::URL], $direct->requestedUrls);
        $this->assertSame([PresidioExpected::URL], $firecrawl->requestedUrls);
        $this->assertSame('fetch_with_firecrawl', $outcome->eventDetails['sourceTool']);
        $this->assertStringContainsString('Doubt', $outcome->eventDetails['sourceContent']);
        $this->assertCount(1, $outcome->eventDetails['toolTrace']);
    }

    public function testProvidedContentSendsNoTools(): void
    {
        $processor = new FakeEmailProcessor(new DummyMailer(), new DummyFetcher(null));
        $provider = new StaticContentProvider('<p>page with event May 29 2026</p>', static fn(string $page, ?string $title): string => $page);

        $outcome = $this->runGeneration($processor, $provider);

        $this->assertTrue($outcome->success);
        $this->assertCount(1, $processor->aiRequests);
        $this->assertArrayNotHasKey('tools', $processor->aiRequests[0]);
        $this->assertStringNotContainsString('FETCHING PROCEDURE', json_encode($processor->aiRequests[0]['messages']));
    }
}
