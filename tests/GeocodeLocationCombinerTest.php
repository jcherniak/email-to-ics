<?php

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use Jcherniak\EmailToIcs\Geocode\AiLocationCombiner;
use Jcherniak\EmailToIcs\Geocode\ChainGeocoder;
use Jcherniak\EmailToIcs\Geocode\GeocoderInterface;
use Jcherniak\EmailToIcs\Geocode\GeocodingResult;
use Jcherniak\EmailToIcs\Geocode\LocationCombinerInterface;
use Jcherniak\EmailToIcs\OpenRouter\OpenRouterChatClient;
use PHPUnit\Framework\TestCase;

final class GeocodeLocationCombinerTest extends TestCase
{
    public function testAiCombinerPromptsForOriginalAndGeocodedLocation(): void
    {
        $client = new class {
            /** @var array<string, mixed>|null */
            public ?array $payload = null;

            public function post(string $uri, array $options): Response
            {
                $this->payload = $options['json'];

                return new Response(200, [], json_encode([
                    'choices' => [
                        [
                            'message' => [
                                'content' => json_encode([
                                    'location' => 'Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129',
                                ]),
                            ],
                        ],
                    ],
                ]));
            }
        };

        $combiner = new AiLocationCombiner(
            new OpenRouterChatClient($client),
            '~anthropic/claude-haiku-latest'
        );

        $location = $combiner->combine(
            'Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129',
            '99 Moraga Avenue, San Francisco, California 94129, United States',
            'US'
        );

        $this->assertSame('Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129', $location);
        $this->assertSame('~anthropic/claude-haiku-latest', $client->payload['model']);

        $prompt = $client->payload['messages'][1]['content'];
        $this->assertStringContainsString('Default country: US', $prompt);
        $this->assertStringContainsString('"original": "Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129"', $prompt);
        $this->assertStringContainsString('"geocoded": "99 Moraga Avenue, San Francisco, California 94129, United States"', $prompt);
        $this->assertStringContainsString('without the default country', $prompt);
    }

    public function testAiCombinerAcceptsJsonMarkdownFence(): void
    {
        $client = new class {
            public function post(string $uri, array $options): Response
            {
                return new Response(200, [], json_encode([
                    'choices' => [
                        [
                            'message' => [
                                'content' => "```json\n{\"location\":\"Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129\"}\n```",
                            ],
                        ],
                    ],
                ]));
            }
        };

        $combiner = new AiLocationCombiner(new OpenRouterChatClient($client), '~anthropic/claude-haiku-latest');

        $this->assertSame(
            'Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129',
            $combiner->combine('Presidio Theatre, 99 Moraga Avenue', '99 Moraga Avenue, San Francisco, California 94129, United States', 'US')
        );
    }

    public function testChainGeocoderUsesCombinerWhenProviderReturnsAddressOnly(): void
    {
        $geocoder = new class implements GeocoderInterface {
            public function geocode(string $lookup): ?GeocodingResult
            {
                return new GeocodingResult('99 Moraga Avenue, San Francisco, California 94129, United States', 'mapbox');
            }

            public function getLastError(): ?array
            {
                return null;
            }
        };

        $combiner = new class implements LocationCombinerInterface {
            public function combine(string $original, string $geocoded, string $defaultCountry): ?string
            {
                TestCase::assertSame('Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129', $original);
                TestCase::assertSame('99 Moraga Avenue, San Francisco, California 94129, United States', $geocoded);
                TestCase::assertSame('US', $defaultCountry);

                return 'Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129';
            }
        };

        $chain = new ChainGeocoder(['mapbox' => $geocoder], $combiner, 'US');
        $result = $chain->geocode('Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129');

        $this->assertSame('Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129', $result?->formattedLocation);
        $this->assertSame('99 Moraga Avenue, San Francisco, California 94129, United States', $result?->metadata['uncombinedLocation']);
        $this->assertSame('Presidio Theatre, 99 Moraga Avenue, San Francisco, California 94129', $result?->metadata['combinedLocation']);
    }
}
