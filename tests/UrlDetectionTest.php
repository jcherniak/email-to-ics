<?php

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use Jcherniak\EmailToIcs\Input\EmailInputSource;
use Jcherniak\EmailToIcs\Mail\DummyMailer;
use PHPUnit\Framework\TestCase;

final class UrlDetectionTest extends TestCase
{
    public function testPostmarkDirectivesExtractBomPrefixedUrlWithTrailingBareQuestionMark(): void
    {
        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => "\xEF\xBB\xBFhttps://www.presidiotheatre.org/show-details/opera-parallele-doubt-at-the-presidio-theatre?\n",
            'HtmlBody' => '',
        ]);

        $this->assertSame(
            'https://www.presidiotheatre.org/show-details/opera-parallele-doubt-at-the-presidio-theatre',
            $email['url']
        );
    }

    public function testPostmarkDirectivesExtractUrlFromHtmlBodyWhenTextBodyIsEmpty(): void
    {
        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => '',
            'HtmlBody' => '<div>https://example.test/show?<br /></div>',
        ]);

        $this->assertSame('https://example.test/show', $email['url']);
    }

    public function testPostmarkDirectivesPreserveRealQueryStringAndStripSentencePunctuation(): void
    {
        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => 'URL: https://example.test/show?utm_source=email&event=123.',
            'HtmlBody' => '',
        ]);

        $this->assertSame('https://example.test/show?utm_source=email&event=123', $email['url']);
    }

    public function testPostmarkDirectivesExtractUrlAndInstructionsFromDashedSeparatorFormat(): void
    {
        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => "https://example.test/show\n\n-----\nFocus on the evening performance.\nUse the venue timezone.",
            'HtmlBody' => '',
        ]);

        $this->assertSame('https://example.test/show', $email['url']);
        $this->assertSame("Focus on the evening performance.\nUse the venue timezone.", $email['instructions']);
    }

    public function testDashedSeparatorInstructionsOverrideInlineInstructions(): void
    {
        $email = (new EmailInputSource())->parsePostmarkDirectives([
            'TextBody' => "URL: https://example.test/show\nInstructions: Ignore this older instruction.\n\n---\nUse this override instruction.",
            'HtmlBody' => '',
        ]);

        $this->assertSame('https://example.test/show', $email['url']);
        $this->assertSame('Use this override instruction.', $email['instructions']);
    }

    public function testUrlDetectionFallsBackToSecondModelForShortFalseResult(): void
    {
        $_ENV['URL_DETECTION_MODEL'] = 'google/gemini-flash-latest';
        $_ENV['URL_DETECTION_FALLBACK_MODEL'] = 'openai/gpt-mini-latest';

        $client = new FakeUrlDetectionClient([
            FakeUrlDetectionClient::openRouterResponse(['containsUrl' => false, 'url' => null]),
            FakeUrlDetectionClient::openRouterResponse(['containsUrl' => true, 'url' => 'https://example.test/event']),
        ]);
        $processor = $this->processorWithUrlDetectionClient($client);

        $url = $this->invokeUrlDetection($processor, 'not a url');

        $this->assertSame('https://example.test/event', $url);
        $this->assertSame(['google/gemini-flash-latest', 'openai/gpt-mini-latest'], $client->requestedModels);
    }

    public function testUrlDetectionDoesNotUseSecondModelForLongFalseResult(): void
    {
        $_ENV['URL_DETECTION_MODEL'] = 'google/gemini-flash-latest';
        $_ENV['URL_DETECTION_FALLBACK_MODEL'] = 'openai/gpt-mini-latest';

        $client = new FakeUrlDetectionClient([
            FakeUrlDetectionClient::openRouterResponse(['containsUrl' => false, 'url' => null]),
            FakeUrlDetectionClient::openRouterResponse(['containsUrl' => true, 'url' => 'https://example.test/event']),
        ]);
        $processor = $this->processorWithUrlDetectionClient($client);

        $url = $this->invokeUrlDetection($processor, str_repeat('This is not a URL. ', 40));

        $this->assertNull($url);
        $this->assertSame(['google/gemini-flash-latest'], $client->requestedModels);
    }

    public function testUrlDetectionFallsBackAfterPrimaryModelApiError(): void
    {
        $_ENV['URL_DETECTION_MODEL'] = 'google/gemini-flash-latest';
        $_ENV['URL_DETECTION_FALLBACK_MODEL'] = 'openai/gpt-mini-latest';

        $client = new FakeUrlDetectionClient([
            new Response(400, [], json_encode(['error' => ['message' => 'model unavailable']])),
            FakeUrlDetectionClient::openRouterResponse(['containsUrl' => true, 'url' => 'https://example.test/fallback']),
        ]);
        $processor = $this->processorWithUrlDetectionClient($client);

        $url = $this->invokeUrlDetection($processor, 'https://example.test/fallback');

        $this->assertSame('https://example.test/fallback', $url);
        $this->assertSame(['google/gemini-flash-latest', 'openai/gpt-mini-latest'], $client->requestedModels);
    }

    private function processorWithUrlDetectionClient(FakeUrlDetectionClient $client): EmailProcessor
    {
        $processor = new EmailProcessor(new DummyMailer());
        $property = new ReflectionProperty($processor, 'openaiClient');
        $property->setAccessible(true);
        $property->setValue($processor, $client);

        return $processor;
    }

    private function invokeUrlDetection(EmailProcessor $processor, string $body): ?string
    {
        $method = new ReflectionMethod($processor, 'detectUrlInEmailBody');
        $method->setAccessible(true);

        return $method->invoke($processor, $body);
    }
}

final class FakeUrlDetectionClient
{
    /** @var list<Response> */
    private array $responses;

    /** @var list<string> */
    public array $requestedModels = [];

    /**
     * @param list<Response> $responses
     */
    public function __construct(array $responses)
    {
        $this->responses = $responses;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function openRouterResponse(array $payload): Response
    {
        return new Response(200, [], json_encode([
            'choices' => [
                [
                    'message' => [
                        'content' => json_encode($payload),
                    ],
                ],
            ],
        ]));
    }

    /**
     * @param array<string, mixed> $options
     */
    public function post(string $uri, array $options = []): Response
    {
        $this->requestedModels[] = $options['json']['model'] ?? '';

        if ($this->responses === []) {
            throw new RuntimeException('No fake URL detection responses queued.');
        }

        return array_shift($this->responses);
    }
}
