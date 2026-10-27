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
error_log('Autoloader loaded');

use GuzzleHttp\Client;
use Spatie\PdfToText\Pdf;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Opis\JsonSchema\Errors\ValidationError;
use Jcherniak\EmailToIcs\Calendar\EventSubject;
use Jcherniak\EmailToIcs\Calendar\IcalGenerator;
use Jcherniak\EmailToIcs\Candidates\Candidate;
use Jcherniak\EmailToIcs\Candidates\CandidateEmailBuilder;
use Jcherniak\EmailToIcs\Candidates\CandidateLinks;
use Jcherniak\EmailToIcs\Candidates\CandidateSet;
use Jcherniak\EmailToIcs\Candidates\CandidateStore;
use Jcherniak\EmailToIcs\Candidates\DeliveryPlanner;
use Jcherniak\EmailToIcs\Config\Environment;
use Jcherniak\EmailToIcs\Content\HtmlTitle;
use Jcherniak\EmailToIcs\Content\ReadabilityExtractor;
use Jcherniak\EmailToIcs\Fetch\ChainUrlFetcher;
use Jcherniak\EmailToIcs\Fetch\UrlFetcherInterface;
use Jcherniak\EmailToIcs\Generation\ContentVariant;
use Jcherniak\EmailToIcs\Generation\ContentVariantProvider;
use Jcherniak\EmailToIcs\Generation\EventResponseValidator;
use Jcherniak\EmailToIcs\Generation\GenerationOutcome;
use Jcherniak\EmailToIcs\Generation\GenerationRetryRunner;
use Jcherniak\EmailToIcs\Generation\ModelOrder;
use Jcherniak\EmailToIcs\Generation\StaticContentProvider;
use Jcherniak\EmailToIcs\Generation\UrlLevelContentProvider;
use Jcherniak\EmailToIcs\Geocode\ChainGeocoder;
use Jcherniak\EmailToIcs\Geocode\GeocoderInterface;
use Jcherniak\EmailToIcs\Input\CliInputSource;
use Jcherniak\EmailToIcs\Input\EmailInputSource;
use Jcherniak\EmailToIcs\Input\RawEmailTextInputSource;
use Jcherniak\EmailToIcs\Input\WebFormInputSource;
use Jcherniak\EmailToIcs\Mail\CalendarEmailBody;
use Jcherniak\EmailToIcs\Mail\EmailAttachment;
use Jcherniak\EmailToIcs\Mail\EmailMessage;
use Jcherniak\EmailToIcs\Mail\MailerInterface;
use Jcherniak\EmailToIcs\Mail\PostmarkMailer;
use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;
use Jcherniak\EmailToIcs\UrlDetection\ChainUrlDetector;
use Jcherniak\EmailToIcs\UrlDetection\LocalUrlDetector;
use Jcherniak\EmailToIcs\UrlDetection\OpenRouterUrlDetector;
use Jcherniak\EmailToIcs\Web\WebPage;

global $requestId;
$requestId = uniqid('request-');
function errlog($msg)
{
	global $requestId;
	error_log("{$requestId} - {$msg}");
}

Environment::load(__DIR__);
error_log('Dotenv loaded'); // Add log to confirm loading

(new ProcessedRecordStore(__DIR__ . '/processed'))->enforceMaxSize($_ENV['MAX_PROCESSED_DIR_SIZE'] ?? '100M');
try {
	CandidateStore::fromEnvironment(__DIR__)->cleanup();
} catch (Throwable $candidateCleanupError) {
	errlog('Candidate store cleanup failed: ' . $candidateCleanupError->getMessage());
}

// Define cache settings
define('MODEL_CACHE_FILE', sys_get_temp_dir() . '/.models_cache.json');
define('MODEL_CACHE_DURATION', 7 * 24 * 60 * 60); // 7 days in seconds

// Log helper
enum LogLevel: string {
	case DEBUG = 'debug';
	case INFO = 'info';
	case WARNING = 'warning';
	case ERROR = 'error';
}

match (strtolower($_ENV['LOG_LEVEL'] ?? 'info')) {
	'debug' => define('LOG_LEVEL', LogLevel::DEBUG),
	'info' => define('LOG_LEVEL', LogLevel::INFO),
	'warning' => define('LOG_LEVEL', LogLevel::WARNING),
	'error' => define('LOG_LEVEL', LogLevel::ERROR),
	default => define('LOG_LEVEL', LogLevel::INFO),
};

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
if (!defined('EMAIL_TO_ICS_SKIP_FRONT_CONTROLLER') && isset($_GET['get_models'])) {
    // Consider adding if (!is_cli()) around this block if it should be strictly web.
    header('Content-Type: application/json');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    echo json_encode(getAvailableModels());
    exit;
}

// Test endpoint for auth verification
if (!defined('EMAIL_TO_ICS_SKIP_FRONT_CONTROLLER') && isset($_GET['test_auth'])) {
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

/**
 * Centralized Error Handler for all contexts
 */
class ErrorHandler {
    /**
     * Handle errors based on context (CLI, Web, Postmark, Extension)
     *
     * @param \Throwable $error The error/exception to handle
     * @param array $context Additional context information
     * @return void
     */
    public static function handle(\Throwable $error, array $context = []) {
        $errorMessage = $error->getMessage();
        $errorTrace = $error->getTraceAsString();

        // Always log the error
        errlog("ERROR: " . $errorMessage);
        errlog("Stack trace: " . $errorTrace);

        // Determine the context
        $isPostmark = defined('IS_POSTMARK_WEBHOOK') && IS_POSTMARK_WEBHOOK;
        $isCli = defined('IS_CLI_RUN') && IS_CLI_RUN;
        $isExtension = isset($_REQUEST['fromExtension']) && ($_REQUEST['fromExtension'] === 'true' || $_REQUEST['fromExtension'] === true);

        // Handle based on context
        if ($isPostmark) {
            self::handlePostmarkError($error, $context);
        } elseif ($isCli) {
            self::handleCliError($error, $context);
        } elseif ($isExtension) {
            self::handleExtensionError($error, $context);
        } else {
            self::handleWebError($error, $context);
        }
    }

    /**
     * Handle errors for Postmark webhooks
     * CRITICAL: Always return 200 OK to prevent retry loops
     */
    private static function handlePostmarkError(\Throwable $error, array $context) {
        // Try to send error notification
        if (!empty($context['postmark_data'])) {
            try {
                $processor = new EmailProcessor();
                $subject = 'Email-to-ICS Processing Failed: ' . ($context['postmark_data']['Subject'] ?? 'Unknown');
                $errorDetails = "Error: " . $error->getMessage() . "\n\n";
                $errorDetails .= "Original Email Subject: " . ($context['postmark_data']['Subject'] ?? 'N/A') . "\n";
                $errorDetails .= "From: " . ($context['postmark_data']['From'] ?? 'N/A') . "\n";
                $errorDetails .= "Date: " . date('Y-m-d H:i:s') . "\n\n";
                $errorDetails .= "Stack Trace:\n" . $error->getTraceAsString();

                $processor->sendErrorEmail($subject, $errorDetails, $context['postmark_data']);
            } catch (\Exception $e) {
                errlog("Failed to send error notification: " . $e->getMessage());
            }
        }

        // ALWAYS return 200 OK to Postmark
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'Webhook processed']);
        exit(0);
    }

    /**
     * Handle errors for CLI context
     */
    private static function handleCliError(\Throwable $error, array $context) {
        // Output to STDERR
        fwrite(STDERR, "Error: " . $error->getMessage() . "\n");

        if (!empty($context['show_trace'])) {
            fwrite(STDERR, "Stack trace:\n" . $error->getTraceAsString() . "\n");
        }

        // Exit with error code
        exit(1);
    }

    /**
     * Handle errors for Chrome extension
     */
    private static function handleExtensionError(\Throwable $error, array $context) {
        $statusCode = $context['status_code'] ?? 500;
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => $error->getMessage(),
            'success' => false
        ]);
        exit(1);
    }

    /**
     * Handle errors for regular web requests
     */
    private static function handleWebError(\Throwable $error, array $context) {
        $statusCode = $context['status_code'] ?? 500;
        http_response_code($statusCode);

        // Check if JSON response is expected
        if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
            header('Content-Type: application/json');
            echo json_encode([
                'error' => $error->getMessage(),
                'success' => false
            ]);
        } else {
            // HTML error page
            header('Content-Type: text/html');
            echo '<h1>Error</h1>';
            echo '<p>' . htmlspecialchars($error->getMessage()) . '</p>';
            if (!empty($context['show_trace'])) {
                echo '<h2>Debug Information</h2>';
                echo '<pre>' . htmlspecialchars($error->getTraceAsString()) . '</pre>';
            }
        }
        exit(1);
    }

    /**
     * Helper to determine appropriate HTTP status code based on exception type
     */
    public static function getStatusCode(\Throwable $error) {
        if ($error instanceof \InvalidArgumentException) {
            return 400; // Bad Request
        }
        if ($error instanceof \UnauthorizedHttpException ||
            (method_exists($error, 'getCode') && $error->getCode() === 401)) {
            return 401; // Unauthorized
        }
        if ($error instanceof \ForbiddenHttpException ||
            (method_exists($error, 'getCode') && $error->getCode() === 403)) {
            return 403; // Forbidden
        }
        if ($error instanceof \NotFoundHttpException ||
            (method_exists($error, 'getCode') && $error->getCode() === 404)) {
            return 404; // Not Found
        }

        return 500; // Internal Server Error
    }
}


class EmailProcessor
{
	private $postmarkApiKey;

	private $fromEmail;

	private $inboundConfirmedEmail;
	private $toTentativeEmail;
	private $toConfirmedEmail;

	private $openaiClient;
	private $fetchedScreenshot = null; // Screenshot captured by a fetch level, if any
	private MailerInterface $mailer;
	private UrlFetcherInterface $urlFetcher;
	private GeocoderInterface $geocoder;
	private ReadabilityExtractor $contentExtractor;
	private ?string $currentProcessingKey = null;
	private CandidateStore $candidateStore;

	private $aiModel;
	private $openRouterKey;
	private $maxTokens = 20000;
	private ?\DateTimeImmutable $currentDateOverride = null;
	private ?int $aiSeed = null;

	// Available models will be loaded dynamically
	private $availableModels = [];

	public function setCurrentDateForTesting(\DateTimeImmutable|string|null $date): void
	{
		if ($date === null) {
			$this->currentDateOverride = null;
			return;
		}

		$this->currentDateOverride = $date instanceof \DateTimeImmutable ? $date : new \DateTimeImmutable($date);
	}

	public function setAiSeedForTesting(?int $seed): void
	{
		$this->aiSeed = $seed;
	}

	private function getCurrentDate(): \DateTimeImmutable
	{
		return $this->currentDateOverride ?? new \DateTimeImmutable('now');
	}

	private function getSharedPromptPolicyText(): string
	{
		$path = __DIR__ . '/prompt/system_prompt_policy.xml';
		$policy = file_get_contents($path);
		if ($policy === false || trim($policy) === '') {
			throw new \RuntimeException("Shared prompt policy file is missing or empty: {$path}");
		}

		return trim($policy);
	}

	private function eventDataItems($eventData): array
	{
		if (!is_array($eventData)) {
			return [];
		}

		if (isset($eventData[0]) && is_array($eventData[0])) {
			return $eventData;
		}

		return [$eventData];
	}

	private function eventSubjectWithDate(string $subject, array $eventData, int $eventCount): string
	{
		return EventSubject::withDate($subject, $eventData, $eventCount);
	}

	public function sendCalendarEmailsForEventData($eventData, string $recipientEmail, string $subject, string $htmlBody): int
	{
		$eventItems = $this->eventDataItems($eventData);
		if (empty($eventItems)) {
			throw new \InvalidArgumentException('No event data supplied for calendar email generation.');
		}

		$generator = new IcalGenerator();
		$eventCount = count($eventItems);

		foreach ($eventItems as $singleEventData) {
			$singleIcs = $generator->convertJsonToIcs($singleEventData, $this->fromEmail);
			$this->logFinalIcs('calendar email split event', $singleIcs);
			$singleSubject = $this->eventSubjectWithDate($subject, $singleEventData, $eventCount);
			$this->sendEmail($singleIcs, $recipientEmail, $singleSubject, $htmlBody);
		}

		return $eventCount;
	}

	private function eventSourceUrl($eventDetails, ?string $fallbackUrl = null): string
	{
		$fallbackUrl = trim((string)$fallbackUrl);

		if (!is_array($eventDetails)) {
			return $fallbackUrl;
		}

		$eventData = $eventDetails['eventData'] ?? null;
		$firstEvent = null;
		if (is_array($eventData)) {
			$firstEvent = isset($eventData[0]) && is_array($eventData[0])
				? $eventData[0]
				: $eventData;
		}

		$url = is_array($firstEvent) ? trim((string)($firstEvent['url'] ?? '')) : '';
		return $url !== '' ? $url : $fallbackUrl;
	}

	private function buildCalendarEmailBody(?string $sourceUrl, string $sourceLabel, string $sourceDataHtml, ?string $downloadedText = null): string
	{
		return CalendarEmailBody::build($sourceUrl, $sourceLabel, $sourceDataHtml, $downloadedText);
	}

	private function buildFormSourceDataHtml(?string $url, ?string $instructions): string
	{
		$lines = [];
		if (trim((string)$url) !== '') {
			$lines[] = 'URL: ' . trim((string)$url);
		}

		if (trim((string)$instructions) !== '') {
			$lines[] = 'Instructions: ' . trim((string)$instructions);
		}

		if ($lines === []) {
			$lines[] = '(none)';
		}

		return '<pre>' . htmlspecialchars(implode("\n", $lines), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</pre>';
	}

	private function shouldExtractEqualPerformances(string $content, ?string $instructions = null): bool
	{
		if ($this->instructionsFocusSpecificDate($instructions)) {
			return false;
		}

		if (!preg_match('/\b(ticket|tickets|buy tickets|performance|performances|session|sessions|showtime|showtimes|concert|opera|theatre|theater|screening|show)\b/i', $content)) {
			return false;
		}

		return count($this->extractDateTimeCandidates($content)) >= 2;
	}

	private function instructionsFocusSpecificDate(?string $instructions): bool
	{
		if (empty($instructions)) {
			return false;
		}

		return preg_match('/\b(only|focus|specific|particular|just|choose|use)\b.{0,80}\b(date|performance|session|show|event|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\/-]\d{1,2})\b/i', $instructions) === 1;
	}

	private function extractDateTimeCandidates(string $content): array
	{
		$normalized = html_entity_decode(strip_tags($content, '<span><li><a><div><p><time>'), ENT_QUOTES | ENT_HTML5);
		$normalized = preg_replace('/\s+/', ' ', $normalized);
		$candidates = [];

		if (preg_match_all('/\b(?:Mon|Tue|Tues|Wed|Thu|Thurs|Fri|Sat|Sun)(?:day)?[,]?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.)\b/i', $normalized, $matches)) {
			foreach ($matches[0] as $match) {
				$candidates[] = strtolower(trim($match));
			}
		}

		if (preg_match_all('/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.)\b/i', $normalized, $matches)) {
			foreach ($matches[0] as $match) {
				$candidates[] = strtolower(trim($match));
			}
		}

		if (preg_match_all('/\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b.{0,80}?\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.))\b/i', $normalized, $matches, PREG_SET_ORDER)) {
			foreach ($matches as $match) {
				$candidates[] = strtolower(trim($match[1] . ' ' . $match[2]));
			}
		}

		return array_values(array_unique(array_map(
			fn($candidate) => preg_replace('/\s+/', ' ', preg_replace('/\bat\s+/i', '', $candidate)),
			$candidates
		)));
	}

    public function __construct(?MailerInterface $mailer = null, ?UrlFetcherInterface $urlFetcher = null, ?GeocoderInterface $geocoder = null, ?ReadabilityExtractor $contentExtractor = null, ?CandidateStore $candidateStore = null)
    {
        $this->openRouterKey = $_ENV['OPENROUTER_KEY'];
        $this->postmarkApiKey = $_ENV['POSTMARK_API_KEY'];
		$this->fromEmail = $_ENV['FROM_EMAIL'];
		$this->inboundConfirmedEmail = $_ENV['INBOUND_CONFIRMED_EMAIL'];
		$this->toTentativeEmail = $_ENV['TO_TENTATIVE_EMAIL'];
		$this->toConfirmedEmail = $_ENV['TO_CONFIRMED_EMAIL'];

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

		// Initialize Guzzle client for OpenRouter API
		$this->openaiClient = new Client([
			'base_uri' => 'https://openrouter.ai/api/v1/',
			'headers' => [
				'Authorization' => 'Bearer ' . $this->openRouterKey,
				'Content-Type' => 'application/json',
				'X-Title' => $_ENV['APP_TITLE'] ?? 'Email-to-ICS',
			],
			'timeout' => 120,
		]);

		$this->mailer = $mailer ?? new PostmarkMailer($this->postmarkApiKey);
		$this->urlFetcher = $urlFetcher ?? ChainUrlFetcher::fromEnvironment();
		$this->geocoder = $geocoder ?? ChainGeocoder::fromEnvironment();
		$this->contentExtractor = $contentExtractor ?? ReadabilityExtractor::fromEnvironment();
		$this->candidateStore = $candidateStore ?? CandidateStore::fromEnvironment(__DIR__);
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
		errlog("processUrl started - URL: " . ($url ?? 'none') . ", Model: " . ($requestedModel ?? 'default'));
        // NOTE TO DEVELOPER: Throughout this method, check (defined('IS_CLI_RUN') && IS_CLI_RUN)
        // before calling http_response_code(), header(), or outputting HTML error messages.
        // For CLI, output plain text errors to STDERR or STDOUT and use exit codes.

        // Ensure that at least one of: URL, downloadedText (HTML), or instructions are provided.
        if (empty(trim($url)) && empty(trim($downloadedText)) && empty(trim((string)$instructions))) {
            $errorMsg = 'Error: Please provide a URL, HTML content, or Instructions.';
            ErrorHandler::handle(
                new \InvalidArgumentException($errorMsg),
                ['status_code' => 400]
            );
        }

		// If a specific model was requested, check if it's valid and override the default
		$requestedModelForRun = null;
		if ($requestedModel && isset($this->availableModels[$requestedModel])) {
			$this->aiModel = $requestedModel;
			$requestedModelForRun = $requestedModel;
			errlog("Using requested model: {$this->aiModel}");
		} else {
			// Ensure a valid default model is set if the requested one is invalid
			$this->aiModel = $this->getDefaultModelId(); // This can throw if no models available
			errlog("Requested model '{$requestedModel}' invalid or not provided. Using default model: {$this->aiModel}");
		}

		$frame = static function (string $pageContent, ?string $title) use (&$url): string {
			return "{$url}\n\n--- HTML content fetched from URL above ---\n{$pageContent}";
		};

		if (empty(trim($downloadedText)) && !empty(trim($url))) { // Only fetch if URL is given and no downloadedText
			// Strip tracking parameters from URL
			$url = $this->stripTrackingParameters($url);
			errlog("URL after stripping tracking params: {$url}");

			if (!$this->is_valid_url($url)) {
                errlog('BAD url: ' . $url);
                ErrorHandler::handle(
                    new \InvalidArgumentException("Invalid URL provided: {$url}"),
                    ['status_code' => 400]
                );
			}

			$provider = new UrlLevelContentProvider($this->urlFetcher, $this->contentExtractor, $url, $frame);
			if (!$provider->hasAnyContent()) {
                errlog('Failed to fetch URL: ' . $url . ' - ' . json_encode($provider->fetchSummary()));

                // For Postmark webhooks, continue processing instead of failing
                if (defined('IS_POSTMARK_WEBHOOK') && IS_POSTMARK_WEBHOOK) {
                    errlog('Continuing processing for Postmark webhook despite URL fetch failure');
                    $provider = new StaticContentProvider('', $frame);
                } else {
                    ErrorHandler::handle(
                        new \RuntimeException("Failed to fetch URL: {$url}"),
                        ['status_code' => 500]
                    );
                }
            }
		} else {
			if (substr((string)$downloadedText, 0, 1) === '\'' &&
				substr((string)$downloadedText, -1, 1) === '\''
			) {
				$downloadedText = trim($downloadedText);
				$dec = json_decode($downloadedText);
				if (json_last_error() === JSON_ERROR_NONE)
				{
					$downloadedText = $dec;
				}
			}
			// Provided HTML (extension capture, CLI --html, debug replay): Readability snippet first, then the lightened full page.
			$provider = new StaticContentProvider((string)$downloadedText, $frame, $this->contentExtractor, !empty(trim((string)$url)) ? $url : null);
		}

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

		// Explicit request for every event (form checkbox, CLI flag, or <multiple> in instructions) sends all events
		// directly; an auto-detected equal-performance page only widens the prompt and yields a choice email.
		$sendAllRequested = (bool)$allowMultiDay || EmailInputSource::containsMultipleToken($instructions);
		if (!$allowMultiDay && $this->shouldExtractEqualPerformances((string)$provider->fullText(), $instructions)) {
			$allowMultiDay = true;
			errlog("Multi-day mode enabled automatically for equal performance schedule");
		}

		$outcome = $this->runGeneration(
			$this->generationModels($requestedModelForRun),
			$provider,
			$instructions,
			$screenshotViewport,
			$screenshotZoomed,
			$allowMultiDay,
			!empty(trim((string)$url)) ? $url : null,
			$cliDebug
		);
		$eventDetails = $outcome->eventDetails;
		// Content actually used for the winning attempt feeds the email body's "Source page" section.
		$downloadedText = $outcome->contentUsed?->pageContent ?? (string)$downloadedText;

		// Handle --json flag for CLI output if requested - This takes precedence over other CLI outputs.
		if ($outputJsonOnly && defined('IS_CLI_RUN') && IS_CLI_RUN) {
			// $eventDetails here is the direct output from generateIcalEvent
            // Get values first
            $isSuccess = $eventDetails['success'] ?? false;
            $eventDataValue = $eventDetails['eventData'] ?? null; // Get the value or null
            $errorMessageValue = $eventDetails['errorMessage'] ?? '';

            // --- Revised Check for Valid Event Data ---
            $isEventDataValid = false; // Assume invalid initially
            if (isset($eventDataValue) && is_array($eventDataValue)) {
                // Check for single event (has 'summary' key directly)
                if (!empty($eventDataValue['summary'])) {
                    $isEventDataValid = true;
                }
                // Check for multiple events (array of events)
                elseif (isset($eventDataValue[0]) && is_array($eventDataValue[0]) && !empty($eventDataValue[0]['summary'])) {
                    $isEventDataValid = true;
                }
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
				'generation'     => $outcome->toMetadata(),
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
		$candidateSet = null;
		$recipientEmail = $tentative ? $this->toTentativeEmail : $this->toConfirmedEmail;
		$sourceLabel = (defined('IS_CLI_RUN') && IS_CLI_RUN) ? 'cli input' : 'form input';
		if ($fromExtension) {
			$sourceLabel = 'form input';
		}
		$origin = $fromExtension ? 'extension' : ((defined('IS_CLI_RUN') && IS_CLI_RUN) ? 'cli' : 'web');
		if (($eventDetails['success'] ?? false) && !empty($eventDetails['eventData'])) {
			$generator = new IcalGenerator();
			$ics = $generator->convertJsonToIcs($eventDetails['eventData'], $this->fromEmail);
			$this->logFinalIcs('web/generated event', $ics);
			$candidateSet = $this->buildCandidateSet(
				$eventDetails,
				$outcome,
				$origin,
				!empty(trim((string)$url)) ? $url : null,
				$sourceLabel,
				$this->buildFormSourceDataHtml($url, $instructions),
				$downloadedText,
				$instructions,
				$allowMultiDay,
				$tentative,
				$recipientEmail
			);
		} elseif (($eventDetails['success'] ?? false) === false) {
			errlog("Skipping ICS generation because AI processing failed: " . ($eventDetails['errorMessage'] ?? 'Unknown AI error'));
		} else { // Success was true, but eventData was empty/missing
			errlog("Skipping ICS generation because eventData was missing/empty from AI despite success. Error: " . ($eventDetails['errorMessage'] ?? 'eventData missing'));
		}

		$subject = $eventDetails['emailSubject'] ?? 'Calendar Event'; // Use a default subject
		$plan = $candidateSet !== null ? DeliveryPlanner::plan($candidateSet->count(), $sendAllRequested) : DeliveryPlanner::SINGLE;

		// Check if review is needed AND the request came from the extension
		if ($needsReview && $fromExtension) {
			if ($candidateSet === null) {
				$errorMessage = $eventDetails['errorMessage'] ?? 'No event could be generated.';
				if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
					echo json_encode(['success' => false, 'error' => $errorMessage], JSON_PRETTY_PRINT) . "\n";
				} else {
					http_response_code(500);
					echo json_encode(['success' => false, 'error' => $errorMessage]);
				}
				exit;
			}

			// The candidate set is the review state; its key doubles as the confirmation token.
			$this->candidateStore->save($candidateSet);
            $reviewOutput = [
				'needsReview' => true,
				'icsContent' => $ics,
				'emailSubject' => $subject,
				'recipientEmail' => $recipientEmail, // Send intended recipient to extension
				'confirmationToken' => $candidateSet->key, // Include the token
				'candidateKey' => $candidateSet->key,
				'candidates' => $candidateSet->clientCandidates(),
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
                    header('Content-Type: text/calendar; method=PUBLISH; charset=utf-8');
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

		$htmlBody = $candidateSet->htmlBody;

		if ($plan === DeliveryPlanner::CANDIDATES) {
			// Several candidates and no explicit "send all": store them and send one email with choice links.
			$this->candidateStore->save($candidateSet);
			$this->sendCandidateChoiceEmail($candidateSet);
			$candidateCount = $candidateSet->count();
			$message = "{$candidateCount} possible events found; a choice email was sent to {$recipientEmail}";
			errlog($message);
			if ($fromExtension) {
				$choiceOutput = [
					'status' => 'candidates',
					'message' => $message,
					'recipientEmail' => $recipientEmail,
					'emailSubject' => $subject,
					'candidateKey' => $candidateSet->key,
					'candidates' => $candidateSet->clientCandidates(),
					'icsContent' => $ics,
				];
				if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
					echo json_encode($choiceOutput, JSON_PRETTY_PRINT) . "\n";
				} else {
					header('Content-Type: application/json');
					echo json_encode($choiceOutput);
				}
			} elseif (defined('IS_CLI_RUN') && IS_CLI_RUN) {
				echo $message . "\n";
				foreach ($candidateSet->candidates as $candidate) {
					echo "  [{$candidate->index}] {$candidate->summary()} - {$candidate->when()}\n";
				}
			} else {
				http_response_code(200);
				$baseUrl = CandidateLinks::baseUrl();
				echo '<h1>' . htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</h1>';
				echo '<p><a href="' . htmlspecialchars(CandidateLinks::url($baseUrl, $candidateSet->key, CandidateLinks::ACTION_ALL), ENT_QUOTES) . '">Create all events</a> | ';
				echo '<a href="' . htmlspecialchars(CandidateLinks::url($baseUrl, $candidateSet->key, CandidateLinks::ACTION_PICK), ENT_QUOTES) . '">Choose events</a></p><ol>';
				foreach ($candidateSet->candidates as $candidate) {
					echo '<li>' . htmlspecialchars($candidate->summary() . ' - ' . $candidate->when(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
						. ' <a href="' . htmlspecialchars(CandidateLinks::url($baseUrl, $candidateSet->key, CandidateLinks::ACTION_ONE, $candidate->index), ENT_QUOTES) . '">Use only this one</a></li>';
				}
				echo '</ol>';
			}
			exit;
		}

		// One candidate, or an explicit request for every event: one email per event, never a combined ICS.
		$this->candidateStore->save($candidateSet);
		$emailsSent = $this->sendCandidateEvents($candidateSet, $candidateSet->allIndexes());

		// --- Respond based on origin ---
		if ($fromExtension) {
            $successOutput = [
				'status' => 'success',
				'message' => $emailsSent > 1
					? "{$emailsSent} emails sent successfully to {$recipientEmail}"
					: "Email sent successfully to {$recipientEmail}",
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
                if ($emailsSent > 1) {
                    echo "{$emailsSent} emails sent to {$recipientEmail} with ICS files: {$subject}\n";
                } else {
                    echo "Email sent to {$recipientEmail} with ICS file: {$subject}\n";
                }
                // Optionally print ICS content or path if useful for CLI
            } else {
			    http_response_code(200);
			    echo $emailsSent > 1
                    ? "<h1>{$emailsSent} emails sent to {$recipientEmail} with ICS files:</h1><pre>"
                    : "<h1>Email sent to {$recipientEmail} with ICS file:</h1><pre>";
			    echo htmlspecialchars($this->unescapeNewlines($ics));
			    echo '</pre>';
            }
		}
		exit;
	}

	protected function unescapeNewlines($str)
	{
		return str_replace('\n', "\n",
			str_replace('\r\n', "\n",
				$str
			)
		);
	}

	private function extractPageTitleFromHtml(?string $html): ?string
	{
		return HtmlTitle::extract($html);
	}

	private function buildProcessingMetadata(?string $downloadedUrl, ?string $pageTitle, array $eventDetails = [], ?GenerationOutcome $outcome = null): array
	{
		$eventData = $eventDetails['eventData'] ?? null;
		$events = $this->eventDataItems($eventData);
		$parsedDates = [];
		foreach ($events as $event) {
			if (!empty($event['dtstart'])) {
				$parsedDates[] = $event['dtstart'];
			}
		}

		return array_merge([
			'downloadedUrl' => $downloadedUrl,
			'pageTitle' => $pageTitle,
			'parsedTitle' => $events[0]['summary'] ?? ($eventDetails['emailSubject'] ?? null),
			'parsedDates' => $parsedDates,
			'generatedJson' => $eventDetails ?: null,
		], $outcome?->toMetadata() ?? []);
	}

	/**
	 * Get the processed folder path
	 */
	private function getProcessedFolder()
	{
		$folder = __DIR__ . '/processed';
		if (!is_dir($folder)) {
			mkdir($folder, 0755, true);
		}
		return $folder;
	}

	/**
	 * Generate filename for processing status
	 * Format: YYYY-MM-DD.HH.MM.SS-MESSAGEID-SUBJECT.json
	 */
	private function getProcessingFilename($messageId, $subject = '')
	{
		$date = date('Y-m-d.H.i.s');
		$safeMessageId = preg_replace('/[^a-zA-Z0-9\-_]/', '_', $messageId);
		$safeSubject = preg_replace('/[^a-zA-Z0-9\-_]/', '_', substr($subject, 0, 100)); // Limit length

		if (empty($safeSubject)) {
			$safeSubject = 'no_subject';
		}

		return $this->getProcessedFolder() . '/' . $date . '-' . $safeMessageId . '-' . $safeSubject . '.json.gz';
	}

	/**
	 * Find existing processing file for a MessageID
	 * Returns the filename if found, null otherwise
	 */
	private function findProcessingFile($messageId)
	{
		$folder = $this->getProcessedFolder();
		$safeMessageId = preg_replace('/[^a-zA-Z0-9\-_]/', '_', $messageId);

		$files = array_merge(
			glob($folder . '/*-' . $safeMessageId . '-*.json') ?: [],
			glob($folder . '/*-' . $safeMessageId . '-*.json.gz') ?: []
		);

		// Return the most recent file (last in sorted order)
		if (!empty($files)) {
			sort($files);
			return end($files);
		}

		return null;
	}

	/**
	 * Get processing status for a MessageID
	 * Returns array of processing attempts with timestamps
	 */
	private function getProcessingStatus($messageId)
	{
		$filename = $this->findProcessingFile($messageId);

		if (!$filename || !file_exists($filename)) {
			return [];
		}

		$content = str_ends_with($filename, '.gz')
			? gzdecode(file_get_contents($filename) ?: '')
			: file_get_contents($filename);
		if ($content === false) {
			return [];
		}

		$content = preg_replace_callback(
			'/"icsData":\s*`(.*?)`/s',
			static fn(array $matches): string => '"icsData": ' . json_encode(trim($matches[1]), JSON_UNESCAPED_SLASHES),
			$content
		) ?? $content;
		$data = json_decode($content, true);
		return is_array($data) ? $data : [];
	}

	/**
	 * Record processing attempt for a MessageID
	 * Writes atomically using file locking
	 */
	private function recordProcessingAttempt($messageId, $subject, $status, $icsData = null, $errorMessage = null, $stackTrace = null, $downloadedContent = null, $screenshot = null, $pdfText = null, $emailHtml = null, array $metadata = [])
	{
		// Skip recording in CLI mode to avoid permission issues
		if (defined('IS_CLI_RUN') && IS_CLI_RUN) {
			errlog("Skipping recordProcessingAttempt in CLI mode");
			return true;
		}

		// Check if file already exists from previous attempt
		$existingFile = $this->findProcessingFile($messageId);
		$filename = $existingFile ?: $this->getProcessingFilename($messageId, $subject);

		$dateStarted = $this->currentProcessingKey ?? date('Y-m-d H:i:s');

		// Open file with exclusive lock
		$fp = fopen($filename, 'c+');
		if (!$fp) {
			errlog("Failed to open processing status file: {$filename}");
			return false;
		}

		// Acquire exclusive lock
		if (!flock($fp, LOCK_EX)) {
			errlog("Failed to lock processing status file: {$filename}");
			fclose($fp);
			return false;
		}

		// Read existing content
		$content = stream_get_contents($fp);
		if (str_ends_with($filename, '.gz') && $content !== '') {
			$decodedGz = gzdecode($content);
			$content = $decodedGz === false ? '' : $decodedGz;
		}
		$data = [];
		if (!empty($content)) {
			$normalizedContent = preg_replace_callback(
				'/"icsData":\s*`(.*?)`/s',
				static fn(array $matches): string => '"icsData": ' . json_encode(trim($matches[1]), JSON_UNESCAPED_SLASHES),
				$content
			) ?? $content;
			$decoded = json_decode($normalizedContent, true);
			if (is_array($decoded)) {
				$data = $decoded;
			}
		}

		// Add new attempt
		$data[$dateStarted] = array_merge([
			'dateEnded' => date('Y-m-d H:i:s'),
			'status' => $status,
			'icsData' => $icsData,
			'errorMessage' => $errorMessage,
			'stackTrace' => $stackTrace,
			'downloadedContent' => $downloadedContent ? base64_encode($downloadedContent) : null,
			'screenshot' => $screenshot, // Already base64 encoded
			'pdfText' => $pdfText ? base64_encode($pdfText) : null,
			'emailHtml' => $emailHtml ? base64_encode($emailHtml) : null
		], array_filter([
			'downloadedUrl' => $metadata['downloadedUrl'] ?? null,
			'pageTitle' => $metadata['pageTitle'] ?? null,
			'parsedTitle' => $metadata['parsedTitle'] ?? null,
			'parsedDates' => $metadata['parsedDates'] ?? null,
			'generatedJson' => $metadata['generatedJson'] ?? null,
			'generationAttempts' => $metadata['generationAttempts'] ?? null,
			'fetchLevels' => $metadata['fetchLevels'] ?? null,
			'winningAttempt' => $metadata['winningAttempt'] ?? null,
			'contentUsed' => $metadata['contentUsed'] ?? null,
			'stopReason' => $metadata['stopReason'] ?? null,
			'candidateKey' => $metadata['candidateKey'] ?? null,
		], static fn($value) => $value !== null));

		// Write updated content
		ftruncate($fp, 0);
		rewind($fp);

		$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

		$bytes = str_ends_with($filename, '.gz') ? gzencode($json, 6) : $json;
		fwrite($fp, $bytes === false ? $json : $bytes);

		// Release lock and close
		flock($fp, LOCK_UN);
		fclose($fp);

		return true;
	}

	/**
	 * Check if email should be processed based on retry limit
	 * Returns true if should process, false if retry limit exceeded
	 */
	private function shouldProcessEmail($messageId)
	{
		$maxRetries = (int)($_ENV['MAX_EMAIL_RETRIES'] ?? 1);
		$attempts = $this->getProcessingStatus($messageId);

		if (count($attempts) >= $maxRetries) {
			errlog("MessageID {$messageId} has already been processed " . count($attempts) . " time(s). Max retries: {$maxRetries}");
			return false;
		}

		return true;
	}

    public function processPostmarkRequest($body, $outputJsonOnly = false, $cliDebug = false, $outputIcsOnly = false)
	{
		if (LOG_LEVEL == LogLevel::DEBUG) {
			errlog(json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
		}

		$messageId = $body['MessageID'] ?? null;

		errlog("Received email with subject of " . $body['Subject']);

		if (
			strpos($body['Subject'], 'Accepted:') === 0 ||
			strpos($body['Subject'], 'Declined:') === 0 ||
			strpos($body['Subject'], 'Tentative:') === 0
		) {
			errlog('Skipping response email with subject ' . $body['Subject']);
			return;
		}

		// Check if email has already been processed too many times
		if ($messageId && !$this->shouldProcessEmail($messageId)) {
			errlog("Skipping email - retry limit exceeded for MessageID: {$messageId}");
			echo json_encode(['status' => 'skipped', 'message' => 'Email already processed - retry limit exceeded']);
			return;
		}

		// One processed-record key per run: a 'started' entry is written now and overwritten with the final status,
		// so a Postmark webhook retry that arrives while this run is still going is deduped by shouldProcessEmail().
		$this->currentProcessingKey = date('Y-m-d H:i:s');
		if ($messageId) {
			$this->recordProcessingAttempt($messageId, $body['Subject'] ?? 'no_subject', 'started');
		}

		// Wrap entire processing in try-catch to record status
		try {
        
        $emailInput = (new EmailInputSource())->parsePostmarkDirectives($body);
        $htmlBodyForAI = $emailInput['htmlBody'];
        $textBodyForExtraction = $emailInput['textBody'];

		$pdfText = $this->extractPdfText($body['Attachments'] ?? []);

        $extractedUrl = $emailInput['url'];
        $extractedInstructions = $emailInput['instructions'];
        $hasMultiFlag = $emailInput['hasMultiFlag'];
        if ($hasMultiFlag) {
            errlog("Found standalone MULTI keyword in email body");
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
		$downloadedPageTitle = null;
		$screenshotData = null;
		$this->fetchedScreenshot = null;
		$emailContextText = $combinedText;
		$frame = static function (string $pageContent, ?string $title) use ($emailContextText): string {
			if (trim($pageContent) === '') {
				return $emailContextText;
			}
			return $emailContextText . "\n\n--- HTML content fetched from URL found in email TextBody ---\n```html\n" . $pageContent . "\n```";
		};

		if ($extractedUrl) {
			// Strip tracking parameters from extracted URL
			$extractedUrl = $this->stripTrackingParameters($extractedUrl);
            errlog("URL found in TextBody (after stripping tracking): {$extractedUrl}. Fetching through levels as needed...");
			$provider = new UrlLevelContentProvider($this->urlFetcher, $this->contentExtractor, $extractedUrl, $frame);
			if (!$provider->hasAnyContent()) {
                errlog("Failed to fetch content from URL found in TextBody: {$extractedUrl}. Continuing with email content only. " . json_encode($provider->fetchSummary()));
                $provider = new StaticContentProvider('', $frame);
            }
		} else {
			$provider = new StaticContentProvider('', $frame);
		}

        // Check if multi-day mode should be enabled
        $allowMultiDay = false;
        if ($hasMultiFlag) {
            $allowMultiDay = true;
            errlog("Multi-day mode enabled via standalone MULTI keyword");
        } elseif (!empty($extractedInstructions) && stripos($extractedInstructions, 'MULTI') !== false) {
            $allowMultiDay = true;
            errlog("Multi-day mode enabled via MULTI in Instructions field");
        } elseif ($this->shouldExtractEqualPerformances((string)$provider->fullText(), $extractedInstructions)) {
            $allowMultiDay = true;
            errlog("Multi-day mode enabled automatically for equal performance schedule");
        }

        // Retry strategy: per model, snippet then full page on the first fetch level that worked,
        // full page on later levels, then the next model from the start.
        $outcome = $this->runGeneration(
            $this->generationModels(),
            $provider,
            $extractedInstructions,
            null,
            $screenshotData,
            $allowMultiDay,
            $extractedUrl ?: null,
            $cliDebug
        );
        $eventDetails = $outcome->eventDetails;
        if ($provider instanceof UrlLevelContentProvider) {
            $usedVariant = $outcome->contentUsed;
            if ($usedVariant === null) {
                foreach ($provider->levels() as $level) {
                    $variants = $provider->variantsForLevel($level);
                    if ($variants !== []) {
                        $usedVariant = $variants[0];
                        break;
                    }
                }
            }
            $downloadedUrlContent = $usedVariant?->pageContent;
            $downloadedPageTitle = $usedVariant?->title;
        }

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
            if (isset($eventDataValue) && is_array($eventDataValue)) {
                // Check for single event (has 'summary' key directly)
                if (!empty($eventDataValue['summary'])) {
                    $isEventDataValid = true;
                }
                // Check for multiple events (array of events)
                elseif (isset($eventDataValue[0]) && is_array($eventDataValue[0]) && !empty($eventDataValue[0]['summary'])) {
                    $isEventDataValid = true;
                }
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
                'generation'     => $outcome->toMetadata(),
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
        $candidateSet = null;
        $recipientEmail = $this->toTentativeEmail;
        if (strcasecmp($body['ToFull'][0]['Email'] ?? '', $this->inboundConfirmedEmail) === 0) {
            $recipientEmail = $this->toConfirmedEmail;
        }
        if (($eventDetails['success'] ?? false) && !empty($eventDetails['eventData'])) {
            $generator = new IcalGenerator();
            $calendarEvent = $generator->convertJsonToIcs($eventDetails['eventData'], $this->fromEmail);
            $this->logFinalIcs('postmark/generated event', $calendarEvent);
            $candidateSet = $this->buildCandidateSet(
                $eventDetails,
                $outcome,
                'postmark',
                $extractedUrl ?: null,
                'email input',
                $this->buildPostmarkSourceDataHtml($body),
                $downloadedUrlContent,
                $extractedInstructions,
                $allowMultiDay,
                $recipientEmail === $this->toTentativeEmail,
                $recipientEmail,
                $body,
                $pdfText
            );
        } elseif (($eventDetails['success'] ?? false) === false) {
            errlog("Skipping ICS generation for Postmark email because AI processing failed: " . ($eventDetails['errorMessage'] ?? 'Unknown AI error'));
        } else { // Success was true, but eventData was empty/missing
            errlog("Skipping ICS generation for Postmark email because eventData was missing/empty from AI despite success. Error: " . ($eventDetails['errorMessage'] ?? 'eventData missing'));
        }

        // Only send email if we successfully generated a calendar event
        if ($calendarEvent && $candidateSet !== null) {
            // If in CLI mode and --display flag set, output ICS to stdout
            if ($outputIcsOnly && defined('IS_CLI_RUN') && IS_CLI_RUN) {
                echo $calendarEvent;
                exit(0);
            }

            $sendAllRequested = $hasMultiFlag || (!empty($extractedInstructions) && stripos($extractedInstructions, 'MULTI') !== false);
            $plan = DeliveryPlanner::plan($candidateSet->count(), $sendAllRequested);
            $this->candidateStore->save($candidateSet);

            if ($plan === DeliveryPlanner::CANDIDATES) {
                $this->sendCandidateChoiceEmail($candidateSet);
                errlog("{$candidateSet->count()} candidate events found; choice email sent to {$recipientEmail} (key {$candidateSet->key})");
                if ($messageId) {
                    $this->recordProcessingAttempt($messageId, $body['Subject'] ?? 'no_subject', 'candidates_pending', $calendarEvent, null, null, $downloadedUrlContent, $this->fetchedScreenshot, $pdfText, $htmlBodyForAI, $this->buildProcessingMetadata($extractedUrl, $downloadedPageTitle, $eventDetails, $outcome) + ['candidateKey' => $candidateSet->key]);
                }
                echo json_encode([
                    'status' => 'success',
                    'message' => $candidateSet->count() . ' candidate events found; choice email sent',
                    'candidateKey' => $candidateSet->key,
                ]);
                return;
            }

            $emailsSent = $this->sendCandidateEvents($candidateSet, $candidateSet->allIndexes());

            // Record successful processing
            if ($messageId) {
                $this->recordProcessingAttempt($messageId, $body['Subject'] ?? 'no_subject', 'success', $calendarEvent, null, null, $downloadedUrlContent, $this->fetchedScreenshot, $pdfText, $htmlBodyForAI, $this->buildProcessingMetadata($extractedUrl, $downloadedPageTitle, $eventDetails, $outcome));
            }

            echo json_encode([
                'status' => 'success',
                'message' => $emailsSent > 1
                    ? $emailsSent . ' calendar emails processed successfully'
                    : 'Email processed successfully',
                'candidateKey' => $candidateSet->key,
            ]);
        } else {
            // Send error email since ICS generation failed
            errlog("Sending error email because ICS generation failed");
            $errorMessage = $eventDetails['errorMessage'] ?? 'Unknown error occurred during processing';
            $this->sendErrorEmail(
                'Email-to-ICS Processing Failed: ' . ($body['Subject'] ?? 'No Subject'),
                $errorMessage . "\n\nGeneration attempts:\n" . $outcome->attemptLog(),
                $body
            );

            // Record failed processing
            if ($messageId) {
                $this->recordProcessingAttempt($messageId, $body['Subject'] ?? 'no_subject', 'failure', null, $errorMessage, null, $downloadedUrlContent, $this->fetchedScreenshot, $pdfText, $htmlBodyForAI, $this->buildProcessingMetadata($extractedUrl, $downloadedPageTitle, $eventDetails, $outcome));
            }

            echo json_encode(['status' => 'error', 'message' => 'Failed to process email - error notification sent']);
        }

        } catch (\Throwable $e) {
            // Record exception
            $errorMessage = $e->getMessage();
            $stackTrace = $e->getTraceAsString();
            errlog("Exception processing email: " . $errorMessage);
            errlog("Stack trace: " . $stackTrace);

            if ($messageId) {
                $this->recordProcessingAttempt($messageId, $body['Subject'] ?? 'no_subject', 'exception', null, $errorMessage, $stackTrace, $downloadedUrlContent ?? null, $this->fetchedScreenshot ?? null, $pdfText ?? null, $htmlBodyForAI ?? null, $this->buildProcessingMetadata($extractedUrl ?? null, $downloadedPageTitle ?? null, $eventDetails ?? [], $outcome ?? null));
            }

            // Send error email
            $this->sendErrorEmail(
                'Email-to-ICS Processing Exception: ' . ($body['Subject'] ?? 'No Subject'),
                $errorMessage . "\n\nStack Trace:\n" . $stackTrace . (isset($outcome) ? "\n\nGeneration attempts:\n" . $outcome->attemptLog() : ''),
                $body
            );

            echo json_encode(['status' => 'error', 'message' => 'Exception occurred during processing']);
        }
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
	
	/**
	 * Strip UTM and other tracking parameters from a URL
	 */
	private function stripTrackingParameters($url) {
		if (empty($url)) {
			return $url;
		}
		
		$parsedUrl = parse_url($url);
		if (!$parsedUrl || !isset($parsedUrl['query'])) {
			return $url; // No query string, return as-is
		}
		
		// Parse the query string
		parse_str($parsedUrl['query'], $params);
		
		// List of tracking parameters to remove
		$trackingParams = [
			'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
			'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
			'fbclid', 'gclid', 'dclid', 'msclkid',
			'mc_cid', 'mc_eid', // Mailchimp
			'_ga', '_gid', '_gac', // Google Analytics
			'ref', 'referer', 'referrer'
		];
		
		// Remove tracking parameters
		foreach ($trackingParams as $param) {
			unset($params[$param]);
		}
		
		// Rebuild the URL
		$cleanUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];
		if (isset($parsedUrl['port'])) {
			$cleanUrl .= ':' . $parsedUrl['port'];
		}
		if (isset($parsedUrl['path'])) {
			$cleanUrl .= $parsedUrl['path'];
		}
		if (!empty($params)) {
			$cleanUrl .= '?' . http_build_query($params);
		}
		if (isset($parsedUrl['fragment'])) {
			$cleanUrl .= '#' . $parsedUrl['fragment'];
		}
		
		return $cleanUrl;
	}

	private function fetch_url($url) {
		// Validate URL before attempting to fetch the content
		if (!filter_var($url, FILTER_VALIDATE_URL)) {
			errlog("Invalid URL provided: {$url}");
			return false;
		}

		$result = $this->urlFetcher->fetch($url);
		if ($result === null) {
			return false;
		}

		$this->fetchedScreenshot = $result->screenshotBase64;
		return $result->content;
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
     * Get list of allowed model IDs from ALLOWED_MODELS env variable
     */
    private function getAllowedModelIds()
    {
        $allowedModelsCsv = $_ENV['ALLOWED_MODELS'] ?? '';
        if (empty($allowedModelsCsv)) {
            return array_keys($this->availableModels); // Return all models if not configured
        }

        $allowedModelIds = array_map('trim', explode(',', $allowedModelsCsv));
        $allowedModelIds = array_filter($allowedModelIds); // Remove empty entries
        $allowedModelIds = array_map(function($id) { return trim($id, ' \t\n\r\0\x0B"\''); }, $allowedModelIds);

        return array_filter($allowedModelIds); // Return non-empty IDs
    }

    /**
     * Models to try, in order: explicitly requested, DEFAULT_MODEL, ALTERNATE_MODEL, remaining ALLOWED_MODELS.
     * Unknown model ids (not in the OpenRouter catalog) are dropped.
     *
     * @return list<string>
     */
    private function generationModels(?string $requested = null): array
    {
        $isKnown = fn(string $model): bool => $this->availableModels === [] || isset($this->availableModels[$model]);
        $models = ModelOrder::build(
            $_ENV['DEFAULT_MODEL'] ?? $this->aiModel,
            $_ENV['ALTERNATE_MODEL'] ?? null,
            $this->getAllowedModelIds(),
            $requested,
            $isKnown
        );

        return $models === [] ? [$this->aiModel] : $models;
    }

    /**
     * Shared retry flow for every input path. For each model: snippet then full page on the first
     * fetch level with content, full page on each later level, then the next model from the start.
     *
     * @param list<string> $models
     */
    protected function runGeneration(array $models, ContentVariantProvider $provider, $instructions, $screenshotViewport, $screenshotZoomed, bool $allowMultiDay, ?string $sourceUrl, bool $cliDebug = false, array $editContext = []): GenerationOutcome
    {
        $maxAttempts = max(1, (int)($_ENV['MAX_GENERATION_ATTEMPTS'] ?? 24));
        $budget = max(1, (int)($_ENV['GENERATION_TIME_BUDGET_SECONDS'] ?? 600));
        if (!(defined('IS_CLI_RUN') && IS_CLI_RUN)) {
            @set_time_limit(max((int)ini_get('max_execution_time'), $budget + 120));
        }

        $runner = new GenerationRetryRunner(
            fn(string $model, ContentVariant $variant): array => $this->generateIcalEvent(
                $variant->text,
                $instructions,
                $screenshotViewport,
                $screenshotZoomed,
                $model,
                $cliDebug,
                $allowMultiDay,
                $sourceUrl,
                $editContext
            ),
            new EventResponseValidator(),
            $maxAttempts,
            $budget
        );

        errlog("Generation plan: models [" . implode(', ', $models) . "], levels [" . implode(', ', $provider->levels()) . "], max attempts {$maxAttempts}, budget {$budget}s");
        $outcome = $runner->run($models, $provider);
        errlog("Generation outcome: " . ($outcome->success ? 'success' : 'failure') . "\n" . $outcome->attemptLog());

        if ($outcome->success && $outcome->winning !== null) {
            $this->aiModel = $outcome->winning->model;
        }

        return $outcome;
    }

	protected function postOpenRouterChatCompletion(array $data)
	{
		return $this->openaiClient->post('chat/completions', [
			'json' => $data,
			'http_errors' => false,
		]);
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
    protected function generateIcalEvent($combinedText, $instructions = null, $screenshotViewport = null, $screenshotZoomed = null, $requestedModel = null, $cliDebug = false, $allowMultiDay = false, $sourceUrl = null, array $editContext = [])
    {
        // If a specific model was requested, use it
        if ($requestedModel) {
            $previousModel = $this->aiModel;
            $this->aiModel = $requestedModel;
            errlog("Switching model from {$previousModel} to {$requestedModel} for this request");
        }

        [$data, $responseSchema] = $this->buildGenerationRequest($this->aiModel, $combinedText, $instructions, $screenshotViewport, $screenshotZoomed, (bool)$allowMultiDay, $sourceUrl, $editContext);

        if ($cliDebug && defined('IS_CLI_RUN') && IS_CLI_RUN) {
            fwrite(STDERR, "\n--- AI REQUEST DATA (DEBUG) ---\n");
            fwrite(STDERR, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
            fwrite(STDERR, "--- END AI REQUEST DATA ---\n\n");
        }

        errlog('Sending OpenRouter request to model: ' . $this->aiModel);
        $api_start_time = microtime(true);

        try {
            // Make direct POST request to OpenRouter
            $guzzleResponse = $this->postOpenRouterChatCompletion($data);

            $api_duration = microtime(true) - $api_start_time;
            $statusCode = $guzzleResponse->getStatusCode();
            $responseBody = (string) $guzzleResponse->getBody();

            errlog('Received OpenRouter response in ' . number_format($api_duration, 4) . ' seconds');
            errlog('Response status code: ' . $statusCode);
            errlog('Response body (first 1000 non-leading-whitespace chars): ' . substr(ltrim($responseBody), 0, 1000));

            // Parse JSON response
            $response = json_decode($responseBody, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $jsonError = json_last_error_msg();
                errlog("Failed to parse OpenRouter JSON response: " . $jsonError);
                errlog("Raw response: " . $responseBody);

                return [
                    'success' => false,
                    'errorMessage' => "Invalid JSON from API: " . $jsonError,
                    'eventData' => null,
                    'emailSubject' => 'Error: Invalid API Response',
                    'locationLookup' => null
                ];
            }

            // Check for HTTP error status
            if ($statusCode >= 400) {
                $errorMsg = "OpenRouter API returned error status {$statusCode}";
                if (isset($response['error'])) {
                    $errorMsg .= ": " . ($response['error']['message'] ?? json_encode($response['error']));
                }
                errlog($errorMsg);
                errlog("Full error response: " . json_encode($response, JSON_PRETTY_PRINT));

                // These are retryable errors - try next model
                return [
                    'success' => false,
                    'errorMessage' => $errorMsg,
                    'eventData' => null,
                    'emailSubject' => 'Error: API Error',
                    'locationLookup' => null
                ];
            }

            // Check if response has expected structure
            if (!isset($response['choices']) || !isset($response['choices'][0]) || !isset($response['choices'][0]['message']['content'])) {
                errlog("OpenRouter response missing expected 'choices' structure.");
                errlog("Full response: " . json_encode($response, JSON_PRETTY_PRINT));

                // Check for error field in response
                if (isset($response['error'])) {
                    $errorMsg = "OpenRouter API error: " . ($response['error']['message'] ?? json_encode($response['error']));
                    errlog($errorMsg);

                    return [
                        'success' => false,
                        'errorMessage' => $errorMsg,
                        'eventData' => null,
                        'emailSubject' => 'Error: API Error',
                        'locationLookup' => null
                    ];
                }

                return [
                    'success' => false,
                    'errorMessage' => "Malformed API response (missing 'choices' field)",
                    'eventData' => null,
                    'emailSubject' => 'Error: Malformed Response',
                    'locationLookup' => null
                ];
            }

        } catch (\Throwable $e) {
            errlog("Exception during OpenRouter request: " . $e->getMessage());
            errlog("Error class: " . get_class($e));
            errlog("Stack trace: " . $e->getTraceAsString());

            // All exceptions during API call are retryable - try next model
            return [
                'success' => false,
                'errorMessage' => "HTTP request failed: " . $e->getMessage(),
                'eventData' => null,
                'emailSubject' => 'Error: Request Failed',
                'locationLookup' => null
            ];
        }

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

        $ret = $this->parseGenerationContent($returnedData, $responseSchema);
        if (($ret['success'] ?? false) !== true) {
            return $ret;
        }

        return $this->finalizeEventDetails($ret);
    }

    /**
     * Builds the OpenRouter chat-completion request and the response schema for one generation attempt.
     *
     * @param array<string, mixed> $editContext optional previous output for reply-to-edit flows
     * @return array{0: array<string, mixed>, 1: array<string, mixed>} [$requestData, $responseSchema]
     */
    protected function buildGenerationRequest(string $model, $combinedText, $instructions = null, $screenshotViewport = null, $screenshotZoomed = null, bool $allowMultiDay = false, ?string $sourceUrl = null, array $editContext = []): array
    {
        // Define the NEW schema for structured event data
        $eventSchema = [
            'type' => 'object',
            'properties' => [
                'summary' => ['type' => 'string', 'description' => 'Concise title for the event, formatted as "<organization name:optional> - <event name>" and not prefixed with the venue unless the venue is itself the organizer/brand.'],
                'description' => ['type' => 'string', 'description' => 'Plain text description of the event (use \\n for newlines).'],
                'htmlDescription' => ['type' => 'string', 'description' => 'HTML formatted version of the description. REQUIRED - convert plain text to HTML if needed.'],
                'dtstart' => ['type' => 'string', 'description' => 'Start date/time in ISO 8601 format (e.g., 2024-10-28T06:30:00).'],
                'dtend' => ['type' => 'string', 'description' => 'End date/time in ISO 8601 format (e.g., 2024-10-28T07:00:00). Optional, defaults based on event type if missing.'],
                'timezone' => ['type' => 'string', 'description' => 'PHP Timezone identifier (e.g., America/Los_Angeles, America/New_York, UTC).'],
                'location' => ['type' => 'string', 'description' => 'Physical location or address of the event.'],
                'url' => ['type' => 'string', 'description' => 'URL related to the event (e.g., event page, ticket link).'],
                'isAllDay' => ['type' => 'boolean', 'description' => 'True if this is an all-day event (dtstart/dtend should be date only: YYYY-MM-DD).', 'default' => false],
            ],
            // GPT-5 requires ALL properties to be in the required array for structured output
            'required' => ['summary', 'description', 'htmlDescription', 'dtstart', 'dtend', 'timezone', 'location', 'url', 'isAllDay'],
            'additionalProperties' => false
        ];

        // eventData is ALWAYS an array of candidate events (one element in the default case).
        // No oneOf: not supported by providers; maxItems kept small because Google rejects schemas with many array states.
        $eventDataSchema = [
            'type' => 'array',
            'items' => $eventSchema,
            'minItems' => 1,
            'maxItems' => 10,
        ];

        $responseSchema = [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean'],
                'errorMessage' => ['type' => 'string'],
                'eventData' => $eventDataSchema,
                'emailSubject' => ['type' => 'string', 'description' => 'The generated summary, used for the email subject line. It should match the summary exactly.'],
                'locationLookup' => ['type' => 'string', 'description' => 'Location string for Google Maps lookup.'],
            ],
            'required' => ['success', 'errorMessage', 'eventData', 'emailSubject', 'locationLookup'],
            'additionalProperties' => false,
        ];

        $currentDate = $this->getCurrentDate();
        $curYear = $currentDate->format('Y');
        $curDate = $currentDate->format('m/d');
        $nextYear = $curYear + 1;
        $sharedPromptPolicy = $this->getSharedPromptPolicyText();

        // Determine multi-day handling instructions
        $multiDayInstructions = $allowMultiDay ?
            "## Multi-Day Mode (ENABLED):
CRITICAL: Extract each equal related performance/session as a SEPARATE event.

Follow the shared prompt policy exactly, especially the tagged equal-performance and exception rules.

When you see multiple performances like:
- \"Friday, October 3, 2025 at 7:30PM\"
- \"Saturday, October 4, 2025 at 7:30PM\"
- \"Sunday, October 5, 2025 at 2:00PM\"

Create SEPARATE events for each performance, each with:
- Same summary/title (e.g., \"San Francisco Symphony - Gimeno Conducts Tchaikovsky 5\")
- Same location and description
- Different start_date, start_time, end_date, end_time for each performance
- Same timezone

RETURN FORMAT:
eventData is ALWAYS an ARRAY of event objects, even if there's only ONE event.
- One event found: [{event}]
- Multiple events found: [{event1}, {event2}, ...]

This applies to:
- Multiple concert performances
- Conference sessions across days
- Festival events on different dates
- Any scheduled performances of the same show" :
            "## Single Event Mode (DEFAULT):
Focus on extracting ONLY the main/primary event. Ignore secondary or related events.

CANDIDATE POLICY: eventData is always an ARRAY. In this mode return exactly ONE event object in it.
Return more than one candidate ONLY when:
- the shared prompt policy's equal-performance rule applies (one show with several peer performance date/times and no selected or primary date), or
- the content genuinely describes several distinct events and none can be identified as the primary one.
In that case put the most likely intended event first. Never add secondary, related, or \"you might also like\" events as extra candidates, and never list the same performance twice.";

        // Primary event identification instructions - only in single-event mode
        $primaryEventInstructions = $allowMultiDay ? "" :
            "# PRIMARY EVENT IDENTIFICATION - READ THIS FIRST
Your primary task is to identify and extract ONLY the MAIN event described in the content.

How to identify the primary event:
- It's typically the most prominently featured and detailed event
- It's often the first event described in detail
- It's usually the subject of the email or central content of the webpage
- For ticketed events, it's the event for which the ticket/confirmation is issued

Explicitly IGNORE these secondary events:
- Events labeled as \"Related Events\", \"You might also like\", \"Upcoming Events\", \"Other shows\"
- Events in sidebars or supplementary sections
- Events mentioned only in passing or with minimal details
- Any event clearly not the focus of the email/page

EXTREMELY IMPORTANT: IF you find multiple events and are unsure which is primary, choose the event with:
1. The most complete details (date, time, location)
2. The earliest upcoming date
3. The most prominence in the content

";

        $system = <<<PROMPT
You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

CRITICAL: You must respond with valid JSON only. No markdown, no explanations, just pure JSON.

{$primaryEventInstructions}
# SHARED EVENT SELECTION POLICY

{$sharedPromptPolicy}

# MULTI-DAY EVENT HANDLING MODES

{$multiDayInstructions}

# TIMEZONE AND LOCATION EMPHASIS
If a location is specified (e.g., New York City, Madison, San Francisco), infer the appropriate timezone immediately.
If no location is found in the content, default to Pacific Time.
If a date is given but no specific time, set 'isAllDay' to true and format dtstart/dtend as 'YYYY-MM-DD'.

# IGNORE SPONSOR OR POLICY DISCLAIMERS
Do not include details about sponsors or policy disclaimers unless they are explicitly part of the main event content.

# OUTPUT FORMAT - JSON STRUCTURE
Return a JSON object containing the structured event data. eventData is ALWAYS an ARRAY of candidate events (exactly one element unless the candidate policy requires more). DO NOT return an ICS file string.
The JSON object MUST conform EXACTLY to the following schema:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "errorMessage": { "type": "string", "description": "Error message if success is false." },
    "eventData": {
      "type": "array",
      "description": "Candidate events. Exactly one element unless the candidate policy requires more (max 10).",
      "minItems": 1,
      "maxItems": 10,
      "items": {
      "type": "object",
      "properties": {
        "summary": { "type": "string", "description": "Concise title for the event, formatted as '<organization name:optional> - <event name>' without unnecessary venue prefixes." },
        "description": { "type": "string", "description": "Plain text description (use \\\\n for newlines)." },
        "htmlDescription": { "type": "string", "description": "HTML formatted version of the description. REQUIRED - convert plain text to HTML if needed." },
        "dtstart": { "type": "string", "description": "Start date/time (ISO 8601: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD for all-day)." },
        "dtend": { "type": "string", "description": "End date/time (ISO 8601: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD for all-day). Optional." },
        "timezone": { "type": "string", "description": "PHP Timezone ID (e.g., America/Los_Angeles)." },
        "location": { "type": "string", "description": "Physical location/address." },
        "url": { "type": "string", "description": "Related URL." },
        "isAllDay": { "type": "boolean", "description": "True for all-day events.", "default": false }
      },
      "required": ["summary", "description", "htmlDescription", "dtstart", "dtend", "timezone", "location", "url", "isAllDay"]
      }
    },
    "emailSubject": { "type": "string", "description": "Use the generated summary here (the first candidate's summary when several are returned)." },
    "locationLookup": { "type": "string", "description": "Location string for Google Maps lookup." }
  },
  "required": ["success", "errorMessage", "eventData", "emailSubject", "locationLookup"]
}
```

# FIELD SPECIFIC INSTRUCTIONS
- **summary:** Generate a relevant title in this format: `<organization name:optional> - <event name>`.
  * Prefer the organizer, presenting institution, series, or artist as the prefix when one is clearly named.
  * Use the main event/show/program name as the second part.
  * If there is no distinct organization, just use the event name.
  * Do NOT prepend the venue, building, hall, pavilion, address, or neighborhood unless that venue name is also the actual organizer/brand of the event.
  * Good examples: "San Francisco Symphony - Beethoven 5", "San Francisco Art Fair", "San Francisco Art Fair (Sunday Visit)", "SF Opera - La Boheme"
  * Bad examples: "Fort Mason Festival Pavilion - San Francisco Art Fair", "Davies Symphony Hall - Beethoven 5"
- **description:** Create a concise plain-text summary with rich details:
  * For artistic events: Highlight featured artists, performers, and full program/repertoire
  * For concerts/opera: Include composer names, piece titles, featured soloists
  * For conferences: Include key speakers and session topics
  * For all events: Include ticket/registration info, preparation requirements, accessibility details
  * Use `\\n` for newlines. Keep under 1000 chars. DO NOT include raw HTML. For flights, include Flight #, Confirmation #, Departure/Arrival details. Include Eventbrite ticket links prominently if found.
  * IMPORTANT: Always add the source URL at the bottom of the description with the text "\\n\\nSource: [URL]" if any URL context was provided
- **htmlDescription:** Provide a concise HTML version of the description, ideally under 1500 characters. Use basic HTML tags only (e.g., `<p>`, `<a>`, `<b>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<br>`). DO NOT include `<style>` tags or inline `style` attributes. Minimize complex formatting. Always include the source URL at the bottom as a clickable link if any URL context was provided.
- **dtstart / dtend:** Use ISO 8601 format. Calculate end time if missing (2h default, 3h opera, 30m doctor). Use YYYY-MM-DD format ONLY if `isAllDay` is true.
- **timezone:** Provide a valid PHP Timezone identifier (e.g., `America/Los_Angeles`, `America/New_York`, `UTC`). Infer from location if possible, default to `America/Los_Angeles` if unknown/virtual.
- **location:** The venue name or address.
- **url:** REQUIRED - Use the original source URL if provided for fetching this event. Otherwise, include any event-specific link (tickets, registration, etc.) found in the content.
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
        
        // Add source URL information if provided
        if ($sourceUrl) {
            $messages[] = [
                'role' => 'system',
                'content' => "*** SOURCE URL ***\nThe content was fetched from: {$sourceUrl}\nYou MUST include this URL in the 'url' field of the event data, and also add it to the bottom of both the plain text and HTML descriptions."
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
            'model' => $model,
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

		if ($this->aiSeed !== null) {
			$data['seed'] = $this->aiSeed;
		}

        return [$data, $responseSchema];
    }

    /**
     * Extracts and validates the JSON object from the model's reply. Never throws: failures return a
     * ['success' => false, ...] structure so the retry runner can move on.
     */
    protected function parseGenerationContent(string $returnedData, array $responseSchema): array
    {
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
            // Return failed result so retry logic can continue
            return [
                'success' => false,
                'errorMessage' => $errorMsg,
                'eventData' => null,
                'emailSubject' => 'Error: Invalid AI Response',
                'locationLookup' => null
            ];
        }

        // Use the successfully decoded JSON array
        $ret = $decodedJson;


			if (isset($ret['success']) && $ret['success'] === false) {
				$errorMessage = $ret['errorMessage'] ?? 'AI indicated failure with no specific message.';
				errlog("AI returned success = false: {$errorMessage}\nJSON: {$jsonData}");

				// Don't throw exception - return the failed result so retry logic can continue
				// The retry runner (runGeneration) will try other content tiers, fetch levels and models
				return $ret;
			}

			// Strict schema validation of successful responses (opis/json-schema validates object trees, so decode as objects).
			try {
				$validator = new \Opis\JsonSchema\Validator();
				$validationResult = $validator->validate(json_decode($jsonData), json_encode($responseSchema));
			} catch (\Throwable $validationException) {
				errlog("Schema validation could not run: " . $validationException->getMessage());
				$validationResult = null;
			}
			if ($validationResult !== null && !$validationResult->isValid()) {
				$validationError = $validationResult->error();
				$formatted = $validationError !== null ? (new \Opis\JsonSchema\Errors\ErrorFormatter())->format($validationError, false) : [];
				$errorMsg = 'AI response failed schema validation: ' . json_encode($formatted ?: $this->formatValidationErrors($validationError), JSON_UNESCAPED_SLASHES);
				errlog($errorMsg . " JSON: {$jsonData}");
				return [
					'success' => false,
					'errorMessage' => $errorMsg,
					'eventData' => $ret['eventData'] ?? null,
					'emailSubject' => $ret['emailSubject'] ?? 'Error: Schema Validation Failed',
					'locationLookup' => $ret['locationLookup'] ?? null
				];
			}

			// Check for valid eventData structure (single event or array of events)
			$eventData = $ret['eventData'] ?? null;
			$hasValidEventData = false;
			
			if (is_array($eventData)) {
				// Check for single event (has 'summary' key directly)
				if (!empty($eventData['summary'])) {
					$hasValidEventData = true;
				}
				// Check for multiple events (array of events)
				elseif (isset($eventData[0]) && is_array($eventData[0]) && !empty($eventData[0]['summary'])) {
					$hasValidEventData = true;
				}
			}
			
			if (!$hasValidEventData) {
				errlog("AI response missing required 'eventData.summary'. JSON: {$jsonData}");
				// Return failed result so retry logic can continue
				return [
					'success' => false,
					'errorMessage' => 'AI response missing required eventData.summary',
					'eventData' => $ret['eventData'] ?? null,
					'emailSubject' => $ret['emailSubject'] ?? 'Error: Missing Event Data',
					'locationLookup' => $ret['locationLookup'] ?? null
				];
			}
			if (empty($ret['emailSubject'] ?? null)) {
				errlog("AI response missing required 'emailSubject'. JSON: {$jsonData}");
				// Return failed result so retry logic can continue
				return [
					'success' => false,
					'errorMessage' => 'AI response missing required emailSubject',
					'eventData' => $ret['eventData'] ?? null,
					'emailSubject' => 'Error: Missing Email Subject',
					'locationLookup' => $ret['locationLookup'] ?? null
				];
			}

			return $ret;
	}

    /**
     * Geocodes the location and renders the ICS for a validated response.
     */
    protected function finalizeEventDetails(array $ret): array
    {
			if (!empty($ret['locationLookup'])) {
				try {
					$geocodingResult = $this->geocoder->geocode($ret['locationLookup']);
					$place = $geocodingResult?->formattedLocation;
					errlog("Geocoder lookup for '{$ret['locationLookup']}' returned '{$place}'");
					if ($place && isset($ret['eventData'])) {
						// Update the location within the eventData structure
						// Handle both single event and multiple events (array)
						if (isset($ret['eventData']['summary'])) {
							// Single event object
							$ret['eventData']['location'] = $place;
						} elseif (isset($ret['eventData'][0]) && is_array($ret['eventData'][0])) {
							// Array of events - update location for all events
							foreach ($ret['eventData'] as $key => $event) {
								$ret['eventData'][$key]['location'] = $place;
							}
						}
					} else {
						$geocoderError = $this->geocoder->getLastError();
						if ($geocoderError !== null) {
							$this->sendGeocoderLookupErrorEmail($geocoderError, $ret);
						}
					}
				} catch (Throwable $e) {
					errlog("Error(s) doing geocoder lookup: " . var_export($e, true));
				}
			}

			try {
				$generator = new IcalGenerator();
				$icsString = $generator->convertJsonToIcs($ret['eventData'], $this->fromEmail);
			} catch (\Throwable $icsError) {
				$errorMsg = 'ICS generation failed: ' . $icsError->getMessage();
				errlog($errorMsg);
				return [
					'success' => false,
					'errorMessage' => $errorMsg,
					'eventData' => $ret['eventData'] ?? null,
					'emailSubject' => $ret['emailSubject'] ?? 'Error: ICS Generation Failed',
					'locationLookup' => $ret['locationLookup'] ?? null
				];
			}
			$this->logFinalIcs('ai result', $icsString);

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
			// Get first event's data for filename (whether single event or array of events)
			$firstEvent = isset($eventData[0]) && is_array($eventData[0]) ? $eventData[0] : $eventData;
			
			if (!empty($firstEvent['dtstart'])) {
				$eventDate = substr($firstEvent['dtstart'], 0, 10);
			}
			
			// Clean the summary for use in filename
			if (!empty($firstEvent['summary'])) {
				$eventSummary = $firstEvent['summary'];
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

	/**
	 * "Source data" block for emails that originate from an inbound Postmark message.
	 *
	 * @param array<string, mixed> $originalEmail
	 */
	private function buildPostmarkSourceDataHtml(array $originalEmail): string
	{
		$origBody = $originalEmail['HtmlBody'] ?? nl2br((string)($originalEmail['TextBody'] ?? ''));
		$fromName = (string)($originalEmail['FromName'] ?? '');
		$from = (string)($originalEmail['From'] ?? '');
		$date = (string)($originalEmail['Date'] ?? '');
		$to = (string)($originalEmail['To'] ?? '');
		$subject = (string)($originalEmail['Subject'] ?? '');

		return <<<BODY
<p>
<b>From</b>: {$fromName} <{$from}><br>
<b>Date</b>: {$date}<br>
<b>To</b>: {$to}<br>
<b>Subject</b>: {$subject}<br>


{$origBody}
BODY;
	}

	/**
	 * @param array<string, mixed> $originalEmail
	 */
	private function buildPostmarkEmailBody(array $originalEmail, ?string $sourceUrl, ?string $pdfText, ?string $downloadedText): string
	{
		$htmlBody = $this->buildCalendarEmailBody($sourceUrl, 'email input', $this->buildPostmarkSourceDataHtml($originalEmail), $downloadedText);

		if (!empty($pdfText)) {
			$htmlBody .= <<<BODY


---------- PDF contents ----------<br>
{$pdfText}
BODY;
		}

		return $htmlBody;
	}

	/**
	 * Packs a successful generation into the server-side candidate state: one single-event ICS per
	 * candidate plus everything needed to send (or re-send, or edit) later without regenerating.
	 *
	 * @param array<string, mixed> $eventDetails
	 * @param array<string, mixed>|null $originalEmail Postmark body for inbound-email origins
	 */
	private function buildCandidateSet(array $eventDetails, ?GenerationOutcome $outcome, string $origin, ?string $sourceUrl, string $sourceLabel, string $sourceDataHtml, ?string $sourceContent, ?string $instructions, bool $multiMode, bool $tentative, string $recipientEmail, ?array $originalEmail = null, ?string $pdfText = null): CandidateSet
	{
		$generator = new IcalGenerator();
		$candidates = [];
		foreach ($this->eventDataItems($eventDetails['eventData'] ?? null) as $index => $singleEventData) {
			$candidates[] = new Candidate($index, $singleEventData, $generator->convertJsonToIcs($singleEventData, $this->fromEmail));
		}

		$resolvedSourceUrl = $this->eventSourceUrl($eventDetails, $sourceUrl);
		$htmlBody = $originalEmail !== null
			? $this->buildPostmarkEmailBody($originalEmail, $resolvedSourceUrl, $pdfText, $sourceContent)
			: $this->buildCalendarEmailBody($resolvedSourceUrl, $sourceLabel, $sourceDataHtml, $sourceContent);

		$attachments = [];
		foreach (($originalEmail['Attachments'] ?? []) as $attachment) {
			if (is_array($attachment) && !empty($attachment['Name']) && isset($attachment['Content'])) {
				$attachments[] = $attachment;
			}
		}

		$key = $this->candidateStore->newKey();
		$now = time();

		return new CandidateSet(
			key: $key,
			createdAt: date('c', $now),
			expiresAt: $this->candidateStore->expiresAtFor($now),
			candidates: $candidates,
			baseSubject: (string)($eventDetails['emailSubject'] ?? 'Calendar Event'),
			sourceUrl: $resolvedSourceUrl !== '' ? $resolvedSourceUrl : null,
			sourceLabel: $sourceLabel,
			sourceContent: $sourceContent,
			htmlBody: $htmlBody,
			model: $this->aiModel,
			instructions: $instructions,
			multiMode: $multiMode,
			tentative: $tentative,
			recipientEmail: $recipientEmail,
			originalEmail: $originalEmail !== null ? array_intersect_key($originalEmail, array_flip(['MessageID', 'From', 'FromName', 'To', 'Subject', 'Date', 'TextBody', 'HtmlBody'])) : [],
			attachments: $attachments,
			inReplyTo: isset($originalEmail['MessageID']) ? (string)$originalEmail['MessageID'] : null,
			origin: $origin,
			previousKey: null,
			rootKey: $key,
			editRound: 0,
			generation: $outcome?->toMetadata() ?? [],
		);
	}

	/**
	 * Sends one calendar email per selected candidate (never a combined ICS) and records what was sent.
	 *
	 * @param list<int> $indexes
	 */
	public function sendCandidateEvents(CandidateSet $set, array $indexes, ?string $inReplyTo = null): int
	{
		$indexes = array_values(array_unique(array_map('intval', $indexes)));
		sort($indexes);
		$selected = [];
		foreach ($indexes as $index) {
			$candidate = $set->candidate($index);
			if ($candidate !== null) {
				$selected[] = $candidate;
			}
		}
		if ($selected === []) {
			throw new \InvalidArgumentException('No matching candidate events to send.');
		}

		$count = count($selected);
		foreach ($selected as $candidate) {
			$subject = EventSubject::withDate($set->baseSubject, $candidate->eventData, $count);
			$ics = $candidate->ics;
			if ($set->attachments !== []) {
				$links = '';
				foreach ($set->attachments as $attachment) {
					$links .= "\n\nAttachment: " . basename((string)$attachment['Name']);
				}
				$ics = $this->addAttachmentLinksToIcs($ics, $links);
			}
			$this->sendEmail($ics, $set->recipientEmail, $subject, $set->htmlBody, $set->attachments, $inReplyTo ?? $set->inReplyTo);
		}

		$this->candidateStore->save($set->withSent(array_map(static fn(Candidate $c): int => $c->index, $selected)));

		return $count;
	}

	/**
	 * Sends the "choose events" email with create-all / use-only-this / choose links.
	 */
	public function sendCandidateChoiceEmail(CandidateSet $set): void
	{
		$built = CandidateEmailBuilder::build($set, CandidateLinks::baseUrl());
		$this->sendEmail(null, $set->recipientEmail, $built['subject'], $built['htmlBody'], [], $set->inReplyTo);
	}

	public function candidateStore(): CandidateStore
	{
		return $this->candidateStore;
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

		$sourceUrl = $this->eventSourceUrl($eventDetails);
		$htmlBody = $this->buildPostmarkEmailBody($originalEmail, $sourceUrl, $pdfText, $downloadedText);

		// Add attachment links to ICS description if any attachments were processed
		$updatedIcs = $ics;
		if (!empty($attachmentLinks)) {
			$updatedIcs = $this->addAttachmentLinksToIcs($ics, $attachmentLinks);
		}

		// Get MessageID for threading
		$messageId = $originalEmail['MessageID'] ?? null;

		$this->sendEmail($updatedIcs, $toEmail, $subject, $htmlBody, $attachments, $messageId);
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

	public function sendErrorEmail($subject, $errorDetails, $originalEmailData = null)
	{
		if (empty($_ENV['ERROR_EMAIL'])) {
			errlog("ERROR_EMAIL not configured, cannot send error notification");
			return false;
		}

		$htmlBody = '<h2>Email-to-ICS Processing Error</h2>';
		$htmlBody .= '<pre>' . htmlspecialchars($errorDetails) . '</pre>';

		if ($originalEmailData) {
			$htmlBody .= '<hr><h3>Original Email Data:</h3>';
			$htmlBody .= '<p><strong>Subject:</strong> ' . htmlspecialchars($originalEmailData['Subject'] ?? 'N/A') . '</p>';
			$htmlBody .= '<p><strong>From:</strong> ' . htmlspecialchars($originalEmailData['From'] ?? 'N/A') . '</p>';

			if (!empty($originalEmailData['TextBody'])) {
				$htmlBody .= '<h4>Text Body:</h4>';
				$htmlBody .= '<pre>' . htmlspecialchars(substr($originalEmailData['TextBody'], 0, 5000)) . '</pre>';
			}

			if (!empty($originalEmailData['HtmlBody'])) {
				$htmlBody .= '<h4>HTML Body (first 5000 chars):</h4>';
				$htmlBody .= '<pre>' . htmlspecialchars(substr($originalEmailData['HtmlBody'], 0, 5000)) . '</pre>';
			}
		}

		// Get MessageID for threading
		$messageId = $originalEmailData['MessageID'] ?? null;

		try {
			$headers = [];
			if (!empty($messageId)) {
				$headers[] = [
					'Name' => 'In-Reply-To',
					'Value' => $messageId,
				];
			}

			$this->mailer->send(new EmailMessage(
				$this->fromEmail,
				$_ENV['ERROR_EMAIL'],
				$subject,
				$htmlBody,
				[],
				$headers
			));
			return true;
		} catch (\Exception $e) {
			errlog("Failed to send error email: " . $e->getMessage());
			return false;
		}
	}

	private function logFinalIcs(string $context, ?string $ics): void
	{
		if (empty($ics)) {
			errlog("Final ICS {$context}: empty");
			return;
		}

		errlog("Final ICS {$context}:\n{$ics}");
	}

	public function sendEmail($ics, $toEmail, $subject, $htmlBody, array $otherAttachments = [], $inReplyTo = null) {
		$attachments = [];
		if (!empty($ics)) {
			$this->logFinalIcs("email to {$toEmail} subject '{$subject}'", $ics);
			$attachments[] = new EmailAttachment(
				'event.ics',
				base64_encode($ics),
				'text/calendar; method=PUBLISH; charset=UTF-8'
			);
		} else {
			errlog("Sending email without an ICS attachment to {$toEmail} with subject '{$subject}'.");
		}

		foreach ($otherAttachments as $attachment) {
			$attachments[] = $attachment instanceof EmailAttachment
				? $attachment
				: EmailAttachment::fromPostmarkArray($attachment);
		}

		if (empty($subject)) {
			throw new Exception('Subject is empty');
		}

		$headers = [];
		if (!empty($inReplyTo)) {
			$headers[] = 
				[
					'Name' => 'In-Reply-To',
					'Value' => $inReplyTo
				];
		}

		$this->mailer->send(new EmailMessage(
			$this->fromEmail,
			$toEmail,
			$subject,
			$htmlBody,
			$attachments,
			$headers
		));
	}

	private function sendGeocoderLookupErrorEmail(array $lookupError, array $aiResponse): void
	{
		$eventItems = $this->eventDataItems($aiResponse['eventData'] ?? null);
		$eventTitle = $aiResponse['emailSubject'] ?? ($eventItems[0]['summary'] ?? 'Unknown Event');
		$originalLocation = $eventItems[0]['location'] ?? '(not provided)';
		$details = [
			'All configured geocoders failed. The calendar event was still generated and sent with the original location preserved.',
			'',
			'Event: ' . $eventTitle,
			'Original location preserved: ' . $originalLocation,
			'Provider: ' . ($lookupError['provider'] ?? ''),
			'Reason: ' . ($lookupError['reason'] ?? ''),
		];

		foreach ($lookupError['errors'] ?? [$lookupError] as $error) {
			$details[] = '';
			$details[] = 'Provider: ' . ($error['provider'] ?? '');
			$details[] = 'Lookup: ' . ($error['lookup'] ?? '');
			$details[] = 'Reason: ' . ($error['reason'] ?? '');
			$details[] = 'HTTP code: ' . ($error['httpCode'] ?? '');
			$details[] = 'Status: ' . ($error['status'] ?? '');
			$details[] = 'Error: ' . ($error['errorMessage'] ?? '');
			$details[] = 'Result count: ' . ($error['resultCount'] ?? '');

			if (!empty($error['bodySnippet'])) {
				$details[] = 'Response body snippet:';
				$details[] = $error['bodySnippet'];
			}
		}

		try {
			$this->sendErrorEmail(
				'Email-to-ICS Geocoder Lookup Failed: ' . $eventTitle,
				implode("\n", $details)
			);
		} catch (Throwable $e) {
			errlog("Failed to send geocoder lookup error email: " . $e->getMessage());
		}
	}

    /**
     * Sanitize HTML content to remove potentially dangerous elements
     * 
     * @param string $html HTML content to sanitize
     * @return string Sanitized HTML content
     */
	private function html_sanitize($html) : string {
		return CalendarEmailBody::sanitize((string)$html);
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
        $preferredDefault = '~openai/gpt-latest';

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
		errlog("detectUrlInEmailBody called with text body: " . substr($textBody, 0, 200) . "...");

		$urlDetectionModels = [
			$_ENV['URL_DETECTION_MODEL'] ?? '~google/gemini-flash-latest',
			$_ENV['URL_DETECTION_FALLBACK_MODEL'] ?? '~openai/gpt-mini-latest',
		];

		try {
			$detector = new ChainUrlDetector([
				new LocalUrlDetector(),
				new OpenRouterUrlDetector($this->openaiClient, $urlDetectionModels, fn(string $message) => errlog($message)),
			]);
			return $detector->detect($textBody);
		} catch (Exception $e) {
			errlog("Error in URL detection: " . $e->getMessage());
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

if (!defined('EMAIL_TO_ICS_SKIP_FRONT_CONTROLLER') || !EMAIL_TO_ICS_SKIP_FRONT_CONTROLLER) {
Environment::load(__DIR__);

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
	// Use centralized error handler for all unhandled exceptions
	ErrorHandler::handle($t, [
		'show_trace' => false, // Set to true for debugging
		'status_code' => ErrorHandler::getStatusCode($t)
	]);

	// The following code is now unreachable because ErrorHandler::handle() calls exit()
	// but keeping for reference in case we need special error email handling
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

// Confirmation and candidate-link endpoints live in Jcherniak\EmailToIcs\Web\CandidateController (routed by WebPage).

// --- Continue with original script logic ---
}
