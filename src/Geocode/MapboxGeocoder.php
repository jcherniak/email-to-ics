<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class MapboxGeocoder implements GeocoderInterface
{
    /** @var array<string, mixed>|null */
    private ?array $lastError = null;

    public function __construct(
        private readonly string $apiKey,
        private readonly ?Client $client = null,
    ) {
    }

    public function geocode(string $lookup): ?GeocodingResult
    {
        $lookup = trim($lookup);
        $this->lastError = null;

        if ($lookup === '') {
            return $this->rememberError($lookup, 'empty_lookup');
        }

        if ($this->apiKey === '') {
            return $this->rememberError($lookup, 'empty_api_key');
        }

        $client = $this->client ?? new Client();
        $url = 'https://api.mapbox.com/search/geocode/v6/forward';

        try {
            $response = $client->get($url, [
                'query' => [
                    'q' => $lookup,
                    'access_token' => $this->apiKey,
                    'limit' => 1,
                ],
                'timeout' => 15,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            return $this->rememberError($lookup, 'request_error', null, null, $e->getMessage());
        }

        $httpCode = $response->getStatusCode();
        $body = (string)$response->getBody();
        $bodySnippet = substr($body, 0, 500);

        if (\function_exists('errlog')) {
            \errlog("Mapbox geocode response: lookup='{$lookup}', http_code={$httpCode}, bytes=" . strlen($body) . ", body_snippet='{$bodySnippet}'");
        }

        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->rememberError($lookup, 'invalid_json', $httpCode, null, json_last_error_msg(), null, $bodySnippet);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            $message = $data['message'] ?? $data['error'] ?? 'Mapbox request failed';
            $messageText = is_string($message) ? $message : json_encode($message);
            return $this->rememberError($lookup, 'api_error', $httpCode, null, $messageText === false ? 'Mapbox request failed' : $messageText, null, $bodySnippet);
        }

        $features = is_array($data['features'] ?? null) ? $data['features'] : [];
        if ($features === []) {
            return $this->rememberError($lookup, 'zero_results', $httpCode, null, null, 0, $bodySnippet);
        }

        $properties = is_array($features[0]['properties'] ?? null) ? $features[0]['properties'] : [];
        $name = trim((string)($properties['name'] ?? ''));
        $fullAddress = trim((string)($properties['full_address'] ?? ''));
        $placeFormatted = trim((string)($properties['place_formatted'] ?? ''));
        $formattedLocation = $fullAddress !== ''
            ? $fullAddress
            : trim($name . ($placeFormatted !== '' ? ' ' . $placeFormatted : ''));

        if ($formattedLocation === '') {
            return $this->rememberError($lookup, 'missing_formatted_location', $httpCode, null, null, count($features), $bodySnippet);
        }

        return new GeocodingResult($formattedLocation, 'mapbox', [
            'lookup' => $lookup,
            'resultCount' => count($features),
            'mapboxId' => $properties['mapbox_id'] ?? null,
        ]);
    }

    public function getLastError(): ?array
    {
        return $this->lastError;
    }

    private function rememberError(
        string $lookup,
        string $reason,
        ?int $httpCode = null,
        ?string $status = null,
        ?string $errorMessage = null,
        ?int $resultCount = null,
        ?string $bodySnippet = null,
    ): null {
        $this->lastError = [
            'provider' => 'mapbox',
            'lookup' => $lookup,
            'reason' => $reason,
            'httpCode' => $httpCode,
            'status' => $status,
            'errorMessage' => $errorMessage,
            'resultCount' => $resultCount,
            'bodySnippet' => $bodySnippet,
        ];

        return null;
    }
}
