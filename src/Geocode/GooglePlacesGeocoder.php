<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Geocode;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class GooglePlacesGeocoder implements GeocoderInterface
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
        $url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

        if (\function_exists('errlog')) {
            \errlog("Google Maps text search starting: lookup='{$lookup}'");
        }

        try {
            $response = $client->get($url, [
                'query' => [
                    'query' => $lookup,
                    'key' => $this->apiKey,
                ],
                'timeout' => 15,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            return $this->rememberError($lookup, 'request_error', null, null, $e->getMessage());
        }

        $httpCode = $response->getStatusCode();
        $contentType = $response->getHeaderLine('Content-Type');
        $body = (string)$response->getBody();
        $bodySnippet = substr($body, 0, 500);

        if (\function_exists('errlog')) {
            \errlog("Google Maps text search response: lookup='{$lookup}', http_code={$httpCode}, content_type='{$contentType}', bytes=" . strlen($body) . ", body_snippet='{$bodySnippet}'");
        }

        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->rememberError($lookup, 'invalid_json', $httpCode, null, json_last_error_msg(), null, $bodySnippet);
        }

        $status = (string)($data['status'] ?? 'missing');
        $errorMessage = (string)($data['error_message'] ?? '');
        $results = is_array($data['results'] ?? null) ? $data['results'] : [];
        $resultCount = count($results);

        if (\function_exists('errlog')) {
            \errlog("Google Maps text search parsed: lookup='{$lookup}', status='{$status}', result_count={$resultCount}, error_message='{$errorMessage}'");
        }

        if ($httpCode < 200 || $httpCode >= 300 || $status !== 'OK') {
            return $this->rememberError($lookup, $status === 'ZERO_RESULTS' ? 'zero_results' : 'api_error', $httpCode, $status, $errorMessage, $resultCount, $bodySnippet);
        }

        if ($results === []) {
            return $this->rememberError($lookup, 'zero_results', $httpCode, $status, $errorMessage, 0, $bodySnippet);
        }

        $result = $results[0];
        $name = trim((string)($result['name'] ?? ''));
        $formattedAddress = trim((string)($result['formatted_address'] ?? ''));
        $formattedLocation = trim($name . ' ' . $formattedAddress);

        if ($formattedLocation === '') {
            return $this->rememberError($lookup, 'missing_formatted_location', $httpCode, $status, $errorMessage, $resultCount, $bodySnippet);
        }

        if (\function_exists('errlog')) {
            \errlog("Google Maps text search first result: lookup='{$lookup}', place_id='" . ($result['place_id'] ?? '') . "', name='{$name}', formatted_address='{$formattedAddress}'");
        }

        return new GeocodingResult($formattedLocation, 'google', [
            'lookup' => $lookup,
            'resultCount' => $resultCount,
            'placeId' => $result['place_id'] ?? null,
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
            'provider' => 'google',
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
