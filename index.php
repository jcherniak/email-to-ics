<?php
// VERY FIRST THING: Log all requests to JSONL file before ANY processing
$request_start_time = microtime(true);
$request_id = uniqid();

// First test if we can write anything at all
$test_write = @file_put_contents('/tmp/cal_requests.jsonl', "TEST " . date('c') . "\n", FILE_APPEND | LOCK_EX);
if ($test_write === false) {
    error_log("CRITICAL: Cannot write to /tmp/cal_requests.jsonl at all");
}

$log_entry = [
    'date' => date('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'request_id' => $request_id,
    'GET' => $_GET,
    'POST' => $_POST,
    'SERVER' => $_SERVER
];

// Try encoding to JSON
$json_data = json_encode($log_entry);
if ($json_data === false) {
    error_log("JSON encoding failed: " . json_last_error_msg());
    // Try with minimal data
    $minimal_entry = [
        'date' => date('c'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'request_id' => $request_id,
        'error' => 'json_encode_failed',
        'json_error' => json_last_error_msg()
    ];
    $json_data = json_encode($minimal_entry);
}

if ($json_data !== false) {
    $log_result = @file_put_contents('/tmp/cal_requests.jsonl', $json_data . "\n", FILE_APPEND | LOCK_EX);
    if ($log_result === false) {
        error_log("Failed to write JSON to /tmp/cal_requests.jsonl");
    } else {
        error_log("Successfully wrote " . $log_result . " bytes to /tmp/cal_requests.jsonl");
    }
}

// Now start debug logging
error_log('Script started at ' . date('Y-m-d H:i:s') . ' - Request ID: ' . $request_id);

ignore_user_abort();
ini_set('display_errors', 'On');
ini_set('error_reporting', E_ALL & ~E_DEPRECATED);

require 'vendor/autoload.php';
require_once 'IcalGenerator.php'; // Include the new generator class
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
use Opis\JsonSchema\Errors\ValidationError;
use App\IcalGenerator; // Use the generator from its namespace

// Define cache settings
define('MODEL_CACHE_FILE', sys_get_temp_dir() . '/.models_cache.json');
define('MODEL_CACHE_DURATION', 7 * 24 * 60 * 60); // 7 days in seconds

// --- Helper: Detect CLI ---
function is_cli() {
    return php_sapi_name() === 'cli';
}

// --- Helper: Log request end time ---
function log_request_end() {
    global $request_start_time;
    $duration = microtime(true) - $request_start_time;
    error_log('Request completed in ' . number_format($duration, 4) . ' seconds');
}

// Register shutdown handler to log request end
register_shutdown_function('log_request_end');

// Add new endpoint for model info
// This needs to be handled within the web request path or made CLI accessible if needed.
// For now, it remains as is, implicitly web-only due to $_GET.
if (isset($_GET['get_models'])) {
    // Consider adding if (!is_cli()) around this block if it should be strictly web.
    header('Content-Type: application/json');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    echo json_encode(getAvailableModels());
    exit;
}

// Test endpoint for auth verification
if (isset($_GET['test_auth'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'authenticated' => true,
        'method' => $_SERVER['REQUEST_METHOD'],
        'auth_type' => isset($_SERVER['PHP_AUTH_USER']) ? 'basic' : 
                     (isset($_POST['username']) ? 'post' : 'session')
    ]);
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

// CORS headers are now properly handled in WebPage::handleRequest()

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
				// In CLI mode, this should throw an exception that the CLI handler catches,
				// rather than trying to output HTTP errors.
				// if (defined('IS_CLI_RUN') && IS_CLI_RUN) { throw new \RuntimeException($errorMsg); }
				throw new \RuntimeException($errorMsg);
			}

			$apiData = json_decode($response->getBody()->getContents(), true);

			if (json_last_error() !== JSON_ERROR_NONE || !isset($apiData['data']) || !is_array($apiData['data'])) {
				$errorMsg = "Invalid JSON response from OpenRouter models API.";
				errlog($errorMsg);
				// if (defined('IS_CLI_RUN') && IS_CLI_RUN) { throw new \RuntimeException($errorMsg); }
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
					'pricing' => [
						'prompt' => $model['pricing']['prompt'] ?? '0.0',
						'completion' => $model['pricing']['completion'] ?? '0.0',
						'request' => $model['pricing']['request'] ?? '0.0',
						// Add image pricing if needed in the future and available
						// 'image' => $model['pricing']['image'] ?? '0.0',
					]
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
			// if (defined('IS_CLI_RUN') && IS_CLI_RUN) { throw new \RuntimeException("Failed to load models from OpenRouter API: " . $e->getMessage(), 0, $e); }
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
     * @param string|null $screenshotViewport Base64-encoded viewport screenshot for vision models
     * @param string|null $screenshotZoomed Base64-encoded zoomed screenshot for vision models
     * @param string|null $requestedModel Specific AI model to use (optional)
     * @param bool $needsReview Whether the event needs review
     * @param bool $fromExtension Whether the request is from an extension
     * @param bool $outputJsonOnly If true and in CLI, output JSON instead of ICS. 
     * @param bool $cliDebug If true and in CLI, output AI request/response to STDERR.
     * @return void
     */
	public function processUrl($url, $downloadedText, $display, $tentative = true, $instructions = null, $screenshotViewport = null, $screenshotZoomed = null, $requestedModel = null, $needsReview = false, $fromExtension = false, $outputJsonOnly = false, $cliDebug = false, $allowMultiDay = false)
	{
        // NOTE TO DEVELOPER: Throughout this method, check (defined('IS_CLI_RUN') && IS_CLI_RUN)
        // before calling http_response_code(), header(), or outputting HTML error messages.
        // For CLI, output plain text errors to STDERR or STDOUT and use exit codes.

        // Ensure that at least one of: URL, downloadedText (HTML), or instructions are provided.
        if (empty(trim($url)) && empty(trim($downloadedText)) && empty(trim((string)$instructions))) {
            $errorMsg = 'Error: Please provide a URL, HTML content, or Instructions.';
            errlog($errorMsg);
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                // echo $errorMsg . "\n"; // Replaced by exception
                // $webPage = new WebPage(); // To access displayCliHelp - not ideal from here
                // $webPage->displayCliHelp();
                throw new \RuntimeException($errorMsg . " Use --help for usage details.");
            } else {
                http_response_code(400);
                echo json_encode(['error' => $errorMsg]); // Send JSON error for web/extension
                exit(1); // Exit for web/extension to prevent further processing
            }
            // No exit(1) here for CLI as exception is thrown
        }

		if (empty(trim($downloadedText)) && !empty(trim($url))) { // Only fetch if URL is given and no downloadedText
			if (!$this->is_valid_url($url)) {
                errlog('BAD url: ' . $url);
                if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                    // echo "Error: Invalid URL provided: {$url}\n"; // Replaced by exception
                    throw new \InvalidArgumentException("Invalid URL provided: {$url}");
                } else {
				    http_response_code(400);
				    echo 'Bad url!';
                    die; 
                }
			}

			$downloadedText = $this->fetch_url($url);
            if ($downloadedText === false) {
                errlog('Failed to fetch URL: ' . $url);
                if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                    // echo "Error: Failed to fetch URL: {$url}\n"; // Replaced by exception
                    throw new \RuntimeException("Failed to fetch URL: {$url}");
                } else {
                    http_response_code(500);
                    echo 'Failed to fetch URL.';
                    die; 
                }
            }
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
			$this->aiModel = $this->getDefaultModelId(); // This can throw if no models available
			errlog("Requested model '{$requestedModel}' invalid or not provided. Using default model: {$this->aiModel}");
		}

		$downloadedText = $this->extractMainContent($downloadedText);

		// Process screenshot if provided
		$screenshotBase64 = null;
		if ($screenshotViewport) {
			// Remove the data URL prefix if present
			if (strpos($screenshotViewport, 'data:image/') === 0) {
				$screenshotBase64 = substr($screenshotViewport, strpos($screenshotViewport, ',') + 1);
			} else {
				$screenshotBase64 = $screenshotViewport;
			}
			errlog("Screenshot provided: " . substr($screenshotBase64, 0, 50) . "... (" . strlen($screenshotBase64) . " bytes)");
		}

		$combinedText = <<<TEXT
{$url}

--- HTML content fetched from URL above ---
{$downloadedText}
TEXT;

		$eventDetails = $this->generateIcalEvent($combinedText, $instructions, $screenshotViewport, $screenshotZoomed, $requestedModel, $cliDebug, $allowMultiDay);

		// Handle --json flag for CLI output if requested - This takes precedence over other CLI outputs.
		if ($outputJsonOnly && defined('IS_CLI_RUN') && IS_CLI_RUN) {
			// $eventDetails here is the direct output from generateIcalEvent
            // Get values first
            $isSuccess = $eventDetails['success'] ?? false;
            $eventDataValue = $eventDetails['eventData'] ?? null; // Get the value or null
            $errorMessageValue = $eventDetails['errorMessage'] ?? '';

            // --- Revised Check for Valid Event Data ---
            $isEventDataValid = false; // Assume invalid initially
            if (isset($eventDataValue) && is_array($eventDataValue) && !empty($eventDataValue['summary'])) {
                 $isEventDataValid = true;
            }
            // Log the result of this simplified check
            errlog("eventData validity check result: " . ($isEventDataValid ? 'VALID' : 'INVALID'));
            // --- End Revised Check ---

			$jsonToPrint = [
				'success'        => $isSuccess,
				'errorMessage'   => $errorMessageValue,
				'eventData'      => $eventDataValue, // Use the fetched value
				'emailSubject'   => $eventDetails['emailSubject'] ?? null,
				'locationLookup' => $eventDetails['locationLookup'] ?? null,
			];

			// We're only concerned about a missing eventData when success is true
			if ($isSuccess && !$isEventDataValid) {
				// AI succeeded but eventData is missing or invalid
				$jsonToPrint['success'] = false;
				$jsonToPrint['errorMessage'] = $errorMessageValue ?: 'Internal error: AI indicated success but eventData structure is missing or invalid (e.g., missing summary).';
				errlog("CRITICAL: eventData invalid/missing structure in --json output despite AI success=true.");
				$jsonToPrint['eventData'] = null;
			} elseif (!$isSuccess && empty($errorMessageValue)) {
				$jsonToPrint['errorMessage'] = 'AI processing failed or did not explicitly succeed; no specific error message provided by AI.';
			}

			if (headers_sent()) {
				errlog("Headers already sent before attempting to send JSON content-type for --json flag.");
			} else {
				header('Content-Type: application/json'); // For good measure / if output is piped
			}
			echo json_encode($jsonToPrint, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
			exit(0);
		}

		// If not outputting JSON directly, proceed with standard logic
		// Generate ICS only if not outputting JSON and if eventData is present and AI was successful
		$ics = null;
		if (($eventDetails['success'] ?? false) && !empty($eventDetails['eventData'])) {
			$generator = new IcalGenerator();
			$ics = $generator->convertJsonToIcs($eventDetails['eventData'], $this->fromEmail);
		} elseif (($eventDetails['success'] ?? false) === false) {
			errlog("Skipping ICS generation because AI processing failed: " . ($eventDetails['errorMessage'] ?? 'Unknown AI error'));
		} else { // Success was true, but eventData was empty/missing
			errlog("Skipping ICS generation because eventData was missing/empty from AI despite success. Error: " . ($eventDetails['errorMessage'] ?? 'eventData missing'));
		}

		$subject = $eventDetails['emailSubject'] ?? 'Calendar Event'; // Use a default subject

		// Check if review is needed AND the request came from the extension
		if ($needsReview && $fromExtension) {
			// Determine recipient email based on tentative flag for review screen
			$recipientEmail = $tentative ? $this->toTentativeEmail : $this->toConfirmedEmail;

			// --- Generate and store confirmation token ---
			$confirmationToken = bin2hex(random_bytes(16)); // Generate a unique token
			$cacheDir = sys_get_temp_dir() . '/confirm_cache';
			if (!is_dir($cacheDir)) {
				mkdir($cacheDir, 0770, true); // Create cache dir if it doesn't exist (adjust permissions if needed)
			}
			$cacheFile = $cacheDir . '/' . $confirmationToken . '.json';
			$dataToStore = [
				'ics' => $ics,
				'recipient' => $recipientEmail,
				'subject' => $subject,
				'timestamp' => time()
			];

			if (file_put_contents($cacheFile, json_encode($dataToStore)) === false) {
				 errlog("Error writing confirmation token cache file: {$cacheFile}");
                 if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                    echo "Error: Failed to store confirmation data.\n";
                 } else {
				    http_response_code(500);
				    echo json_encode(['error' => 'Failed to store confirmation data.']);
                 }
				 exit; // Or exit(1) for CLI
			}
			// --- End Token Handling ---
            $reviewOutput = [
				'needsReview' => true,
				'icsContent' => $ics,
				'emailSubject' => $subject,
				'recipientEmail' => $recipientEmail, // Send intended recipient to extension
				'confirmationToken' => $confirmationToken // Include the token
			];

            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo json_encode($reviewOutput, JSON_PRETTY_PRINT) . "\n";
            } else {
			    header('Content-Type: application/json');
			    echo json_encode($reviewOutput);
            }
			exit; // Stop processing, send JSON back for review
		}

		// --- If not reviewing, proceed with requested action (download/display/email) ---

		if ($display == 'download' || $display == 'display') {
			$filename = 'event.ics';
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                if ($ics === null) {
                    throw new \RuntimeException("ICS data could not be generated. Cannot output to display/download.");
                }
                echo $ics;
            } else {
                if ($ics === null) {
                    http_response_code(500);
                    echo json_encode(['error' => 'ICS data could not be generated.']);
                    exit;
                }
                if ($display == 'download') {
                    header('Content-Type: text/calendar; charset=utf-8');
                    header('Content-Disposition: attachment; filename="' . $filename . '"');
                } else { // display
                    header('Content-Type: text/plain; charset=utf-8');
                    header('Content-Disposition: inline');
                }
			    echo $ics;
            }
			exit;
		}

		if ($display != 'email') {
            errlog("Invalid display: {$display}");
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                // echo "Error: Invalid display mode '{$display}'. Must be 'email', 'download', or 'display'.\n";
                throw new \InvalidArgumentException("Invalid display mode '{$display}'. Must be 'email', 'download', or 'display'. Use --help for options.");
            } else {
			    http_response_code(400);
			    echo "Invalid display: {$display}";
                exit; 
            }
		}

        if ($ics === null) {
            // This implies AI failed or eventData was missing, and it wasn't handled by --json output
            $errorMessage = ($eventDetails['errorMessage'] ?? 'ICS data could not be generated due to an earlier processing error.');
            errlog("Cannot send email because ICS data is null. Error: " . $errorMessage);
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                throw new \RuntimeException("Cannot send email: " . $errorMessage);
            }
            // For web, an error should have ideally been sent already if ICS is null. This is a fallback.
            http_response_code(500);
            echo json_encode(['error' => "Failed to generate event for email: " . $errorMessage]);
            exit;
        }

		$recipientEmail = $tentative ? $this->toTentativeEmail : $this->toConfirmedEmail;
		$htmlBody =  <<<BODY
<p>Please find your iCal event attached.</p>

<p>URL submitted: {$url}</p>
<p>---------- Downloaded HTML (cleaned): ----------</p>
<div>{$downloadedText}</div>
BODY;

		$this->sendEmail($ics, $recipientEmail, $subject, $htmlBody); // This can throw

		// --- Respond based on origin ---
		if ($fromExtension) {
            $successOutput = [
				'status' => 'success',
				'message' => "Email sent successfully to {$recipientEmail}",
				'recipientEmail' => $recipientEmail,
				'emailSubject' => $subject,
				'icsContent' => $ics
			];
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo json_encode($successOutput, JSON_PRETTY_PRINT) . "\n";
            } else {
			    header('Content-Type: application/json');
			    echo json_encode($successOutput);
            }
		} else {
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo "Email sent to {$recipientEmail} with ICS file: {$subject}\n";
                // Optionally print ICS content or path if useful for CLI
            } else {
			    http_response_code(200);
			    echo "<h1>Email sent to {$recipientEmail} with ICS file:</h1><pre>";
			    echo htmlspecialchars($this->unescapeNewlines($ics));
			    echo '</pre>';
            }
		}
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

		$finalHtml = $body->innerHTML;

		// Apply UTF-8 conversion to the final HTML string
		$encoding = mb_detect_encoding($finalHtml, mb_detect_order(), true); // Strict detection
		if ($encoding && $encoding !== 'UTF-8') {
			$finalHtml = mb_convert_encoding($finalHtml, 'UTF-8', $encoding);
		}
		// Ensure it IS UTF-8 even if detection failed or was already UTF-8 (handles potential invalid sequences)
		$finalHtml = mb_convert_encoding($finalHtml, 'UTF-8', 'UTF-8'); 

		return $finalHtml;
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
		$allowedAttributes = ['class', 'id', 'for', 'href']; // <-- Add 'href' here
		
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

            // *** Add check: Never remove <p> tags ***
            if ($element && $element->tagName === 'p') {
                continue; // Skip checking/removing paragraph tags
            }

			if ($element && $element->childNodes->length === 0 && trim($element->textContent) === '') { // Added trim()
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

    public function processPostmarkRequest($body, $outputJsonOnly = false, $cliDebug = false)
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
        
        $htmlBodyForAI = $body['HtmlBody'] ?? '';
        $textBodyForExtraction = $body['TextBody'] ?? '';

        if (empty($htmlBodyForAI) && !empty($textBodyForExtraction)) {
            errlog("Postmark email has no HtmlBody, falling back to TextBody for AI content.");
            $htmlBodyForAI = nl2br(htmlspecialchars($textBodyForExtraction)); // Basic conversion if only text
        }

		$pdfText = $this->extractPdfText($body['Attachments'] ?? []);

        // Extract URL and instructions from the TEXT version of the email body
        $extractedUrl = null;
        $extractedInstructions = null;
        $lines = explode("\n", $textBodyForExtraction);
        // $remainingTextBodyLines = []; // Not strictly needed if HtmlBody is primary

        foreach ($lines as $line) {
            if (preg_match('/^URL:\s*(.+)$/i', $line, $matches)) {
                $extractedUrl = trim($matches[1]);
            } elseif (preg_match('/^Instructions:\s*(.+)$/i', $line, $matches)) {
                $extractedInstructions = trim($matches[1]);
            } // else {
              // $remainingTextBodyLines[] = $line; // Not combining with HTML directly anymore
            // }
        }
        
        // Fallback: If no explicit URL: in TextBody, check if the entire TextBody is a URL
        // This is less likely to be useful if HtmlBody is the primary content but kept for safety.
        if (!$extractedUrl && $this->is_valid_url(trim($textBodyForExtraction))) {
            $extractedUrl = trim($textBodyForExtraction);
        }
        
        // AI-powered URL detection for simple link emails
        if (!$extractedUrl && !empty($textBodyForExtraction)) {
            $extractedUrl = $this->detectUrlInEmailBody($textBodyForExtraction);
        }

        // Start building the combined text for the AI with the email's HTML content first
        $combinedText = "--- Email HTML Content ---\n```html\n" . $htmlBodyForAI . "\n```";

        if ($pdfText) {
            $combinedText .= "\n\n--- Extracted from PDF Attachment ---\n```text\n" . $pdfText . "\n```";
		}

		$downloadedUrlContent = null;
		if ($extractedUrl) {
            errlog("URL found in TextBody: {$extractedUrl}. Fetching...");
			$fetchedContent = $this->fetch_url($extractedUrl); // Returns raw HTML/content
            if ($fetchedContent) {
                $downloadedUrlContent = $this->extractMainContent($fetchedContent); // Cleaned content
    			$combinedText .= "\n\n--- HTML content fetched from URL found in email TextBody ---\n```html\n" . $downloadedUrlContent . "\n```";
            } else {
                errlog("Failed to fetch content from URL found in TextBody: {$extractedUrl}");
            }
		}

        // Pass $extractedInstructions from TextBody as specific instructions to AI
        $eventDetails = $this->generateIcalEvent($combinedText, $extractedInstructions, null, null, null, $cliDebug, false);

        // Handle --json flag for CLI output if requested and in CLI context
        // This check is more for future-proofing if this method is called from a CLI context that sets outputJsonOnly
        if ($outputJsonOnly && defined('IS_CLI_RUN') && IS_CLI_RUN) {
            // $eventDetails here is the direct output from generateIcalEvent
            // Get values first
            $isSuccess = $eventDetails['success'] ?? false;
            $eventDataValue = $eventDetails['eventData'] ?? null; // Get the value or null
            $errorMessageValue = $eventDetails['errorMessage'] ?? '';

            // --- Revised Check for Valid Event Data ---
            $isEventDataValid = false; // Assume invalid initially
            if (isset($eventDataValue) && is_array($eventDataValue) && !empty($eventDataValue['summary'])) {
                 $isEventDataValid = true;
            }
            // Log the result of this simplified check
            errlog("eventData validity check result (Postmark): " . ($isEventDataValid ? 'VALID' : 'INVALID'));
            // --- End Revised Check ---

            $jsonToPrint = [
                'success'        => $isSuccess,
                'errorMessage'   => $errorMessageValue,
                'eventData'      => $eventDataValue, // Use the fetched value
                'emailSubject'   => $eventDetails['emailSubject'] ?? null,
                'locationLookup' => $eventDetails['locationLookup'] ?? null,
            ];

            // We're only concerned about a missing eventData when success is true
            if ($isSuccess && !$isEventDataValid) {
                // AI succeeded but eventData is missing or invalid
                 $jsonToPrint['success'] = false;
                 $jsonToPrint['errorMessage'] = $errorMessageValue ?: 'Internal error: AI indicated success but eventData structure is missing or invalid (e.g., missing summary).';
                 errlog("CRITICAL: eventData invalid/missing structure in Postmark --json output despite AI success=true.");
                 $jsonToPrint['eventData'] = null;
            } elseif (!$isSuccess && empty($errorMessageValue)) {
                 $jsonToPrint['errorMessage'] = 'AI processing failed or did not explicitly succeed; no specific error message provided by AI.';
            }
            
            if (headers_sent()) {
                 errlog("Headers already sent before attempting to send JSON content-type for Postmark --json flag.");
            } else {
                 header('Content-Type: application/json');
            }
            echo json_encode($jsonToPrint, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit(0);
        }

        // If not outputting JSON directly, proceed with standard logic
        // Generate ICS only if not outputting JSON and if eventData is present and AI was successful
        $calendarEvent = null;
        if (($eventDetails['success'] ?? false) && !empty($eventDetails['eventData'])) {
            $generator = new IcalGenerator();
            $calendarEvent = $generator->convertJsonToIcs($eventDetails['eventData'], $this->fromEmail);
        } elseif (($eventDetails['success'] ?? false) === false) {
            errlog("Skipping ICS generation for Postmark email because AI processing failed: " . ($eventDetails['errorMessage'] ?? 'Unknown AI error'));
        } else { // Success was true, but eventData was empty/missing
            errlog("Skipping ICS generation for Postmark email because eventData was missing/empty from AI despite success. Error: " . ($eventDetails['errorMessage'] ?? 'eventData missing'));
        }

        $subject = $eventDetails['emailSubject'] ?? 'Calendar Event'; // Use a default subject
		$recipientEmail = $this->toTentativeEmail;

		if (strcasecmp($body['ToFull'][0]['Email'], $this->inboundConfirmedEmail) === 0) {
			$recipientEmail = $this->toConfirmedEmail;
		}

        $this->sendEmailWithAttachment($recipientEmail, $calendarEvent, $subject, $body, $eventDetails, $pdfText, $downloadedUrlContent);

        echo json_encode(['status' => 'success', 'message' => 'Email processed successfully']); // Original success message for Postmark webhook
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
		$requestOptions = [
			'headers' => [
				'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
			],
		];

		// Add proxy configuration if available
		if (!empty($_ENV['OXYLABS_PROXY']) && !empty($_ENV['OXYLABS_USERNAME']) && !empty($_ENV['OXYLABS_PASSWORD'])) {
			$requestOptions['proxy'] = [
				'http' => 'http://' . $_ENV['OXYLABS_USERNAME'] . ':' . $_ENV['OXYLABS_PASSWORD'] . '@' . $_ENV['OXYLABS_PROXY'],
				'https' => 'http://' . $_ENV['OXYLABS_USERNAME'] . ':' . $_ENV['OXYLABS_PASSWORD'] . '@' . $_ENV['OXYLABS_PROXY'],
			];
			errlog("Using proxy for URL fetch: " . $_ENV['OXYLABS_PROXY']);
		}

		$response = $client->get($url, $requestOptions);
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
     * Uses AI to extract event details and IcalGenerator to create the ICS.
     *
     * @param string|null $combinedText Text content to process
     * @param string|null $instructions Additional instructions for the AI
     * @param string|null $screenshotViewport Base64-encoded viewport screenshot for vision models
     * @param string|null $screenshotZoomed Base64-encoded zoomed screenshot for vision models
     * @param string|null $requestedModel Specific AI model to use (optional)
     * @param bool $cliDebug If true and in CLI, output AI request/response to STDERR.
     * @return array Array containing ICS content and metadata
     */
    private function generateIcalEvent($combinedText, $instructions = null, $screenshotViewport = null, $screenshotZoomed = null, $requestedModel = null, $cliDebug = false, $allowMultiDay = false)
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

        // Determine multi-day handling instructions
        $multiDayInstructions = $allowMultiDay ? 
            "MULTI-DAY MODE ENABLED: If you find multiple related events (like conference sessions, multi-day trips, festival schedules), extract ALL events as separate entries. Each event should have its own summary, dates, and details." :
            "SINGLE EVENT MODE: Focus on extracting ONLY the main/primary event. Ignore secondary or related events.";

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

MULTI-DAY EVENT HANDLING:
{$multiDayInstructions}

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
- **summary:** Generate a relevant title following these formats:
  * For artistic/cultural events: "Venue - Artist/Show" (e.g., "SF Opera - La Boheme", "Stern Grove - The Honeydrops", "Davies Hall - SF Symphony")
  * For concerts with programs: "Venue - Artist - Program" (e.g., "SF Symphony - Sibelius and Mahler", "Taylor Swift Concert")
  * For general events: Keep concise and descriptive (e.g., "Dr. White Appointment")
- **description:** Create a concise plain-text summary with rich details:
  * For artistic events: Highlight featured artists, performers, and full program/repertoire
  * For concerts/opera: Include composer names, piece titles, featured soloists
  * For conferences: Include key speakers and session topics
  * For all events: Include ticket/registration info, preparation requirements, accessibility details
  * Use `\\n` for newlines. Keep under 1000 chars. DO NOT include raw HTML. For flights, include Flight #, Confirmation #, Departure/Arrival details. Include Eventbrite ticket links prominently if found.
- **htmlDescription:** Provide a concise HTML version of the description, ideally under 1500 characters. Use basic HTML tags only (e.g., `<p>`, `<a>`, `<b>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<br>`). DO NOT include `<style>` tags or inline `style` attributes. Minimize complex formatting.
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
IF the next message block starts with "*** EXTREMELY IMPORTANT INSTRUCTIONS ***", treat those instructions as EXTREMELY HIGH PRIORITY. They should be given strong preference when they provide specific guidance about how to interpret or process the content. 
***If the user instructions appear to describe an event themselves (e.g., contain a date, time, location, description), treat THAT text as the primary source for the event, using the HTML content and screenshots mainly for context or missing details (like a precise address if the instructions only mention a venue name).*** Otherwise, follow the instructions as guidance for processing the HTML/screenshots.

# *** SCREENSHOT GUIDANCE (IF PROVIDED) ***
TWO screenshots might be provided: 'viewport' (what was visible initially) and 'zoomed' (attempting to show the whole page).
- PRIORITIZE the 'viewport' screenshot for identifying the MAIN event. It's more likely to reflect the user's focus.
- Use the 'zoomed' screenshot for broader context or if the viewport is missing key details found elsewhere on the page.
- If only one screenshot is provided, use that.

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

        // Check if we have screenshots and if the model supports vision
        $hasScreenshots = !empty($screenshotViewport) || !empty($screenshotZoomed);
        $modelSupportsVision = $this->doesModelSupportVision();
        
        $userContent = [];
        // Always add text first
        $userContent[] = [
            'type' => 'text',
            'text' => $combinedText
        ];

        if ($hasScreenshots && $modelSupportsVision) {
            errlog("Adding screenshot(s) to request for vision model {$this->aiModel}");
            // Add viewport screenshot if available
            if (!empty($screenshotViewport)) {
                $userContent[] = [
                    'type' => 'image_url',
                    'image_url' => [
                        // Optional: Add a label/identifier if the API/model supports it in the future
                        // 'label' => 'viewport_screenshot',
                        'url' => 'data:image/jpeg;base64,' . $screenshotViewport,
                    ]
                ];
            }
            // Add zoomed screenshot if available
            if (!empty($screenshotZoomed)) {
                $userContent[] = [
                    'type' => 'image_url',
                    'image_url' => [
                        // Optional: Add a label/identifier
                        // 'label' => 'zoomed_screenshot',
                        'url' => 'data:image/jpeg;base64,' . $screenshotZoomed,
                    ]
                ];
            }
        } elseif ($hasScreenshots && !$modelSupportsVision) {
            errlog("Screenshot(s) provided but model {$this->aiModel} does not support vision. Ignoring screenshot(s).");
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
						'provider' 
        ];

        if ($cliDebug && defined('IS_CLI_RUN') && IS_CLI_RUN) {
            fwrite(STDERR, "\n--- AI REQUEST DATA (DEBUG) ---\n");
            fwrite(STDERR, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
            fwrite(STDERR, "--- END AI REQUEST DATA ---\n\n");
        }

        errlog('Sending OpenRouter request to model: ' . $this->aiModel);
        try
        {
            $response = $this->openaiClient->chat()->create($data);
        }
        catch (UnserializableResponse $e)
        {
            // Log the exception message, as accessing the raw body is problematic
            errlog("OpenRouter UnserializableResponse: " . $e->getMessage());
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo "Error: AI Provider UnserializableResponse - " . $e->getMessage() . "\n";
            } else {
                http_response_code(500);
                echo "<h1>Error communicating with AI Provider</h1><p>Could not decode the response.</p>";
                echo '<p>This usually means the API returned an unexpected format (e.g., an error object, rate limit info) instead of a valid chat completion.</p>';
                echo '<pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
            }
            die; // Or exit(1) for CLI
        }
        catch (\OpenAI\Exceptions\ErrorException $e) { // Catch API errors specifically
            $errorDetails = $e->getMessage();
            // Attempt to get more structured error details if possible
            // This depends on how ErrorException is structured in the library version
            if (method_exists($e, 'getErrorMessage')) { // Example check
                $errorDetails .= " | Type: " . ($e->getErrorType() ?? 'N/A');
                $errorDetails .= " | Code: " . ($e->getErrorCode() ?? 'N/A');
            }
            errlog("OpenRouter API ErrorException: " . $errorDetails);
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo "Error: AI Provider API Error - " . $errorDetails . "\n";
            } else {
                http_response_code(500);
                echo "<h1>Error communicating with AI Provider (API Error)</h1>";
                echo '<p>Details: ' . htmlspecialchars($errorDetails) . '</p>';
                die; 
            }
        }
        catch (\Throwable $e) {
            errlog("General Error during OpenRouter request: " . $e->getMessage());
            if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
                 echo "Error: General error during AI request - " . $e->getMessage() . "\n";
                 throw $e; // Re-throw for web handler to catch and format, or main CLI handler
            }
            throw $e; // Re-throw for web handler to catch and format
        }

        errlog('Received OpenRouter response.');
        
        $returnedData = $response['choices'][0]['message']['content'];
        // $jsonData = trim($returnedData); // Old simple trim

        if ($cliDebug && defined('IS_CLI_RUN') && IS_CLI_RUN) {
            fwrite(STDERR, "\n--- AI RAW RESPONSE CONTENT (DEBUG) ---\n");
            fwrite(STDERR, $returnedData . "\n"); // Show raw string before JSON extraction attempts
            fwrite(STDERR, "--- END AI RAW RESPONSE CONTENT ---\n\n");
        }

        // Debug: Output token usage and cost if $cliDebug is true
        if ($cliDebug && defined('IS_CLI_RUN') && IS_CLI_RUN) {
            $promptTokens = 0;
            $completionTokens = 0;

            // Access usage data - structure might vary slightly based on exact client library version for OpenRouter
            // Common structures: $response->usage->promptTokens or $response['usage']['prompt_tokens']
            if (isset($response['usage'])) { // Array access
                $promptTokens = $response['usage']['prompt_tokens'] ?? 0;
                $completionTokens = $response['usage']['completion_tokens'] ?? 0;
            } elseif (isset($response->usage) && is_object($response->usage)) { // Object access
                $promptTokens = $response->usage->promptTokens ?? ($response->usage->prompt_tokens ?? 0);
                $completionTokens = $response->usage->completionTokens ?? ($response->usage->completion_tokens ?? 0);
            }
            $totalTokens = $promptTokens + $completionTokens;

            $modelInfo = $this->availableModels[$this->aiModel] ?? null;
            $costString = "N/A (pricing info unavailable for model: {$this->aiModel})";

            if ($modelInfo && isset($modelInfo['pricing'])) {
                $pricePromptPer1k = (float)($modelInfo['pricing']['prompt'] ?? 0);
                $priceCompletionPer1k = (float)($modelInfo['pricing']['completion'] ?? 0);
                $priceRequest = (float)($modelInfo['pricing']['request'] ?? 0);

                $promptCost = ($promptTokens / 1000) * $pricePromptPer1k;
                $completionCost = ($completionTokens / 1000) * $priceCompletionPer1k;
                $totalCalculatedCost = $promptCost + $completionCost + $priceRequest;
                
                $costString = '$' . number_format($totalCalculatedCost, 6);
            } else if (!$modelInfo) {
                errlog("Debug Cost Calc: Model info not found for ID: {$this->aiModel}");
            } else if (!isset($modelInfo['pricing'])){
                errlog("Debug Cost Calc: Pricing info missing for model ID: {$this->aiModel}. Model Data: " . json_encode($modelInfo));
            }

            fwrite(STDERR, "\n--- AI TOKEN USAGE & ESTIMATED COST (DEBUG) ---\n");
            fwrite(STDERR, "Model Used:         " . $this->aiModel . "\n");
            fwrite(STDERR, "Prompt Tokens:      " . $promptTokens . "\n");
            fwrite(STDERR, "Completion Tokens:  " . $completionTokens . "\n");
            fwrite(STDERR, "Total Tokens:       " . $totalTokens . "\n");
            fwrite(STDERR, "Estimated Cost:     " . $costString . "\n");
            fwrite(STDERR, "--- END AI TOKEN USAGE & ESTIMATED COST ---\n\n");
        }

        // --- Improved JSON Extraction Logic ---
        $jsonData = null;
        $decodedJson = null;
        $trimmedData = trim($returnedData);

        // 1. Try direct decoding first (ideal case)
        $decodedJson = json_decode($trimmedData, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decodedJson)) {
            $jsonData = $trimmedData; // Use the directly decoded data
            errlog("Successfully decoded JSON directly from trimmed AI response.");
        } else {
            errlog("Direct JSON decode failed (Error: " . json_last_error_msg() . "). Trying regex fallbacks...");
            // 2. Fallback: Try extracting from ```json fences
            if (preg_match('/```json\s*({.*?})\s*```/is', $returnedData, $matches)) {
                $jsonData = $matches[1];
                $decodedJson = json_decode($jsonData, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decodedJson)) {
                    errlog("Extracted and decoded JSON using ```json fences.");
                } else {
                    errlog("Found ```json fences, but decoding failed (Error: " . json_last_error_msg() . "). Content: " . $jsonData);
                    $jsonData = null; // Reset if decode failed
                    $decodedJson = null;
                }
            }

            // 3. Fallback: Try heuristic regex if still no valid JSON
            if ($jsonData === null && preg_match('/({.*})/s', $trimmedData, $matches)) {
                $jsonData = $matches[1];
                $decodedJson = json_decode($jsonData, true);
                 if (json_last_error() === JSON_ERROR_NONE && is_array($decodedJson)) {
                    errlog("Extracted and decoded JSON using broad heuristic regex {.*}.");
                } else {
                    errlog("Used broad heuristic regex {.*}, but decoding failed (Error: " . json_last_error_msg() . "). Content: " . $jsonData);
                    $jsonData = null; // Reset if decode failed
                    $decodedJson = null;
                }
            }
        }
        // --- End Improved JSON Extraction Logic ---

        // Check if we successfully got valid JSON data
        if ($decodedJson === null) {
            $errorMsg = "Failed to extract or decode valid JSON from AI response.";
            errlog($errorMsg . " Raw Response Snippet: " . substr($returnedData, 0, 500));
            // In CLI mode, throw exception. In web mode, maybe return a structured error?
            // For now, consistent exception for easier debugging.
            throw new \RuntimeException($errorMsg . " Raw Response Snippet: " . substr($returnedData, 0, 500));
            /* Previous approach for potential web error handling:
            return [
                'success' => false,
                'errorMessage' => $errorMsg,
                'eventData' => null,
                'emailSubject' => 'Error: Invalid AI Response',
                'locationLookup' => null
            ];
            */
        }

        // Use the successfully decoded JSON array
        $ret = $decodedJson;


			// NOTE: Validation logic using Opis/JsonSchema was removed in a previous step.
            // Consider re-adding if strict schema validation against $ret is needed here.
            /*
            $validator = new \Opis\JsonSchema\Validator();
            $validationResult = $validator->validate($ret, json_encode($responseSchema));

            if (!$validationResult->isValid()) {
                $validationError = $validationResult->error();
                $this->handleValidationError($validationError, $ret, $responseSchema);
                // Decide how to handle validation failure - e.g., throw, return error structure
                 $errorMsg = "AI response failed schema validation.";
                 errlog($errorMsg . " Validation Errors: " . json_encode($this->formatValidationErrors($validationError)));
                 throw new \RuntimeException($errorMsg);
            }
            */

			if (isset($ret['success']) && $ret['success'] === false) {
				$errorMessage = $ret['errorMessage'] ?? 'AI indicated failure with no specific message.';
				errlog("AI returned success = false: {$errorMessage}\nJSON: {$jsonData}");
				
				// Check if we should retry with alternate model
				if (stripos($errorMessage, "didn't contain dates or times") !== false || 
				    stripos($errorMessage, "didn't contain dates/times") !== false) {
					$alternateModel = $_ENV['ALTERNATE_MODEL'] ?? null;
					if ($alternateModel && $this->aiModel !== $alternateModel && $requestedModel === null) {
						errlog("No dates found, retrying with ALTERNATE_MODEL: {$alternateModel}");
						// Retry with alternate model
						return $this->generateIcalEvent($combinedText, $instructions, $screenshotViewport, $screenshotZoomed, $alternateModel, $cliDebug, $allowMultiDay);
					}
				}
				
                // Keep throwing exception for consistency in CLI
                throw new \RuntimeException("AI processing error: {$errorMessage}. JSON: {$jsonData}");
                /* Web mode alternative:
                return [
                    'success' => false,
                    'errorMessage' => $errorMessage,
                    'eventData' => $ret['eventData'] ?? null, // Return partial data if available?
                    'emailSubject' => $ret['emailSubject'] ?? 'AI Processing Error',
                    'locationLookup' => $ret['locationLookup'] ?? null
                ];
                */
			}

			if (empty($ret['eventData']['summary'] ?? null)) {
				errlog("AI response missing required 'eventData.summary'. JSON: {$jsonData}");
                throw new \RuntimeException("AI response missing required 'eventData.summary'. JSON: {$jsonData}");
			}
			if (empty($ret['emailSubject'] ?? null)) {
				errlog("AI response missing required 'emailSubject'. JSON: {$jsonData}");
                throw new \RuntimeException("AI response missing required 'emailSubject'. JSON: {$jsonData}");
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

			$generator = new IcalGenerator();
			$icsString = $generator->convertJsonToIcs($ret['eventData'], $this->fromEmail);

			$ret['ICS'] = $icsString;

			return $ret; // Return the full structured data including eventData, success, etc.
	}

	private function saveAttachmentWithEventName($attachment, $eventDetails) {
		// Ensure uploads directory exists
		$uploadsDir = __DIR__ . '/uploads';
		if (!is_dir($uploadsDir)) {
			mkdir($uploadsDir, 0755, true);
		}
		
		// Extract event information for filename
		$eventDate = 'unknown-date';
		$eventSummary = 'unknown-event';
		
		if ($eventDetails && isset($eventDetails['eventData'])) {
			$eventData = $eventDetails['eventData'];
			
			// Extract date from dtstart (e.g., "2024-10-28T06:30:00" -> "2024-10-28")
			if (!empty($eventData['dtstart'])) {
				$eventDate = substr($eventData['dtstart'], 0, 10);
			}
			
			// Clean the summary for use in filename
			if (!empty($eventData['summary'])) {
				$eventSummary = $eventData['summary'];
				// Remove special characters and replace spaces with hyphens
				$eventSummary = preg_replace('/[^a-zA-Z0-9\-_\s]/', '', $eventSummary);
				$eventSummary = preg_replace('/\s+/', '-', trim($eventSummary));
				$eventSummary = trim($eventSummary, '-');
			}
		}
		
		// Get original filename
		$originalName = $attachment['Name'] ?? 'attachment';
		
		// Create new filename: EVENTDATE-ONESENTENCEEVENTSUMMARY-ORIGFILENAME
		$newFilename = $eventDate . '-' . $eventSummary . '-' . $originalName;
		$filePath = $uploadsDir . '/' . $newFilename;
		
		// Decode and save the attachment
		if (!empty($attachment['Content'])) {
			$content = base64_decode($attachment['Content']);
			if (file_put_contents($filePath, $content) !== false) {
				return $filePath;
			}
		}
		
		return false;
	}

	private function sendEmailWithAttachment($toEmail, $ics, $subject, $originalEmail, $eventDetails = null, $pdfText = null, $downloadedText = null)
	{
		$attachments = [];
		$attachmentLinks = ''; // Track attachment links for event description
		
		if (!empty($originalEmail['Attachments'])) {
			foreach ($originalEmail['Attachments'] as $attachment) {
				// Save attachment with event-based filename
				$savedPath = $this->saveAttachmentWithEventName($attachment, $eventDetails);
				if ($savedPath) {
					// Add link to event description
					$attachmentLinks .= "\n\nAttachment: " . basename($savedPath);
					
					// Update attachment with new name for email forwarding
					$attachment['Name'] = basename($savedPath);
				}
				$attachments[] = $attachment;
			}
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

		// Add attachment links to ICS description if any attachments were processed
		$updatedIcs = $ics;
		if (!empty($attachmentLinks)) {
			$updatedIcs = $this->addAttachmentLinksToIcs($ics, $attachmentLinks);
		}
		
		$this->sendEmail($updatedIcs, $toEmail, $subject, $htmlBody, $attachments);
	}

	private function addAttachmentLinksToIcs($ics, $attachmentLinks) {
		// Find the DESCRIPTION field in the ICS and append attachment links
		if (preg_match('/DESCRIPTION:(.*?)(?=\r?\n[A-Z]+:|$)/s', $ics, $matches)) {
			$originalDescription = $matches[1];
			$newDescription = $originalDescription . $attachmentLinks;
			
			// Replace the description in the ICS
			$updatedIcs = str_replace(
				'DESCRIPTION:' . $originalDescription,
				'DESCRIPTION:' . $newDescription,
				$ics
			);
			
			return $updatedIcs;
		}
		
		// If no DESCRIPTION found, add one with just the attachment links
		// Insert before END:VEVENT
		if (strpos($ics, 'END:VEVENT') !== false) {
			$updatedIcs = str_replace(
				'END:VEVENT',
				'DESCRIPTION:' . ltrim($attachmentLinks, "\n") . "\nEND:VEVENT",
				$ics
			);
			return $updatedIcs;
		}
		
		// Fallback: return original ICS if we can't parse it
		return $ics;
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
        // 1. Check for DEFAULT_MODEL environment variable
        if (isset($_ENV['DEFAULT_MODEL']) && !empty(trim($_ENV['DEFAULT_MODEL']))) {
            $envDefaultModelId = trim($_ENV['DEFAULT_MODEL']);
            if (isset($this->availableModels[$envDefaultModelId])) {
                errlog("Using DEFAULT_MODEL from environment: {$envDefaultModelId}");
                return $envDefaultModelId;
            } else {
                errlog("Warning: DEFAULT_MODEL '{$envDefaultModelId}' from environment is not in the list of available/allowed models. Falling back.");
            }
        }

        // 2. Define and check hardcoded preferred default model (application's preference)
        $preferredDefault = 'anthropic/claude-3.7-sonnet:thinking';

        if (isset($this->availableModels[$preferredDefault])) {
            errlog("Using hardcoded preferred default model: {$preferredDefault}");
            return $preferredDefault;
        }
        errlog("Warning: Hardcoded preferred default model '{$preferredDefault}' is not in the list of available/allowed models. Falling back further.");

        // 3. Fallback to the first model in the availableModels list
        if (!empty($this->availableModels)) {
            reset($this->availableModels); // Ensure pointer is at the beginning
            $firstAvailableModel = key($this->availableModels);
            errlog("Using first available model as default: {$firstAvailableModel}");
            return $firstAvailableModel;
        }

        // 4. Absolute fallback if no models are available (should ideally not be reached)
        errlog("CRITICAL: No models available, cannot determine default model.");
        // This case should ideally not be reachable if loadAvailableModels throws an exception
        // or if ALLOWED_MODELS is configured such that at least one model is always present.
        throw new \RuntimeException("Cannot determine default model as no models were loaded or allowed.");
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

	private function detectUrlInEmailBody($textBody) {
		// Use gemini-2.5-flash to detect if email body contains just a URL
		errlog("detectUrlInEmailBody called with text body: " . substr($textBody, 0, 200) . "...");
		
		try {
			// Set the model temporarily
			$originalModel = $this->aiModel;
			$urlDetectionModel = $_ENV['URL_DETECTION_MODEL'] ?? 'google/gemini-2.5-flash';
			$this->aiModel = $urlDetectionModel;
			
			errlog("Using model {$this->aiModel} for URL detection");
			
			$messages = [
				[
					'role' => 'system',
					'content' => 'You are a helpful assistant that detects URLs in email bodies. Respond only with valid JSON.'
				],
				[
					'role' => 'user',
					'content' => "Analyze this email body text and determine if it contains just a URL (possibly with minimal text like 'Sent from iPhone/iPad' or similar signatures). If so, extract the URL. If not, return null.\n\nEmail body:\n{$textBody}\n\nRespond with JSON in this format:\n{\"containsUrl\": true/false, \"url\": \"extracted_url_or_null\"}"
				]
			];
			
			$data = [
				'model' => $this->aiModel,
				'messages' => $messages,
				'temperature' => 0.1,
				'max_tokens' => 500
			];
			
			errlog("Sending URL detection request to OpenRouter");
			$response = $this->openaiClient->chat()->create($data);
			$content = $response->choices[0]->message->content;
			errlog("AI response for URL detection: " . $content);
			
			// Restore original model
			$this->aiModel = $originalModel;
			
			// Strip markdown code blocks if present
			$content = trim($content);
			if (preg_match('/^```(?:json)?\s*\n?(.*?)\n?```$/s', $content, $matches)) {
				$content = $matches[1];
			}
			
			$result = json_decode($content, true);
			
			if ($result && isset($result['containsUrl']) && $result['containsUrl'] && !empty($result['url'])) {
				$url = trim($result['url']);
				errlog("AI found URL: {$url}, validating...");
				if ($this->is_valid_url($url)) {
					errlog("AI detected valid URL in email body: {$url}");
					return $url;
				} else {
					errlog("AI found URL but it failed validation: {$url}");
				}
			} else {
				errlog("AI did not detect a URL in the email body");
			}
		} catch (Exception $e) {
			errlog("Error in URL detection: " . $e->getMessage());
			// Restore original model on error
			if (isset($originalModel)) {
				$this->aiModel = $originalModel;
			}
		}
		
		return null;
	}
}

// Function to get available models for the extension
function getAvailableModels()
{
    // $debugLogMessages = []; // REMOVED
	// Instantiate EmailProcessor to access loaded models
	try {
		$processor = new EmailProcessor();
		$allModelsData = $processor->loadAvailableModels(); // Get ALL models first
		$preferredDefaultModelId = $processor->getDefaultModelId(); // Get the ideal default
	} catch (\Throwable $e) {
		$errorMsg = "Error initializing EmailProcessor in getAvailableModels: " . $e->getMessage();
        errlog($errorMsg); // Log to server log
        // $debugLogMessages[] = $errorMsg; // REMOVED
		// Return empty list or a hardcoded minimal list on error
        // For CLI, this function might be called, if it errors, it should inform CLI appropriately.
        // However, the main CLI path instantiates EmailProcessor directly.
		return [
			'models' => [],
			'server_preference' => false, // Indicate failure
            // 'debug_logs' => $debugLogMessages // REMOVED
		];
	}

    // --- Filtering Logic ---
    $allowedModelsCsv = $_ENV['ALLOWED_MODELS'] ?? '';
    // $debugLogMessages[] = "ALLOWED_MODELS from ENV: '{$allowedModelsCsv}'"; // REMOVED
    $filteredModelsData = [];

    if (!empty($allowedModelsCsv)) {
        $allowedModelIds = array_map('trim', explode(',', $allowedModelsCsv));
        $allowedModelIds = array_filter($allowedModelIds); // Remove empty entries from explode
        // Add step to trim potential quotes from each ID
        $allowedModelIds = array_map(function($id) { return trim($id, ' \t\n\r\0\x0B"\''); }, $allowedModelIds);

        // $debugLogMessages[] = "Parsed allowedModelIds array: [" . implode(', ', $allowedModelIds) . "]"; // REMOVED

        if (!empty($allowedModelIds)) {
             // Log ALL available model IDs BEFORE filtering
             $allAvailableIds = array_keys($allModelsData);
             // $debugLogMessages[] = "ALL available model IDs before filtering: [" . implode(', ', $allAvailableIds) . "]"; // REMOVED

             // Filter the fetched models based on allowed IDs (keys)
            $filteredModelsData = array_filter(
                $allModelsData,
                function($modelId) use ($allowedModelIds) { 
                    $isAllowed = in_array($modelId, $allowedModelIds);
                    return $isAllowed;
                },
                ARRAY_FILTER_USE_KEY // Important: filter by the keys (model IDs)
            );
            $filteredIds = array_keys($filteredModelsData);
            // $debugLogMessages[] = "Filtering models based on ALLOWED_MODELS. Allowed IDs: [" . implode(', ', $allowedModelIds) . "]. Filtered Model IDs kept: [" . implode(', ', $filteredIds) . "]"; // REMOVED
        } else {
             // $debugLogMessages[] = "ALLOWED_MODELS environment variable is set but contains no valid IDs after processing. Allowing all models as fallback."; // REMOVED
             errlog("ALLOWED_MODELS environment variable is set but contains no valid IDs after processing. Allowing all models as fallback."); // Keep server log
             $filteredModelsData = $allModelsData; // Fallback to all if CSV is empty/invalid
        }
    } else {
        // $debugLogMessages[] = "ALLOWED_MODELS environment variable not set or empty. Allowing all models."; // REMOVED
        errlog("ALLOWED_MODELS environment variable not set or empty. Allowing all models."); // Keep server log
        $filteredModelsData = $allModelsData; // Allow all if ENV variable is not set
    }
    // --- End Filtering Logic ---

    // --- Proceed with formatting using the FILTERED list ---
	$result = [];
    // Determine the actual default model ID to use after filtering
    $actualDefaultModelId = $preferredDefaultModelId;
    if (!isset($filteredModelsData[$preferredDefaultModelId])) {
         // If the preferred default was filtered out, pick the first available allowed model
        if (!empty($filteredModelsData)) {
            reset($filteredModelsData); // Point to the first element
            $actualDefaultModelId = key($filteredModelsData);
            // $debugLogMessages[] = "Preferred default model '{$preferredDefaultModelId}' was filtered out or not available. Using first available allowed model: '{$actualDefaultModelId}'."; // REMOVED
            errlog("Preferred default model '{$preferredDefaultModelId}' was filtered out or not available. Using first available allowed model: '{$actualDefaultModelId}'."); // Keep server log
        } else {
             $actualDefaultModelId = null; // No models left after filtering
             // $debugLogMessages[] = "Preferred default model '{$preferredDefaultModelId}' was filtered out, and no allowed models remain."; // REMOVED
             errlog("Preferred default model '{$preferredDefaultModelId}' was filtered out, and no allowed models remain."); // Keep server log
        }
    }

	foreach ($filteredModelsData as $modelId => $modelInfo) { // Iterate over the FILTERED data
		$result[] = [
			'id' => $modelId, // Use the full OpenRouter ID
			'name' => $modelInfo['name'] ?? $modelId,
			'description' => $modelInfo['description'] ?? 'No description',
			'vision_capable' => $modelInfo['vision_capable'] ?? false,
			'default' => ($modelId === $actualDefaultModelId) // Compare against the potentially adjusted default
		];
	}

	// Sort by default (default models first), then by name
	usort($result, function($a, $b) {
		if ($a['default'] !== $b['default']) {
			return $a['default'] ? -1 : 1;
		}
		return strcmp($a['name'], $b['name']);
	});

    // $debugLogMessages[] = "Final model count being sent: " . count($result); // REMOVED
	return [
		'models' => $result, // Return the filtered and sorted result
		'server_preference' => true, // Indicates server successfully provided models and a preference
        // 'debug_logs' => $debugLogMessages // REMOVED
	];
}

class WebPage
{
    public function handleRequest()
    {
        // Set CORS headers for all responses
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");

        // Handle OPTIONS preflight requests
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            header("HTTP/1.1 204 No Content");
            exit;
        }
        if (is_cli()) {
            $this->handleCli();
            return;
        }

        // Check if this is a Postmark webhook (bypasses auth)
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $post_data = file_get_contents("php://input");
            $json_data = json_decode($post_data, true);
            
            if ($this->isPostmarkInboundWebhook($json_data)) {
                $this->processPostmarkInbound($json_data);
                return;
            }
        }

        // Check POST credentials first for iOS shortcut support
        $authorized = false;
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['username'], $_POST['password'])) {
            error_log("Checking POST auth: " . $_POST['username']);
            if ($_POST['username'] === $_ENV['HTTP_AUTH_USERNAME'] && 
                $_POST['password'] === $_ENV['HTTP_AUTH_PASSWORD']) {
                $authorized = true;
                $this->setCookie(); // Set cookie for future requests
                error_log("POST auth successful");
            }
        }
        
        // If not authorized via POST, check session and basic auth
        if (!$authorized) {
            $sessionAuth = $this->checkSessionAuth();
            $basicAuth = $this->checkBasicAuth();
            error_log("Auth check - Session: " . ($sessionAuth ? 'true' : 'false') . ", Basic: " . ($basicAuth ? 'true' : 'false'));
            $authorized = $sessionAuth || $basicAuth;
        }

        if (!$authorized) {
            error_log("Authorization failed - sending challenge/form");
            // Always send WWW-Authenticate header for basic auth
            header('WWW-Authenticate: Basic realm="Email to ICS"');
            http_response_code(401);
            
            // For API requests or when explicitly requesting basic auth, return JSON
            if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
                echo json_encode(['error' => 'Authentication required']);
                return;
            }
            // For browsers that don't handle basic auth prompt, show login form
            $this->handleLogin();
            return;
        }

        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                $this->displayGetForm();
                break;
			case 'POST':
				file_put_contents(sys_get_temp_dir() . '/post.' . date('Ymd.His'), file_get_contents('php://input'));
                $this->handlePostRequest();
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
		error_log("checkBasicAuth - PHP_AUTH_USER: " . ($_SERVER['PHP_AUTH_USER'] ?? 'not set'));
		error_log("checkBasicAuth - REMOTE_USER: " . ($_SERVER['REMOTE_USER'] ?? 'not set'));
		error_log("checkBasicAuth - HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'not set'));
		
		// Check both standard and CGI/FastCGI auth methods
		$username = $_SERVER['PHP_AUTH_USER'] ?? $_SERVER['REMOTE_USER'] ?? null;
		$password = $_SERVER['PHP_AUTH_PW'] ?? null;
		
		// For CGI/FastCGI, parse Authorization header
		if (!$username && isset($_SERVER['HTTP_AUTHORIZATION'])) {
			if (preg_match('/^Basic\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
				$decoded = base64_decode($matches[1]);
				error_log("Decoded auth: " . $decoded);
				list($username, $password) = explode(':', $decoded, 2);
			}
		}
		
		error_log("Auth check - username: " . ($username ?? 'null') . " vs expected: " . $_ENV['HTTP_AUTH_USERNAME']);
		
		if ($username === $_ENV['HTTP_AUTH_USERNAME'] && 
		    $password === $_ENV['HTTP_AUTH_PASSWORD']) {
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
			echo "<h1>Logged out successfully</h1>";
			$this->displayLoginForm();
		} elseif (isset($_POST['url'])) {
			$this->processFormSubmission();
		} else {
			// This shouldn't happen as Postmark webhooks are handled earlier
			http_response_code(400);
			echo json_encode(['error' => 'Invalid POST request']);
			errlog('Invalid post request to authenticated endpoint');
		}
    }

    private function processFormSubmission()
    {
			// Detect iOS Shortcuts requests
			$isFromShortcut = isset($_REQUEST['fromShortcut']) || 
							  stripos($_SERVER['HTTP_USER_AGENT'] ?? '', 'Shortcuts') !== false;
			
			$processor = new EmailProcessor();
			$processor->processUrl(
				$_REQUEST['url'],
				$_REQUEST['html'] ?? '',
				$_REQUEST['display'] ?? 'email',
				($_REQUEST['tentative'] ?? '1') === '1', // Convert '1'/'0' back to boolean
				$_REQUEST['instructions'] ?? null,
				$_REQUEST['screenshot_viewport'] ?? null, // Add viewport screenshot
				$_REQUEST['screenshot_zoomed'] ?? null,    // Add zoomed screenshot
				$_REQUEST['model'] ?? null,
				($_REQUEST['review'] ?? '0') === '1',     // Convert '1'/'0' back to boolean
				($_REQUEST['fromExtension'] ?? 'false') === 'true', // Convert string bool to boolean
				false, // $outputJsonOnly - defaults to false for form submissions
				false, // $cliDebug - defaults to false for form submissions
				($_REQUEST['multiday'] ?? '0') === '1'    // Convert '1'/'0' back to boolean
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

    private function handleCli()
    {
        // Define IS_CLI_RUN as true for the context of this execution path.
        // This is important for methods like processUrl which check this constant.
        if (!defined('IS_CLI_RUN')) {
            define('IS_CLI_RUN', true);
        }

        $short_opts = "u:d:t:i:m:r:"; // Added h later for html to avoid conflict with help
        $long_opts = [
            "url:",             // Required: URL to process
            "html::",           // Optional: Pre-downloaded HTML content (used as downloadedText)
            "display::",        // Optional: How to handle output. Default: 'display' (ICS to stdout for CLI)
            "tentative::",      // Optional: Mark as tentative (1 or 0). Default: 1
            "instructions::",   // Optional: Additional instructions for AI
            "model::",          // Optional: Specific AI model to use
            "review::",         // Optional: Needs review (1 or 0). Default: 0
            "screenshot_viewport::", // Optional: Base64 viewport screenshot
            "screenshot_zoomed::",   // Optional: Base64 zoomed screenshot
            "json",                  // Optional: Output raw JSON response instead of ICS (CLI only)
            "postmark-json-file:", // Optional: Process a local JSON file as a Postmark inbound email
            "debug",                 // Optional: Output AI request/response to STDERR (CLI only)
            "help"              // Optional: Show help message
        ];

        // Add 'h:' for html after initial definition to keep help as primary for -h if user types that
        // getopt processes short options case-sensitively.
        // If we want -h for help, it should be defined before -h for html, or html should use a different short opt.
        // For clarity, let's make html content not have a short opt here to avoid conflict with a potential -h for help.
        // The long --html is clear.

        $options = getopt($short_opts, $long_opts);

        if (isset($options['help'])) {
            $this->displayCliHelp();
            exit(0);
        }

        $processor = new EmailProcessor();

        // Check for Postmark JSON file processing first
        if (isset($options['postmark-json-file'])) {
            $filePath = $options['postmark-json-file'];
            if (!file_exists($filePath) || !is_readable($filePath)) {
                // echo "Error: Postmark JSON file not found or not readable: {$filePath}\n"; // Replaced by exception
                throw new \RuntimeException("Postmark JSON file not found or not readable: {$filePath}");
            }
            $fileContent = file_get_contents($filePath);
            if ($fileContent === false) {
                // echo "Error: Could not read Postmark JSON file: {$filePath}\n"; // Replaced by exception
                throw new \RuntimeException("Could not read Postmark JSON file: {$filePath}");
            }
            $jsonData = json_decode($fileContent, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // echo "Error: Invalid JSON in file {$filePath}. " . json_last_error_msg() . "\n"; // Replaced by exception
                throw new \RuntimeException("Invalid JSON in file {$filePath}. " . json_last_error_msg());
            }

            try {
                errlog("Processing Postmark JSON file: {$filePath}");
                $processor->processPostmarkRequest($jsonData, isset($options['json']), isset($options['debug']));
                exit(0); // Success
            } catch (Throwable $e) {
                errlog("Error processing Postmark JSON file {$filePath}: " . $e->getMessage());
                // The main try-catch block in index.php will also catch this and format for CLI.
                // For now, we can output a simpler message and re-throw or let the main handler do it.
                // echo "Error during Postmark JSON file processing: " . $e->getMessage() . "\n"; // Replaced
                // exit(1); // Exit with error, main handler might not be reached if we exit here.
                       // It's better to throw and let the main handler manage uniform error output.
                throw $e; // Re-throw to be caught by the main script's error handler
            }
        }

        // If not processing a Postmark JSON file, proceed with URL/HTML/Instructions logic
        if ((!isset($options['url']) || empty($options['url'])) && 
            (!isset($options['html']) || empty($options['html'])) && 
            (!isset($options['instructions']) || empty($options['instructions']))) {
            // echo "Error: You must provide at least one of --url, --html, or --instructions.\n\n"; // Replaced
            // $this->displayCliHelp(); // Help is good, but exception first
            throw new \InvalidArgumentException("You must provide at least one of --url, --html, or --instructions. Use --help for usage.");
        }

        $url = $options['url'] ?? ''; // Default to empty if not set
        $downloadedText = $options['html'] ?? '';
        $display = $options['display'] ?? 'display';
        $tentative = isset($options['tentative']) ? ($options['tentative'] === '1' || strtolower($options['tentative']) === 'true') : true;
        $instructions = $options['instructions'] ?? null;
        $screenshotViewport = $options['screenshot_viewport'] ?? null;
        $screenshotZoomed = $options['screenshot_zoomed'] ?? null;
        $requestedModel = $options['model'] ?? null;
        $needsReview = isset($options['review']) ? ($options['review'] === '1' || strtolower($options['review']) === 'true') : false;
        $fromExtension = false; // This is a direct CLI call
        $outputAsJson = isset($options['json']); // Check for the --json flag
        $cliDebugEnabled = isset($options['debug']); // Check for --debug flag

        try {
            $processor = new EmailProcessor();
            $processor->processUrl(
                $url,
                $downloadedText,
                $display,
                $tentative,
                $instructions,
                $screenshotViewport,
                $screenshotZoomed,
                $requestedModel,
                $needsReview,
                $fromExtension,
                $outputAsJson, // Pass the flag here
                $cliDebugEnabled
            );
            exit(0); // Successful CLI execution
        } catch (Throwable $e) {
            // The main try-catch block in index.php will handle this exception
            // and format the error appropriately for CLI output.
            // We log it here too for completeness before re-throwing.
            errlog("Error during CLI processing in handleCli for URL {$url}: " . $e->getMessage());
            throw $e; // Re-throw to be caught by the main script's error handler
        }
    }

    private function displayCliHelp()
    {
        echo "Usage: php " . basename(__FILE__) . " [options]\n";
        echo "\n";
        echo "Processes a URL, HTML content, or provided instructions to extract event information and generate an iCalendar (ICS) file or other output.\n";
        echo "This command directly invokes the processing logic.\n";
        echo "\n";
        echo "Required (at least one of the following must be provided):\n";
        echo "  --url <url>                      URL of the event page to process. Will be fetched if --html is not provided.\n";
        echo "  --html <string>                  Pre-downloaded HTML content. If --url is also given, this HTML will be used instead of fetching the URL.\n";
        echo "  -i, --instructions <string>      Direct instructions for the AI to create an event. Can be used alone or to supplement --url/--html.\n";
        echo "\n";
        echo "Alternative mode (takes precedence over URL/HTML/Instructions if used):\n";
        echo "  --postmark-json-file <filepath>  Process a local JSON file as if it were an inbound Postmark email. All other processing flags are ignored.\n";
        echo "\n";
        echo "Optional arguments (for URL/HTML/Instructions mode):\n";
        echo "  -d, --display <mode>             Output mode. Options:\n";
        echo "                                     'display': Outputs ICS to STDOUT (default for CLI).\n";
        echo "                                     'download': Outputs ICS to STDOUT (intended for HTTP downloads, shows raw ICS in CLI).\n";
        echo "                                     'email': Sends the ICS file via Postmark to the configured recipient.\n";
        echo "  -t, --tentative <1|0>            Mark event as tentative (1 for true, 0 for false). Default: 1 (true).\n";
        echo "  -m, --model <model_id>           Specify the AI model ID to use (e.g., 'anthropic/claude-3-haiku').\n";
        echo "  -r, --review <1|0>               Flag if the event needs review (1 for true, 0 for false). Default: 0 (false).\n";
        echo "                                     If true, outputs JSON for review to STDOUT instead of ICS/email.\n";
        echo "  --screenshot_viewport <base64>   Base64 encoded viewport screenshot for vision-capable AI models.\n";
        echo "  --screenshot_zoomed <base64>     Base64 encoded zoomed-out/full-page screenshot for vision-capable AI models.\n";
        echo "  --json                           Output the processed event data as JSON instead of ICS (CLI mode only).\n";
        echo "  --debug                          Output detailed AI request and raw response data to STDERR (CLI mode only).\n";
        echo "  --help                           Display this help message and exit.\n";
        echo "\n";
        echo "Examples:\n";
        echo "  php " . basename(__FILE__) . " --url https://www.example.com/event\n";
        echo "  php " . basename(__FILE__) . " --postmark-json-file /path/to/email.json\n";
        echo "  php " . basename(__FILE__) . " --html \"<html><body>Event at 2pm</body></html>\"\n";
        echo "  php " . basename(__FILE__) . " --instructions \"Lunch with Bob tomorrow at 1pm at The Cafe\"\n";
        echo "  php " . basename(__FILE__) . " --url https://www.example.com/event --instructions \"Focus on the main speaker schedule.\"\n";
        echo "  php " . basename(__FILE__) . " --url https://www.example.com/event --display email --model anthropic/claude-3-sonnet\n";
        echo "  php " . basename(__FILE__) . " --url https://www.example.com/event --review 1\n";
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
	if (!is_cli() && isset($_REQUEST['fromExtension']) && ($_REQUEST['fromExtension'] === 'true' || $_REQUEST['fromExtension'] === true)) {
		http_response_code(500);
		header('Content-type: application/json');
		echo json_encode(['error' => 'Internal Server Error']);
	} elseif (!is_cli()) {
		// Respond with detailed HTML error for direct access/other sources
		http_response_code(500); // Still an error
		header('Content-type: text/html');
		echo '<h1>Internal Server Error</h1>';
		echo '<p>An unexpected error occurred. Details have been logged.</p>';
        // Optionally include basic error details for direct debugging
        echo '<hr><p><b>Debug Info (Direct Access):</b></p>';
        echo '<p>Error: ' . htmlspecialchars($t->getMessage()) . '</p>';
        echo '<pre>' . htmlspecialchars(substr($t->getTraceAsString(), 0, 1000)) . '...</pre>'; // Limit trace output
	} else {
        // CLI error output
        global $requestId;
        fwrite(STDERR, "INTERNAL SERVER ERROR (CLI MODE)\n");
        fwrite(STDERR, "Request ID: {$requestId}\n");
        fwrite(STDERR, "Error: " . $t->getMessage() . "\n");
        fwrite(STDERR, "Trace (first 1000 chars):\n" . substr($t->getTraceAsString(), 0, 1000) . "...\n");
        fwrite(STDERR, "Full details logged to server error log.\n");
    }

    $err = '<h1>ERROR PROCESSING CALENDAR EVENT</h1>' .
		'<p>Error: <b>' . htmlspecialchars($t->getMessage()) . '</b></p>' .
		'<pre>' . htmlspecialchars(var_export($t, true)) . '</pre>' .
		'<p>Original POST/REQUEST:</p>' .
		'<pre>' . htmlspecialchars(json_encode($_REQUEST)) . '</pre>';

    if (!is_cli()) {
	    try {
	        $processor = new EmailProcessor;
	        $processor->sendEmail(null, $_ENV['ERROR_EMAIL'], 'ERROR PROCESSING CALENDAR EVENT', $err);
	    } catch (Throwable $emailError) {
	        errlog("Failed to send error email: " . $emailError->getMessage());
	    }
    } else {
        errlog("CLI run encountered an error; error email not sent. Error details: " . $t->getMessage());
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

// --- NEW: Handle Confirmation Endpoint ---
if (isset($_GET['confirm']) && $_GET['confirm'] === 'true' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $token = $_POST['confirmationToken'] ?? null;
    $cacheDir = sys_get_temp_dir() . '/confirm_cache';
    define('CONFIRMATION_TTL', 60 * 60); // Token valid for 1 hour

    if (!$token || !preg_match('/^[a-f0-9]{32}$/', $token)) { // Basic token validation
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or missing confirmation token.']);
        exit;
    }

    $cacheFile = $cacheDir . '/' . basename($token) . '.json';

    if (!file_exists($cacheFile)) {
        http_response_code(404);
        echo json_encode(['error' => 'Confirmation token not found or expired.']);
        exit;
    }

    $storedData = json_decode(file_get_contents($cacheFile), true);

    if (!$storedData || !isset($storedData['timestamp']) || (time() - $storedData['timestamp'] > CONFIRMATION_TTL)) {
        unlink($cacheFile); // Clean up invalid/expired token file
        http_response_code(410); // Gone (expired)
        echo json_encode(['error' => 'Confirmation token expired or data invalid.']);
        exit;
    }

    try {
        // Need EmailProcessor to send the email
        $processor = new EmailProcessor(); 
        $processor->sendEmail(
            $storedData['ics'], 
            $storedData['recipient'], 
            $storedData['subject'], 
            '<p>Confirmed event from extension review.</p>' // Simple body
        );
        unlink($cacheFile); // Successfully used, remove token
        echo json_encode(['status' => 'success', 'message' => 'Email confirmed and sent successfully.']);
    } catch (Throwable $e) {
        errlog("Error sending confirmed email for token {$token}: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to send confirmed email.']);
    }
    exit; // IMPORTANT: Stop script execution after handling confirmation
}
// --- End NEW Confirmation Handling ---

// --- Continue with original script logic ---

