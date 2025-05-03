<?php
// Debug logging to see where the script fails
error_log('Script started at ' . date('Y-m-d H:i:s'));

require 'vendor/autoload.php';
error_log('Autoloader loaded');

// Load environment variables early
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();
error_log('Dotenv loaded'); // Add log to confirm loading

use GuzzleHttp\Client;
use OpenAI\Exceptions\UnserializableResponse;
use Spatie\PdfToText\Pdf;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use ICal\ICal;
use Opis\JsonSchema\Errors\ValidationError;

// Define cache settings
define('MODEL_CACHE_FILE', __DIR__ . '/.models_cache.json');
define('MODEL_CACHE_DURATION', 7 * 24 * 60 * 60); // 7 days in seconds

ignore_user_abort();
ini_set('display_errors', 'On');
ini_set('error_reporting', E_ALL & ~E_DEPRECATED);

// Add new endpoint for model info
if (isset($_GET['get_models'])) {
    header('Content-Type: application/json');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    echo json_encode(getAvailableModels());
    exit;
}

/** @disregard */
if (
	!function_exists('xdebug_is_debugger_active') ||
	!xdebug_is_debugger_active()
) {
	/** @SuppressWarnings(PHPMD.UnusedFormalParameter)*/
	function exception_error_handler(int $errno, string $errstr, ?string $errfile = null, ?int $errline = null, ?array $errcontext = null) {
		if (!(error_reporting() & $errno)) {
			// This error code is not included in error_reporting
			return;
		}
		throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
	}

	set_error_handler('exception_error_handler');
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	header("HTTP/1.1 204 No Content");
	exit;
}

class EmailProcessor
{
	private $postmarkApiKey;

	private $fromEmail;

	private $inboundConfirmedEmail;
	private $toTentativeEmail;
	private $toConfirmedEmail;

	private $openaiClient;
	private $httpClient;
	private $googleMapsKey;

	private $aiModel;
	private $openRouterKey;
	private $maxTokens = 20000;

	// Available models will be loaded dynamically
	private $availableModels = [];

    public function __construct()
    {
        $this->openRouterKey = $_ENV['OPENROUTER_KEY'];
        $this->postmarkApiKey = $_ENV['POSTMARK_API_KEY'];
		$this->fromEmail = $_ENV['FROM_EMAIL'];
		$this->inboundConfirmedEmail = $_ENV['INBOUND_CONFIRMED_EMAIL'];
		$this->toTentativeEmail = $_ENV['TO_TENTATIVE_EMAIL'];
		$this->toConfirmedEmail = $_ENV['TO_CONFIRMED_EMAIL'];

		$this->googleMapsKey = $_ENV['GOOGLE_MAPS_API_KEY'];

		// Load models (from cache or API)
		$this->availableModels = $this->loadAvailableModels();

		// Set default model based on loaded models
		$this->aiModel = $this->getDefaultModelId();
		// Allow overriding default via environment variable if needed
		if (isset($_ENV['AI_MODEL']) && isset($this->availableModels[$_ENV['AI_MODEL']])) {
			$this->aiModel = $_ENV['AI_MODEL'];
		}

		if (isset($_ENV['MAX_TOKENS'])) {
			$this->maxTokens = $_ENV['MAX_TOKENS'];
		}

		$this->openaiClient = $this->buildAiClient();
		$this->httpClient = new Client([
            'base_uri' => 'https://api.postmarkapp.com',
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-Postmark-Server-Token' => $this->postmarkApiKey,
            ],
        ]);
	}

	/**
	 * Initialize the AI client connection to OpenRouter
	 * 
	 * @return \OpenAI\Client OpenAI client configured for OpenRouter
	 */
	private function buildAiClient()
	{
		$factory = OpenAI::factory();

		// Configure for OpenRouter API 
		$factory->withBaseUri('https://openrouter.ai/api/v1'); // Point to OpenRouter API endpoint
		$factory->withApiKey($this->openRouterKey); // Use OpenRouter key instead of OpenAI key
		// Add recommended headers for OpenRouter
		// $factory->withHttpHeader('HTTP-Referer', $_ENV['SITE_URL'] ?? 'https://example.com'); // Removed - Optional/potentially sensitive
		$factory->withHttpHeader('X-Title', $_ENV['APP_TITLE'] ?? 'Email-to-ICS'); // Help identify app in OpenRouter logs

		return $factory->make();
	}

	/**
	 * Load available models, using cache if available and valid.
	 * Fetches from OpenRouter API if cache is invalid or missing.
	 * 
	 * @return array Associative array of models keyed by ID.
	 */
	public function loadAvailableModels(): array
	{
		if (file_exists(MODEL_CACHE_FILE)) {
			try {
				$cacheContent = file_get_contents(MODEL_CACHE_FILE);
				$cachedData = json_decode($cacheContent, true);

				if (json_last_error() === JSON_ERROR_NONE && isset($cachedData['timestamp']) && (time() - $cachedData['timestamp'] < MODEL_CACHE_DURATION)) {
					errlog("Loading models from valid cache.");
					unset($cachedData['timestamp']); // Don't return timestamp with model data
					return $cachedData['models'] ?? [];
				} else {
					errlog("Model cache is invalid or expired.");
				}
			} catch (\Throwable $e) {
				errlog("Error reading model cache file: " . $e->getMessage());
				// Proceed to fetch from API
			}
		}

		errlog("Fetching available models from OpenRouter API...");
		try {
			// Use a separate Guzzle client for this, as httpClient is for Postmark
			$apiClient = new Client();
			$response = $apiClient->get('https://openrouter.ai/api/v1/models');

			if ($response->getStatusCode() !== 200) {
				$errorMsg = "Failed to fetch models from OpenRouter API. Status code: " . $response->getStatusCode();
				errlog($errorMsg);
				throw new \RuntimeException($errorMsg);
			}

			$apiData = json_decode($response->getBody()->getContents(), true);

			if (json_last_error() !== JSON_ERROR_NONE || !isset($apiData['data']) || !is_array($apiData['data'])) {
				$errorMsg = "Invalid JSON response from OpenRouter models API.";
				errlog($errorMsg);
				throw new \RuntimeException($errorMsg);
			}

			$parsedModels = [];
			foreach ($apiData['data'] as $model) {
				if (empty($model['id'])) continue; // Skip models without an ID

				$supportsVision = false;
				if (isset($model['architecture']['input_modalities']) && is_array($model['architecture']['input_modalities'])) {
					$supportsVision = in_array('image', $model['architecture']['input_modalities']);
				} elseif (isset($model['architecture']['modality']) && str_contains($model['architecture']['modality'], '+image')) {
					$supportsVision = true;
				}

				$parsedModels[$model['id']] = [
					'name' => $model['name'] ?? $model['id'],
					'description' => $model['description'] ?? 'No description available.',
					'vision_capable' => $supportsVision,
					// 'default' will be determined later based on a preferred list or first model
				];
			}

			// Cache the result
			$cacheData = [
				'timestamp' => time(),
				'models' => $parsedModels,
			];
			try {
				file_put_contents(MODEL_CACHE_FILE, json_encode($cacheData, JSON_PRETTY_PRINT));
				errlog("Successfully cached models to " . MODEL_CACHE_FILE);
			} catch (\Throwable $e) {
				errlog("Error writing model cache file: " . $e->getMessage());
			}

			return $parsedModels;

		} catch (\Throwable $e) {
			errlog("Error fetching or processing models from OpenRouter API: " . $e->getMessage());
			// Re-throw the exception instead of returning a fallback
			throw new \RuntimeException("Failed to load models from OpenRouter API: " . $e->getMessage(), 0, $e);
		}
	}

    /**
     * Process a URL to generate an iCal event based on its content
     * 
     * @param string $url The URL to process
     * @param string $downloadedText Pre-downloaded text (optional)
     * @param string $display How to handle the output ('download', 'display', or 'email')
     * @param bool $tentative Whether to mark the event as tentative
     * @param string|null $instructions Additional instructions for the AI
     * @param string|null $screenshot Base64-encoded screenshot (optional)
     * @param string|null $requestedModel Specific AI model to use (optional)
     * @return void
     */
	public function processUrl($url, $downloadedText, $display, $tentative = true, $instructions = null, $screenshot = null, $requestedModel = null)
	{
		if (empty(trim($downloadedText))) {
			if (!$this->is_valid_url($url)) {
				http_response_code(400);
				errlog('BAD url: ' . $url);
				echo 'Bad url!';
				die;
			}

			$downloadedText = $this->fetch_url($url);
		} elseif (substr($downloadedText, 0, 1) === '\'' &&
			substr($downloadedText, -1, 1) === '\''
		) {
			$downloadedText = trim($downloadedText);
			$dec = json_decode($downloadedText);
			if (json_last_error() === JSON_ERROR_NONE)
			{
				$downloadedText = $dec;
			}
		}

		// If a specific model was requested, check if it's valid and override the default
		if ($requestedModel && isset($this->availableModels[$requestedModel])) {
			$this->aiModel = $requestedModel;
			errlog("Using requested model: {$this->aiModel}");
		} else {
			// Ensure a valid default model is set if the requested one is invalid
			$this->aiModel = $this->getDefaultModelId();
			errlog("Requested model '{$requestedModel}' invalid or not provided. Using default model: {$this->aiModel}");
		}

		$downloadedText = $this->extractMainContent($downloadedText);

		// Process screenshot if provided
		$screenshotBase64 = null;
		if ($screenshot) {
			// Remove the data URL prefix if present
			if (strpos($screenshot, 'data:image/') === 0) {
				$screenshotBase64 = substr($screenshot, strpos($screenshot, ',') + 1);
			} else {
				$screenshotBase64 = $screenshot;
			}
			errlog("Screenshot provided: " . substr($screenshotBase64, 0, 50) . "... (" . strlen($screenshotBase64) . " bytes)");
		}

		$combinedText = <<<TEXT
{$url}

--- HTML content fetched from URL above ---
{$downloadedText}
TEXT;

		$calEvent = $this->generateIcalEvent($combinedText, $instructions, $screenshotBase64);
		$ics = $calEvent['ICS'];
		$subject = $calEvent['EmailSubject'];
		if ($display == 'download') {
			$filename = 'event.ics';

			// Set the appropriate headers to initiate download
			header('Content-Type: text/calendar; charset=utf-8');
			header('Content-Disposition: attachment; filename="' . $filename . '"');

			echo $ics;
			exit;
		}

		if ($display == 'display') {
			header('Content-Type: text/plain; charset=utf-8');
			header('Content-Disposition: inline');

			echo $ics;
			exit;
		}

		if ($display != 'email') {
			http_response_code(400);
			echo "Invalid display: {$display}";
			errlog("Invalid display: {$display}");
		}

		$recipientEmail = $tentative ? $this->toTentativeEmail : $this->toConfirmedEmail;
		$htmlBody =  <<<BODY
<p>Please find your iCal event attached.</p>

<p>URL submitted via webform: {$url}</p>
<p>---------- Downloaded HTML (cleaned): ----------</p>
<div>{$downloadedText}</div>
BODY;

		$this->sendEmail($ics, $recipientEmail, $subject, $htmlBody);

		http_response_code(200);
		echo "<h1>Email sent to {$recipientEmail} with ICS file:</h1><pre>";
		echo htmlspecialchars($this->unescapeNewlines($ics));
		echo '</pre>';
		exit;
	}

	protected function extractMainContent(string $html) : string
	{
		// If the html contains a <main> element, extract and return it.
		$doc = \Dom\HTMLDocument::createFromString($html, LIBXML_NOERROR);

		$body = null;
		$elems = ['main', 'article'];
		foreach ($elems as $elem) {
			$elements = $doc->getElementsByTagName($elem);
			if ($elements->length > 0) {
				$body = $this->removeNonTextTags($elements->item(0));
				goto HasBody;
			}
		}

		$bodies = $doc->getElementsByTagName('body');
		if ($bodies->length > 0) {
			$body = $this->removeNonTextTags($bodies->item(0));
			goto HasBody;
		}

		$body = $this->removeNonTextTags($doc->documentElement);
HasBody:

		$this->removeAttributes($body);
		$this->removeEmptyElements($body);

		$this->ensureUtf8($body);

		return $body->innerHTML;
	}

	protected function ensureUtf8(\Dom\Element $body)
	{
		$body->textContent = mb_convert_encoding(
			$body->textContent,
			'UTF-8',
			mb_detect_encoding($body->textContent)
		);
	}

	/**
	 * Removes non-text tags like svg, img, script, style, etc. from HTML content
	 *
	 * @param \Dom\Element $body The body element to clean
	 * @return \Dom\Element The cleaned body element
	 */
	protected function removeNonTextTags(\Dom\Element $body) : \Dom\Element
	{
		// Tags to remove
		$tagsToRemove = [
			'svg', 
			'img', 
			'script', 
			'style', 
			'iframe', 
			'video', 
			'audio', 
			'canvas',
			'object',
			'embed',
			'noscript',
			'map',
			'button',
			'select',
			'option',
			'form',
			'input',
			'textarea',
			'progress',
			'figure',
			'figcaption',
			'picture',
			'source',
			'link',
			'meta',
			'title',
			'track',
			'param',
			'applet',
			'area',
			'base',
			'col',
			'command',
			'dialog',
			'frame',
			'frameset',
			'hr',
			'wbr',
			'slot',
			'template',
			'portal',
		];
		
		// Remove each type of non-text element
		foreach ($tagsToRemove as $tag) {
			$elements = $body->getElementsByTagName($tag);
			// We need to remove elements in reverse order because the NodeList is live
			for ($i = $elements->length - 1; $i >= 0; $i--) {
				$element = $elements->item($i);
				if ($element->parentNode) {
					// Remove the element from its parent
					$element->parentNode->removeChild($element);
				}
			}
		}
		
		return $body;
	}

	protected function removeAttributes(\Dom\Element $body)
	{
		// Define allowed attributes
		$allowedAttributes = ['class', 'id', 'for'];
		
		// Recursively process all child nodes
		$elements = $body->getElementsByTagName('*');
		// Process in reverse order since the NodeList is live
		for ($i = $elements->length - 1; $i >= 0; $i--) {
			$element = $elements->item($i);
			if ($element) {
				// Remove all attributes except allowed ones
				$attributes = $element->attributes;
				if ($attributes) {
					for ($j = $attributes->length - 1; $j >= 0; $j--) {
						$attrName = $attributes->item($j)->name;
						if (!in_array($attrName, $allowedAttributes)) {
							$element->removeAttribute($attrName);
						} elseif ($attrName === 'class') {
							// Remove jsx- classes
							$classes = explode(' ', $element->getAttribute('class'));
							$filteredClasses = array_filter($classes, function($class) {
								return strpos($class, 'jsx-') !== 0;
							});
							$element->setAttribute('class', implode(' ', $filteredClasses));
						}
					}
				}
			}
		}
		
		// Also remove attributes from the body element itself except allowed ones
		$attributes = $body->attributes;
		if ($attributes) {
			for ($j = $attributes->length - 1; $j >= 0; $j--) {
				$attrName = $attributes->item($j)->name;
				if (!in_array($attrName, $allowedAttributes)) {
					$body->removeAttribute($attrName);
				} elseif ($attrName === 'class') {
					// Remove jsx- classes from body element
					$classes = explode(' ', $body->getAttribute('class'));
					$filteredClasses = array_filter($classes, function($class) {
						return strpos($class, 'jsx-') !== 0;
					});
					$body->setAttribute('class', implode(' ', $filteredClasses));
				}
			}
		}
	}

	protected function removeEmptyElements(\Dom\Element $body)
	{
		$elements = $body->getElementsByTagName('*');
		for ($i = $elements->length - 1; $i >= 0; $i--) {
			$element = $elements->item($i);
			if ($element->childNodes->length === 0 && $element->textContent === '') {
				if ($element->parentNode) {
					// Remove the empty element from its parent
					$element->parentNode->removeChild($element);
				}
			} else {
				// Recursively remove empty elements from child nodes
				$this->removeEmptyElements($element);
			}
		}
	}

	protected function unescapeNewlines($str)
	{
		return str_replace('\n', "\n",
			str_replace('\r\n', "\n",
				$str
			)
		);
	}

    public function processPostmarkRequest($body)
	{
		errlog("Received email with subject of " . $body['Subject']);

		if (
			strpos($body['Subject'], 'Accepted:') === 0 ||
			strpos($body['Subject'], 'Declined:') === 0 ||
			strpos($body['Subject'], 'Tentative:') === 0
		) {
			errlog('Skipping response email with subject ' . $body['Subject']);
			return;
		}
        $emailText = $body['TextBody'];
		$pdfText = $this->extractPdfText($body['Attachments'] ?? []);

        // Extract URL and instructions from email body
        $url = null;
        $instructions = null;
        $lines = explode("\n", $emailText);
        $remainingLines = [];

        foreach ($lines as $line) {
            if (preg_match('/^URL:\s*(.+)$/i', $line, $matches)) {
                $url = trim($matches[1]);
            } elseif (preg_match('/^Instructions:\s*(.+)$/i', $line, $matches)) {
                $instructions = trim($matches[1]);
            } else {
                $remainingLines[] = $line;
            }
        }
        
        // If no explicit URL found, check if the entire text is a URL
        if (!$url && $this->is_valid_url(trim($emailText))) {
            $url = trim($emailText);
        }

        $combinedText = implode("\n", $remainingLines);
        if ($pdfText) {
            $combinedText .= "\n\n--- Extracted from PDF Attachment ---\n\n" . $pdfText;
		}

		$downloadedText = null;
		if ($url) {
			$downloadedText = $this->fetch_url($url);

			$combinedText .= "\n\n--- HTML fetched from URL above ---\n\n";
			$combinedText .= $downloadedText;
		}

        $ret = $this->generateIcalEvent($combinedText, $instructions);

        $calendarEvent = $ret['ICS'];
        $subject = $ret['EmailSubject'];
		$recipientEmail = $this->toTentativeEmail;

		if (strcasecmp($body['ToFull'][0]['Email'], $this->inboundConfirmedEmail) === 0) {
			$recipientEmail = $this->toConfirmedEmail;
		}

        $this->sendEmailWithAttachment($recipientEmail, $calendarEvent, $subject, $body, $pdfText, $downloadedText);

        echo json_encode(['status' => 'success', 'message' => 'Email processed successfully', 'ics' => $calendarEvent]);
	}

	private function is_valid_url($text) : bool
	{
		// Trim the input to remove any leading/trailing whitespace
		$trimmedText = trim($text);

		// Regular expression to validate HTTP/HTTPS URLs
		$pattern = '/^(https?:\/\/[^\s]+)$/i';

		// Check if the input matches the URL pattern
		return preg_match($pattern, $trimmedText);
	}

	private function fetch_url($url) {
		// Validate URL before attempting to fetch the content
		if (!filter_var($url, FILTER_VALIDATE_URL)) {
			return false;
		}

		// Use Guzzle to get the HTML content, adding appropriate headers to make
		// it look like the request is coming from a browser
		$client = new Client();
		$response = $client->get($url, [
			'headers' => [
				'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
			],
		]);

		$htmlContent = $response->getBody()->getContents();

		// Check if the fetching was successful
		if ($htmlContent === FALSE) {
			return false;
		}

		return $htmlContent;
	}

	private function extractPdfText($attachments)
	{
		foreach ($attachments as $attachment) {
			if ($attachment['ContentType'] === 'application/pdf') {
				$pdfContent = base64_decode($attachment['Content']);
				$tempPdfPath = sys_get_temp_dir() . '/' . uniqid() . '.pdf';
                file_put_contents($tempPdfPath, $pdfContent);

                try {
                    $pdfText = (new Pdf())->setPdf($tempPdfPath)->text();
                    unlink($tempPdfPath); // Clean up temp file
                    return $pdfText;
                } catch (Exception $e) {
                    errlog("Error extracting PDF text: " . $e->getMessage());
                }
            }
        }
        return null;
    }

    /**
     * Generate an ICS calendar event from text content
     * 
     * Uses AI to extract event details from text and generate a structured calendar event
     * 
     * @param string $combinedText Text content to process
     * @param string|null $instructions Additional instructions for the AI
     * @param string|null $screenshot Base64-encoded screenshot for vision models
     * @return array Array containing ICS content and metadata
     */
    private function generateIcalEvent($combinedText, $instructions = null, $screenshot = null)
	{
		// Define the NEW schema for structured event data
		$eventSchema = [
			'type' => 'object',
			'properties' => [
				'summary' => ['type' => 'string', 'description' => 'Concise title for the event.'],
				'description' => ['type' => 'string', 'description' => 'Plain text description of the event (use \\n for newlines).'],
				'htmlDescription' => ['type' => 'string', 'description' => 'HTML formatted version of the description. REQUIRED - convert plain text to HTML if needed.'],
				'dtstart' => ['type' => 'string', 'description' => 'Start date/time in ISO 8601 format (e.g., 2024-10-28T06:30:00).'],
				'dtend' => ['type' => 'string', 'description' => 'End date/time in ISO 8601 format (e.g., 2024-10-28T07:00:00). Optional, defaults based on event type if missing.'],
				'timezone' => ['type' => 'string', 'description' => 'PHP Timezone identifier (e.g., America/Los_Angeles, America/New_York, UTC).'],
				'location' => ['type' => 'string', 'description' => 'Physical location or address of the event.'],
				'url' => ['type' => 'string', 'description' => 'URL related to the event (e.g., event page, ticket link).'],
				'isAllDay' => ['type' => 'boolean', 'description' => 'True if this is an all-day event (dtstart/dtend should be date only: YYYY-MM-DD).'],
				// Add other relevant fields like ORGANIZER, ATTENDEE, UID if needed, but keep it simple initially
			],
			'required' => ['summary', 'description', 'htmlDescription', 'dtstart', 'dtend', 'timezone', 'location', 'url', 'isAllDay'],
			'additionalProperties' => false
		];

		$responseSchema = [
			'type' => 'object',
			'properties' => [
				'success' => ['type' => 'boolean'],
				'errorMessage' => ['type' => 'string'],
				'eventData' => $eventSchema,
				'emailSubject' => ['type' => 'string', 'description' => 'The generated summary, used for the email subject line.'],
				'locationLookup' => ['type' => 'string', 'description' => 'Location string for Google Maps lookup.'],
			],
			'required' => ['success', 'errorMessage', 'eventData', 'emailSubject', 'locationLookup'],
			'additionalProperties' => false,
		];

		$curYear = date('Y');
		$curDate = date('m/d');
		$nextYear = $curYear + 1;

		$system = <<<PROMPT
Create calendar event data from the following email text or downloaded HTML.

# PRIMARY EVENT IDENTIFICATION - READ THIS FIRST
Your primary task is to identify and extract ONLY the MAIN event described in the content.

How to identify the primary event:
- It's typically the most prominently featured and detailed event
- It's often the first event described in detail
- It's usually the subject of the email or central content of the webpage
- For ticketed events, it's the event for which the ticket/confirmation is issued

Explicitly IGNORE these secondary events:
- Events labeled as "Related Events", "You might also like", "Upcoming Events", "Other shows"
- Events in sidebars or supplementary sections
- Events mentioned only in passing or with minimal details
- Any event clearly not the focus of the email/page

EXTREMELY IMPORTANT: IF you find multiple events and are unsure which is primary, choose the event with:
1. The most complete details (date, time, location)
2. The earliest upcoming date
3. The most prominence in the content

ONLY create multiple VEVENT blocks if the content is explicitly a schedule or calendar listing with NO single primary event (e.g., a multi-day conference schedule or festival lineup).

# TIMEZONE AND LOCATION EMPHASIS
If a location is specified (e.g., New York City, Madison, San Francisco), infer the appropriate timezone immediately.
If no location is found in the content, default to Pacific Time.
If a date is given but no specific time, set 'isAllDay' to true and format dtstart/dtend as 'YYYY-MM-DD'.

# IGNORE SPONSOR OR POLICY DISCLAIMERS
Do not include details about sponsors or policy disclaimers unless they are explicitly part of the main event content.

# OUTPUT FORMAT - JSON STRUCTURE
Return a JSON object containing the structured event data. DO NOT return an ICS file string.
The JSON object MUST conform EXACTLY to the following schema:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "errorMessage": { "type": "string", "description": "Error message if success is false." },
    "eventData": {
      "type": "object",
      "properties": {
        "summary": { "type": "string", "description": "Concise title for the event." },
        "description": { "type": "string", "description": "Plain text description (use \\\\n for newlines)." },
        "htmlDescription": { "type": "string", "description": "HTML formatted version of the description. REQUIRED - convert plain text to HTML if needed." },
        "dtstart": { "type": "string", "description": "Start date/time (ISO 8601: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD for all-day)." },
        "dtend": { "type": "string", "description": "End date/time (ISO 8601: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD for all-day). Optional." },
        "timezone": { "type": "string", "description": "PHP Timezone ID (e.g., America/Los_Angeles)." },
        "location": { "type": "string", "description": "Physical location/address." },
        "url": { "type": "string", "description": "Related URL." },
        "isAllDay": { "type": "boolean", "description": "True for all-day events.", "default": false }
      },
      "required": ["summary", "description", "dtstart", "timezone"]
    },
    "emailSubject": { "type": "string", "description": "Use the generated summary here." },
    "locationLookup": { "type": "string", "description": "Location string for Google Maps lookup." }
  },
  "required": ["success", "errorMessage", "eventData", "emailSubject", "locationLookup"]
}
```

# FIELD SPECIFIC INSTRUCTIONS
- **summary:** Generate a relevant title (e.g., "Dr. White Appointment", "SF Symphony Concert - Beethoven").
- **description:** Create a concise plain-text summary. Use `\\n` for newlines. Keep under 1000 chars. DO NOT include raw HTML. For flights, include Flight #, Confirmation #, Departure/Arrival details. Include Eventbrite ticket links prominently if found.
- **htmlDescription:** (Optional) Include relevant original HTML snippets here (under 1500 chars).
- **dtstart / dtend:** Use ISO 8601 format. Calculate end time if missing (2h default, 3h opera, 30m doctor). Use YYYY-MM-DD format ONLY if `isAllDay` is true.
- **timezone:** Provide a valid PHP Timezone identifier (e.g., `America/Los_Angeles`, `America/New_York`, `UTC`). Infer from location if possible, default to `America/Los_Angeles` if unknown/virtual.
- **location:** The venue name or address.
- **url:** Link to event page, tickets, etc.
- **isAllDay:** Set to true only if no specific start/end times are found.
- **emailSubject:** Should be identical to the `summary`.
- **locationLookup:** A string suitable for searching on Google Maps (e.g., "Moscone Center, San Francisco, CA").

# DATE AND TIMEZONE HANDLING - CRITICAL INSTRUCTIONS
When parsing dates and timezones from the content:

1. If the year IS explicitly mentioned, use that year.

2. If the year is NOT explicitly mentioned:
   - Use {$curYear} (current year) if the date is ON or AFTER today ({$curDate})
   - Use {$nextYear} (next year) if the date is BEFORE today ({$curDate})

3. For timezone determination:
   - If a location is provided, infer the appropriate timezone based on that location:
     * Eastern Time: New York, Boston, Miami, Atlanta, Washington DC, Florida, etc.
     * Central Time: Chicago, Dallas, Houston, Memphis, Minneapolis, New Orleans, etc.
     * Mountain Time: Denver, Salt Lake City, Phoenix, Albuquerque, etc.
     * Pacific Time: Los Angeles, San Francisco, Seattle, Portland, San Diego, etc.
     * Hawaii-Aleutian Time: Hawaii, Honolulu, etc.
     * Alaska Time: Anchorage, Juneau, etc.
   - For international locations, determine the appropriate timezone for that region
   - Only default to Pacific Time if the location is unknown or unclear
   - For virtual/online events with no specific location, use Pacific Time

4. Make sure to use the correct timezone abbreviation based on the date (e.g., PDT vs PST for Pacific)

5. Be aware that many events are scheduled months in advance, so carefully check if dates are in the past relative to today.

6. If multiple dates are mentioned, prioritize dates that are explicitly associated with the primary event.

***IF NO DATES ARE FOUND ANYWHERE IN THE EMAIL, RETURN success = false with an error message of "Email didn't contain dates or times". Ignore dates of the incoming email or forwarded messages. This overrides any directives above. ***

# *** SPECIAL USER INSTRUCTIONS ***
IF the next message block starts with "*** EXTREMELY IMPORTANT INSTRUCTIONS ***", treat those instructions as EXTREMELY HIGH PRIORITY. They should be given strong preference when they provide specific guidance about how to interpret or process the content. While the general rules above still apply, these instructions provide critical context or clarification for this specific request.
PROMPT;

			$messages = [
				[
					'role' => 'system',
					'content' => $system
				],
			];

			if ($instructions) {
				$messages[] = [
					'role' => 'system',
					'content' => "*** EXTREMELY IMPORTANT INSTRUCTIONS ***\n" . $instructions
				];
			}

			// Check if we have a screenshot and if the model supports vision
			$hasScreenshot = !empty($screenshot);
			$modelSupportsVision = $this->doesModelSupportVision();
			
			$userContent = [];
			$userContent[] = [
				'type' => 'text',
				'text' => $combinedText
			];

			if ($hasScreenshot && $modelSupportsVision) {
				errlog("Adding screenshot to request for vision model {$this->aiModel}");
				$userContent[] = [
					'type' => 'image_url',
					'image_url' => [
						'url' => 'data:image/jpeg;base64,' . $screenshot,
					]
				];
			} elseif ($hasScreenshot && !$modelSupportsVision) {
				errlog("Screenshot provided but model {$this->aiModel} does not support vision. Ignoring screenshot.");
			}

			$messages[] = [
				'role' => 'user',
				'content' => $userContent
			];

			$data = [
				'model' => $this->aiModel,
				'messages' => $messages,
				'response_format' => [
					'type' => 'json_schema',
					'json_schema' =>  [
						'name' => 'cal_response_structured',
						'strict' => true,
						'schema' => $responseSchema,
					],
				],
				'reasoning' => [
					'effort' => 'high'
				],
				'max_tokens' => $this->maxTokens,
			];

			errlog('Sending OpenRouter request to model: ' . $this->aiModel);
			try
			{
				$response = $this->openaiClient->chat()->create($data);
			}
			catch (UnserializableResponse $e)
			{
				errlog("OpenRouter UnserializableResponse: " . $e->getMessage());
				http_response_code(500);
				echo "<h1>Error communicating with AI Provider</h1><p>Could not decode the response.</p>";
				echo '<pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
				die;
			}
			catch (\OpenAI\Exceptions\ErrorException $e) {
				errlog("OpenRouter API Error: " . $e->getMessage());
				http_response_code(500);
				echo "<h1>Error communicating with AI Provider</h1>";
				echo '<p>Details: ' . htmlspecialchars($e->getMessage()) . '</p>';
				die;
			}
			catch (\Throwable $e) {
				errlog("General Error during OpenRouter request: " . $e->getMessage());
				throw $e;
			}

			errlog('Received OpenRouter response.');

			$returnedData = $response['choices'][0]['message']['content'];
			// $jsonData = trim($returnedData); // Old simple trim

			// Use regex to extract JSON block, handling potential markdown fences and surrounding text
			$jsonData = null;
			if (preg_match('/```json\s*({.*?})\s*```/is', $returnedData, $matches)) {
				$jsonData = $matches[1];
				errlog("Extracted JSON using ```json fences.");
			} elseif (preg_match('/({\s*"success":.*?})/is', $returnedData, $matches)) {
				// Fallback: Try to find the JSON object directly if no fences are present
				// This regex looks for the start of our expected structure {"success":...
				$jsonData = $matches[1];
				errlog("Extracted JSON using direct object match.");
			} else {
				// If no JSON block found, use the trimmed data as a last resort (might still fail)
				errlog("Could not extract JSON block reliably, using trimmed response.");
				$jsonData = trim($returnedData);
			}

			// Basic JSON decoding, rely on response_format for structure
			$ret = json_decode($jsonData, true, 512, JSON_INVALID_UTF8_IGNORE);

			if (json_last_error() != JSON_ERROR_NONE) {
				$err = json_last_error_msg();
				errlog("AI returned invalid JSON despite requesting JSON format:\nError: {$err}\nRaw Response: {$jsonData}");
				http_response_code(500);
				echo "<h1>AI did not return valid JSON</h1>";
				echo '<p>Error: ' . htmlspecialchars($err) . '</p>';
				echo '<pre>' . htmlspecialchars($this->unescapeNewlines($jsonData)) . '</pre>';
				die;
			}

			if (isset($ret['success']) && $ret['success'] === false) {
				$errorMessage = $ret['errorMessage'] ?? 'AI indicated failure with no specific message.';
				errlog("AI returned success = false: {$errorMessage}\nJSON: {$jsonData}");
				http_response_code(500);
				echo "<h1>AI Processing Error</h1>";
				echo '<p>' . htmlspecialchars($errorMessage) . '</p>';
				echo '<pre>' . htmlspecialchars($this->unescapeNewlines($jsonData)) . '</pre>';
				die;
			}

			if (empty($ret['eventData']['summary'] ?? null)) {
				errlog("AI response missing required 'eventData.summary'. JSON: {$jsonData}");
				http_response_code(500);
				echo "<h1>AI response missing required event summary.</h1>";
				echo '<pre>' . htmlspecialchars($jsonData) . '</pre>';
				die;
			}
			if (empty($ret['emailSubject'] ?? null)) {
				errlog("AI response missing required 'emailSubject'. JSON: {$jsonData}");
				http_response_code(500);
				echo "<h1>AI response missing required email subject.</h1>";
				echo '<pre>' . htmlspecialchars($jsonData) . '</pre>';
				die;
			}

			if (!empty($ret['locationLookup'])) {
				try {
					$place = $this->getGoogleMapsLink($ret['locationLookup']);
					errlog("Google maps lookup for '{$ret['locationLookup']}' returned '{$place}'");
					if ($place && isset($ret['eventData'])) {
						// Update the location within the eventData structure
						$ret['eventData']['location'] = $place;
					}
				} catch (Throwable $e) {
					errlog("Error(s) doing google maps lookup: " . var_export($e, true));
				}
			}

			$icsString = $this->convertJsonToIcs($ret['eventData']);
			
			$ret['ICS'] = $icsString;
			unset($ret['eventData']);

			return $ret;
	}

    /**
     * Converts structured event data (from AI JSON) into an RFC 5545 ICS string.
     *
     * @param array $eventData Associative array conforming to the eventSchema.
     * @return string The generated ICS content.
     * @throws Exception If required fields are missing or dates are invalid.
     */
    private function convertJsonToIcs(array $eventData): string
    {
        $uid = date('Ymd-His') . '@calendar.postmark.justin-c.com';
        $dtstamp = gmdate('Ymd\THis\Z');

        $tzid = $eventData['timezone'] ?? 'America/Los_Angeles';

        if (empty($eventData['summary']) || empty($eventData['dtstart']) || empty($tzid)) {
            throw new Exception('Missing required event data for ICS conversion (summary, dtstart, timezone).');
        }

        $isAllDay = $eventData['isAllDay'] ?? false;

        // Format DTSTART
        try {
            $dtStartObj = new DateTime($eventData['dtstart'], $isAllDay ? null : new DateTimeZone($tzid));
            if ($isAllDay) {
                $dtstartFormatted = "DTSTART;VALUE=DATE:" . $dtStartObj->format('Ymd');
            } else {
                $dtstartFormatted = "DTSTART;TZID={$tzid}:" . $dtStartObj->format('Ymd\THis');
            }
        } catch (\Throwable $e) {
            throw new Exception("Invalid dtstart format: {$eventData['dtstart']} - " . $e->getMessage());
        }

        // Format DTEND
        $dtendFormatted = '';
        if (!empty($eventData['dtend'])) {
             try {
                $dtEndObj = new DateTime($eventData['dtend'], $isAllDay ? null : new DateTimeZone($tzid));
                 if ($isAllDay) {
                    // For all-day events, DTEND is the day AFTER the last day
                    $dtEndObj->modify('+1 day');
                    $dtendFormatted = "DTEND;VALUE=DATE:" . $dtEndObj->format('Ymd');
                } else {
                    $dtendFormatted = "DTEND;TZID={$tzid}:" . $dtEndObj->format('Ymd\THis');
                }
            } catch (\Throwable $e) {
                throw new Exception("Invalid dtend format: {$eventData['dtend']} - " . $e->getMessage());
            }
        } elseif (!$isAllDay) {
             // Calculate default duration if DTEND is missing and not all-day
            $dtEndObj = clone $dtStartObj;
            // Basic duration logic (can be expanded based on summary keywords)
            $durationHours = 2;
            if (stripos($eventData['summary'], 'opera') !== false) $durationHours = 3;
            elseif (stripos($eventData['summary'], 'doctor') !== false || stripos($eventData['summary'], 'appointment') !== false) $durationHours = 0.5;
            $dtEndObj->modify('+' . ($durationHours * 3600) . ' seconds');
            $dtendFormatted = "DTEND;TZID={$tzid}:" . $dtEndObj->format('Ymd\THis');
        }


        $icsLines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Email-to-ICS via OpenRouter by Justin//NONSGML//EN",
            "BEGIN:VEVENT",
            "UID:{$uid}",
            "DTSTAMP:{$dtstamp}",
            $dtstartFormatted,
        ];

        if ($dtendFormatted) {
            $icsLines[] = $dtendFormatted;
        }

        $icsLines[] = $this->foldLine("SUMMARY:" . $this->escapeIcsText($eventData['summary']));
        $icsLines[] = $this->foldLine("DESCRIPTION:" . $this->escapeIcsText($eventData['description']));

        if (!empty($eventData['htmlDescription'])) {
             $icsLines[] = $this->foldLine("X-ALT-DESC;FMTTYPE=text/html:" . $this->escapeIcsText($eventData['htmlDescription']));
        }
        if (!empty($eventData['location'])) {
            $icsLines[] = $this->foldLine("LOCATION:" . $this->escapeIcsText($eventData['location']));
        }
        if (!empty($eventData['url'])) {
            $icsLines[] = $this->foldLine("URL:" . $this->escapeIcsText($eventData['url']));
        }

        $icsLines[] = $this->foldLine("ORGANIZER;CN=\"Email-to-ICS\":mailto:{$this->fromEmail}");

        $icsLines[] = "END:VEVENT";
        $icsLines[] = "END:VCALENDAR";

        return implode("\r\n", $icsLines);
    }

    /**
     * Escapes text according to RFC 5545 requirements.
     * Replaces backslash, comma, semicolon, newline.
     */
    private function escapeIcsText(string $text): string
    {
        $text = str_replace("\\", "\\\\", $text); // Must be first
        $text = str_replace(",", "\\,", $text);
        $text = str_replace(";", "\\;", $text);
        // Newlines are already expected as \n from the AI for the description
        // $text = str_replace("\n", "\\n", $text); // Replace literal newlines if any
        return $text;
    }

    /**
     * Folds a long line according to RFC 5545 (75 octet limit).
     */
    private function foldLine(string $line): string
    {
        $limit = 75;
        $folded = '';
        while (mb_strlen($line, 'UTF-8') > 0) { // Use mb_strlen for UTF-8 safety
            if (mb_strlen($line, 'UTF-8') <= $limit) {
                $folded .= $line;
                break;
            }

            // Find a safe place to fold (prefer before multi-byte chars)
            // Work with byte length for folding limit, but use mb_substr for splitting
            $byteLen = strlen($line);
            $foldPosBytes = 0;
            $charCount = 0;
            $currentBytes = 0;
            while ($currentBytes < $limit && $charCount < mb_strlen($line, 'UTF-8')) {
                 $char = mb_substr($line, $charCount, 1, 'UTF-8');
                 $charBytes = strlen($char);
                 if ($currentBytes + $charBytes > $limit) {
                     break; // Next char would exceed limit
                 }
                 $currentBytes += $charBytes;
                 $foldPosBytes = $currentBytes; // Store byte position of last full char within limit
                 $charCount++;
            }

            if ($foldPosBytes == 0) $foldPosBytes = $limit; // Force fold if first char is too long (unlikely)

            // Extract the segment using byte length, then get the rest using mb_substr
            $segment = substr($line, 0, $foldPosBytes);
            $folded .= $segment . "\r\n "; // Add CRLF + space
            $line = mb_substr($line, mb_strlen($segment, 'UTF-8'), null, 'UTF-8'); // Get remainder based on char count of segment
            $limit = 74; // Subsequent lines start with a space
        }
        return $folded;
    }

    private function sendEmailWithAttachment($toEmail, $ics, $subject, $originalEmail, $pdfText = null, $downloadedText = null)
	{
		$attachments = [];
		if (!empty($originalEmail['Attachments'])) {
			$attachments = array_merge($attachments, $originalEmail['Attachments']);
		}

		$origBody = $originalEmail['HtmlBody'] ?? nl2br($originalEmail['TextBody']);

		$htmlBody =  <<<BODY
<p>Please find your iCal event attached.</p>

<p>
---------- Forwarded message ----------<br>
<b>From</b>: {$originalEmail['FromName']} <{$originalEmail['From']}><br>
<b>Date</b>: {$originalEmail['Date']}<br>
<b>To</b>: {$originalEmail['To']}<br>
<b>Subject</b>: {$originalEmail['Subject']}<br>


{$origBody}
BODY;

		if (!empty($pdfText)) {
			$htmlBody .= <<<BODY


---------- PDF contents ----------<br>
{$pdfText}
BODY;
		}

		if (!empty($downloadedText)) {
			$downloadedText = $this->html_sanitize($downloadedText);
			$htmlBody .= <<<BODY


---------- Downloaded from URL (cleaned)  ----------<br>
<div>
	{$downloadedText}
</div>
BODY;
		}

		$this->sendEmail($ics, $toEmail, $subject, $htmlBody, $attachments);
	}

	public function sendEmail($ics, $toEmail, $subject, $htmlBody, array $otherAttachments = []) {
		$attachments = [];
		if (!empty($ics)) {
			$attachments = array_merge([
				[
					'Name' => 'event.ics',
					'Content' => base64_encode($ics),
					'ContentType' => 'text/calendar',
				],
			], $otherAttachments);
		} else {
			errlog("Attempted to send email with empty ICS content to {$toEmail} with subject '{$subject}'. This indicates an issue upstream.");
		}

		if (empty($subject)) {
			throw new Exception('Subject is empty');
		}

		$request = [
			'From' => $this->fromEmail,
			'To' => $toEmail,
			'Subject' => $subject,
			'HTMLBody' => $htmlBody,
		];

		if (!empty($attachments)) {
			$request['Attachments'] = $attachments;
		}

        $response = $this->httpClient->post('/email', [
            'json' => $request,
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new Exception('Failed to send email via Postmark');
        }

        errlog("Postmark response:\n" . $response->getBody()->getContents());
	}

    /**
     * Query Google Maps API to get a formatted location string
     * 
     * @param string $lookup Location string to look up
     * @return string|null Formatted location or null if not found
     */
	private function getGoogleMapsLink($lookup) {
		$baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";

		$requestUrl = sprintf(
			"%s?query=%s&key=%s",
			$baseUrl,
			urlencode($lookup),
			$this->googleMapsKey
		);

		$ch = curl_init();

		curl_setopt($ch, CURLOPT_URL, $requestUrl);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		$response = curl_exec($ch);

		curl_close($ch);

		$data = json_decode($response, true);

		if (!empty($data['results'])) {
			$result = $data['results'][0];

			return $result['name'] . ' ' . $result['formatted_address'];
		}

		return null;
	}

    /**
     * Sanitize HTML content to remove potentially dangerous elements
     * 
     * @param string $html HTML content to sanitize
     * @return string Sanitized HTML content
     */
	private function html_sanitize($html) : string {
		// By default, an element not added to the allowed or blocked elements
		// will be dropped, including its children
		$config = (new HtmlSanitizerConfig())
			// Allow "safe" elements and attributes. All scripts will be removed
			// as well as other dangerous behaviors like CSS injection
			->allowSafeElements()

		// Allow all static elements and attributes from the W3C Sanitizer API
		// standard. All scripts will be removed but the output may still contain
		// other dangerous behaviors like CSS injection (click-jacking), CSS
		// expressions, ...
			->allowStaticElements()

		// Allow the "div" element, and no attribute can be on it
			->allowElement('div')

		// Allow the "a" element, and the "title" attribute to be on it
			->allowElement('a', ['href', 'title'])

		// Allow the "span" element, and any attribute from the Sanitizer API is allowed
		// (see https://wicg.github.io/sanitizer-api/#default-configuration)
			->allowElement('span', '*')

		// Forcefully set the value of all "rel" attributes on "a"
		// elements to "noopener noreferrer"
			->forceAttribute('a', 'rel', 'noopener noreferrer')

		// Configure which schemes are allowed in links (others will be dropped)
			->allowLinkSchemes(['https', 'http', 'mailto']);

		$sanitizer = new HtmlSanitizer($config);

		return $sanitizer->sanitizeFor('div', $html);
	}

    /**
     * Check if the current model supports vision capabilities
     * 
     * @return bool True if the model supports vision, false otherwise
     */
	private function doesModelSupportVision()
	{
		if (!isset($this->availableModels[$this->aiModel])) {
			errlog("Vision check: Model {$this->aiModel} not found in available models list.");
			return false;
		}
		$supportsVision = $this->availableModels[$this->aiModel]['vision_capable'] ?? false;
		errlog("Vision check: Model {$this->aiModel} supports vision: " . ($supportsVision ? 'Yes' : 'No'));
		return $supportsVision;
	}
	
    /**
     * Get the current model ID
     * 
     * @return string The current model ID
     */
	private function parseCurrentModel()
	{
		return $this->aiModel;
	}

    /**
     * Get the ID of the default model
     * 
     * @return string The default model ID
     */
	public function getDefaultModelId()
	{
		// Define preferred default model
		$preferredDefault = 'anthropic/claude-3.7-sonnet';

		if (isset($this->availableModels[$preferredDefault])) {
			return $preferredDefault;
		}

		// Fallback to the first model in the list if preferred is not available
		if (!empty($this->availableModels)) {
			reset($this->availableModels); // Ensure pointer is at the beginning
			return key($this->availableModels);
		}

		// Absolute fallback if even the static list failed (should not happen)
		errlog("CRITICAL: No models available, cannot determine default.");
		// This case should ideally not be reachable if loadAvailableModels throws an exception
		throw new \RuntimeException("Cannot determine default model as no models were loaded.");
	}

    /**
     * Check if a model ID is valid (exists in our list)
     * 
     * @param string $modelId Model ID to check
     * @return bool True if the model ID is valid, false otherwise
     */
	private function isValidModel($modelId)
	{
		return isset($this->availableModels[$modelId]);
	}

    /**
     * Formats validation errors from Opis/JsonSchema into a more readable array.
     *
     * @param \Opis\JsonSchema\Errors\ValidationError|null $error
     * @return array
     */
    private function formatValidationErrors(?ValidationError $error): array
    {
        if (!$error) {
            return [];
        }
        $formattedErrors = [];
        
        // Basic error info that should always be available
        $errorInfo = [
            'keyword' => $error->keyword(),
            'message' => $error->message()
        ];
        
        // Try to safely add pointer information using regex extraction
        try {
            // For additionalProperties errors, try to extract property names
            if ($error->keyword() === 'additionalProperties' && 
                preg_match('/properties: (.+)/', $error->message(), $matches)) {
                $errorInfo['invalidProperties'] = $matches[1];
            }
            
            // For type errors, try to extract expected vs actual type
            if ($error->keyword() === 'type' && 
                preg_match('/\((.+)\) must match the type: (.+)/', $error->message(), $matches)) {
                $errorInfo['actualType'] = $matches[1];
                $errorInfo['expectedType'] = $matches[2];
            }
            
            // For properties errors, try to extract property info
            if ($error->keyword() === 'properties' && 
                preg_match('/properties must match schema: (.+)/', $error->message(), $matches)) {
                $errorInfo['propertySchema'] = $matches[1];
            }
        } catch (\Throwable $e) {
            $errorInfo['extraInfoError'] = $e->getMessage();
        }
        
        $formattedErrors[] = $errorInfo;

        // Recursively format sub-errors if any
        foreach ($error->subErrors() as $subError) {
            $formattedErrors = array_merge($formattedErrors, $this->formatValidationErrors($subError));
        }
        return $formattedErrors;
    }

	function handleValidationError($validationError, $ret, $responseSchema)
	{
		// Format the errors
		$formattedValidationErrors = $this->formatValidationErrors($validationError);

		// Enhanced debugging: Check for specific validation issues
		$additionalInfo = [];

		// Check for additionalProperties violations
		$hasAdditionalProps = false;
		foreach ($formattedValidationErrors as $error) {
			if ($error['keyword'] === 'additionalProperties') {
				$hasAdditionalProps = true;
				break;
			}
		}

		if ($hasAdditionalProps && isset($ret['eventData']) && is_array($ret['eventData'])) {
			// Find unexpected properties in eventData
			$schemaProps = $responseSchema['properties']['eventData']['properties'] ?? [];
			$unexpectedFields = [];

			foreach ($ret['eventData'] as $key => $value) {
				if (!isset($schemaProps[$key])) {
					$unexpectedFields[] = $key;
				}
			}

			if (!empty($unexpectedFields)) {
				$additionalInfo['unexpectedEventDataFields'] = $unexpectedFields;
			}
		}

		// Log details including formatted errors and failing JSON
		$errorLogDetails = [
			'message' => 'AI response failed initial schema validation',
			'validationErrors' => $formattedValidationErrors,
			'additionalInfo' => $additionalInfo,
			'receivedJson' => $ret,
			'schema' => $responseSchema
		];
		errlog(json_encode($errorLogDetails, JSON_PRETTY_PRINT));
	}
}

// Function to get available models for the extension
function getAvailableModels()
{
	// Instantiate EmailProcessor to access loaded models
	try {
		$processor = new EmailProcessor();
		$modelsData = $processor->loadAvailableModels(); // Use the public loader method
		$defaultModelId = $processor->getDefaultModelId(); // Get the determined default
	} catch (\Throwable $e) {
		errlog("Error initializing EmailProcessor in getAvailableModels: " . $e->getMessage());
		// Return empty list or a hardcoded minimal list on error
		return [
			'models' => [],
			'server_preference' => false // Indicate failure
		];
	}

	$result = [];
	foreach ($modelsData as $modelId => $modelInfo) {
		$result[] = [
			'id' => $modelId, // Use the full OpenRouter ID
			'name' => $modelInfo['name'] ?? $modelId,
			'description' => $modelInfo['description'] ?? 'No description',
			'vision_capable' => $modelInfo['vision_capable'] ?? false,
			'default' => ($modelId === $defaultModelId)
		];
	}

	// Sort by default (default models first), then by name
	usort($result, function($a, $b) {
		if ($a['default'] !== $b['default']) {
			return $a['default'] ? -1 : 1;
		}
		return strcmp($a['name'], $b['name']);
	});

	return [
		'models' => $result,
		'server_preference' => true // Indicates server successfully provided models and a preference
	];
}

class WebPage
{
    public function handleRequest()
    {
        $authorized = $this->checkSessionAuth() || $this->checkBasicAuth();

        if (!$authorized) {
            $this->handleLogin(); // Display a login form instead of requesting basic auth
            return;
        }

        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                $this->displayGetForm();
                break;
			case 'POST':
				file_put_contents(sys_get_temp_dir() . '/post.' . date('Ymd.His'), file_get_contents('php://input'));

                if (isset($_POST['username'], $_POST['password'])) {
                    $this->handleLogin();
                } else {
                    $this->handlePostRequest();
                }
                break;
            default:
                echo 'Unsupported request method.';
        }
    }

    private function checkSessionAuth()
    {
		$pass = $_ENV['HTTP_AUTH_USERNAME'] . $_ENV['HTTP_AUTH_PASSWORD'];
		return (
			isset($_COOKIE['pass']) &&
			password_verify($pass, $_COOKIE['pass'])
		);
    }

    private function checkBasicAuth()
	{
		if (
			isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']) &&
            $_SERVER['PHP_AUTH_USER'] === $_ENV['HTTP_AUTH_USERNAME'] &&
			$_SERVER['PHP_AUTH_PW'] === $_ENV['HTTP_AUTH_PASSWORD']
		) {
			$this->setCookie();
            return true;
		}

        return false;
	}

	private function setCookie()
	{
		$pass = $_ENV['HTTP_AUTH_USERNAME'] . $_ENV['HTTP_AUTH_PASSWORD'];
		setcookie(
			'pass',
			password_hash($pass, PASSWORD_DEFAULT),
			time() + 30*24*60*60
		);

	}

	private function clearCookie()
	{
		setcookie('pass','', -1);
		unset($_COOKIE['pass']);
	}

    private function displayLoginForm()
    {
		echo <<<'HTML'
<form method="post">
	<label for="username">Username:</label>
	<input type="text" id="username" name="username" required>
	<label for="password">Password:</label>
	<input type="password" id="password" name="password" required>
	<button type="submit">Login</button>
</form>
HTML;
    }

    private function handleLogin()
	{
		if (
			($_POST['username'] ?? null) === $_ENV['HTTP_AUTH_USERNAME'] &&
			($_POST['password'] ?? null) === $_ENV['HTTP_AUTH_PASSWORD']
		)
		{
			$this->setCookie();
            $this->displayGetForm(); // Successfully authenticated
		} else {
			http_response_code(401);
			if ($_SERVER['REQUEST_METHOD'] == 'POST') {
				echo '<h1 style="color: red">Invalid credentials. Please try again.</h1>';
			}

            $this->displayLoginForm();
        }
    }

    private function displayGetForm()
    {
        echo file_get_contents(__DIR__ . '/form.html');
    }

    private function handlePostRequest()
	{
		if (isset($_POST['logout'])) {
			$this->clearCookie();
		} elseif (isset($_POST['url'])) {
			$this->processFormSubmission();
		} else {
			$post_data = file_get_contents("php://input");
			$json_data = json_decode($post_data, true);

			if ($this->isPostmarkInboundWebhook($json_data)) {
				$this->processPostmarkInbound($json_data);
			} else {
				http_response_code(400);
				echo "Invalid POST request.";
				errlog('Invalid post request');
				errlog('JSON: ' . $post_data);
				errlog('decoded: ' . var_export($json_data, true));

				die;
			}
		}
    }

    private function processFormSubmission()
    {
		$processor = new EmailProcessor();
		$processor->processUrl(
			$_REQUEST['url'],
			$_REQUEST['html'] ?? '',
			$_REQUEST['display'] ?? 'email',
			$_REQUEST['tentative'] ?? true,
			$_REQUEST['instructions'] ?? null,
			$_REQUEST['screenshot'] ?? null,
			$_REQUEST['model'] ?? null
		);
    }

    private function isPostmarkInboundWebhook($json_data)
    {
        return isset($json_data['MessageStream']) &&
               $json_data['MessageStream'] === 'inbound';
    }

    private function processPostmarkInbound($json_data)
    {
		$processor = new EmailProcessor();
		$processor->processPostmarkRequest($json_data);
	}
}

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

/** @disregard */
if (function_exists('xdebug_is_debugger_active') && xdebug_is_debugger_active()) {
	$page = new WebPage();
	$page->handleRequest();
	exit;
}

ob_start();
try {
	$page = new WebPage();
	$page->handleRequest();
} catch (Throwable $t) {
	// Log the full error server-side regardless
	errlog($t);

	// Check if the request likely came from the extension
	if (isset($_REQUEST['fromExtension'])) {
		http_response_code(500);
		header('Content-type: application/json');
		echo json_encode(['error' => 'Internal Server Error']);
	} else {
		// Respond with detailed HTML error for direct access/other sources
		http_response_code(500); // Still an error
		header('Content-type: text/html');
		echo '<h1>Internal Server Error</h1>';
		echo '<p>An unexpected error occurred. Details have been logged.</p>';
        // Optionally include basic error details for direct debugging
        echo '<hr><p><b>Debug Info (Direct Access):</b></p>';
        echo '<p>Error: ' . htmlspecialchars($t->getMessage()) . '</p>';
        echo '<pre>' . htmlspecialchars(substr($t->getTraceAsString(), 0, 1000)) . '...</pre>'; // Limit trace output
	}

    $err = '<h1>ERROR PROCESSING CALENDAR EVENT</h1>' .
		'<p>Error: <b>' . htmlspecialchars($t->getMessage()) . '</b></p>' .
		'<pre>' . htmlspecialchars(var_export($t, true)) . '</pre>' .
		'<p>Original POST/REQUEST:</p>' .
		'<pre>' . htmlspecialchars(json_encode($_REQUEST)) . '</pre>';

	try {
	    $processor = new EmailProcessor;
	    $processor->sendEmail(null, $_ENV['ERROR_EMAIL'], 'ERROR PROCESSING CALENDAR EVENT', $err);
	} catch (Throwable $emailError) {
	    errlog("Failed to send error email: " . $emailError->getMessage());
	}
}

$out = ob_get_flush();

function dd($var)
{
	ob_end_clean();
	
	http_response_code(505);
	echo '<pre>';
	var_dump($var);
	echo '</pre>';

	die;
}

global $requestId;
$requestId = uniqid('request-');
function errlog($msg)
{
	global $requestId;
	error_log("{$requestId} - {$msg}");
}
