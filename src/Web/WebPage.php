<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Web;

use EmailProcessor;
use ErrorHandler;
use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;
use Throwable;
use function errlog;
use function is_cli;

class WebPage
{
    private function projectRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    public function handleRequest()
    {
        // Set CORS headers for all responses
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");

        // Handle CLI first (REQUEST_METHOD not set in CLI)
        if (is_cli()) {
            $this->handleCli();
            return;
        }

        // Handle OPTIONS preflight requests
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            header("HTTP/1.1 204 No Content");
            exit;
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

        if (ProcessedDebugView::isEnabled()) {
            if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['debug_processed'])) {
                $this->displayProcessedDebug();
                return;
            }

            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['debug_processed_replay'])) {
                $this->replayProcessedDebug();
                return;
            }
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
        echo file_get_contents($this->projectRoot() . '/form.html');
        if (ProcessedDebugView::isEnabled()) {
            echo '<div class="container my-3"><a class="btn btn-outline-secondary btn-sm" href="?debug_processed=1">Processed Debug</a></div>';
        }
    }

    private function displayProcessedDebug()
    {
        $view = new ProcessedDebugView(new ProcessedRecordStore($this->projectRoot() . '/processed'));
        if (!empty($_GET['id'])) {
            echo $view->renderDetail((string)$_GET['id']);
            return;
        }

        echo $view->renderIndex();
    }

    private function replayProcessedDebug()
    {
        $store = new ProcessedRecordStore($this->projectRoot() . '/processed');
        $record = $store->readRecord((string)($_POST['id'] ?? ''));
        if ($record === null) {
            http_response_code(404);
            echo 'Processed record not found.';
            return;
        }

        $url = (string)($record->latestAttempt['downloadedUrl'] ?? '');
        $source = $record->downloadedContent ?? $record->emailHtml ?? '';
        $processor = new EmailProcessor();
        $processor->processUrl($url, $source, 'display', true, null, null, $record->screenshotBase64, null, false, false, false, false, true);
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
			
			$input = (new WebFormInputSource($_REQUEST))->toProcessingInput();
			$processor = new EmailProcessor();
			$processor->processUrl(
				$input->url,
				$input->downloadedText,
				$input->display,
				$input->tentative,
				$input->instructions,
				$input->screenshotViewport,
				$input->screenshotZoomed,
				$input->requestedModel,
				$input->needsReview,
				$input->fromExtension,
				$input->outputJsonOnly,
				$input->cliDebug,
				$input->allowMultiDay
			);
    }

    private function isPostmarkInboundWebhook($json_data)
    {
        return isset($json_data['MessageStream']) &&
               $json_data['MessageStream'] === 'inbound';
    }

    private function processPostmarkInbound($json_data)
    {
		// Define constant to track we're in Postmark webhook context
		if (!defined('IS_POSTMARK_WEBHOOK')) {
			define('IS_POSTMARK_WEBHOOK', true);
		}

		try {
			$processor = new EmailProcessor();
			$processor->processPostmarkRequest($json_data);

			// Success - return 200 OK
			http_response_code(200);
			echo json_encode(['status' => 'success', 'message' => 'Webhook processed successfully']);
		} catch (\Throwable $e) {
			// Use centralized error handler - it will ensure 200 is returned
			ErrorHandler::handle($e, ['postmark_data' => $json_data]);
		}
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
            "test-email-text:",     // Optional: Process raw email/test text and output JSON only
            "test-email-file:",     // Optional: Process raw email/test text from a file and output JSON only
            "current-date:",        // Optional: Override current date for deterministic test runs
            "test-seed:",           // Optional: Add deterministic model seed for explicit test runs only
            "debug",                 // Optional: Output AI request/response to STDERR (CLI only)
            "output-ics",            // Optional: Output ICS to stdout instead of emailing (CLI only, for Postmark)
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
        if (isset($options['current-date'])) {
            $processor->setCurrentDateForTesting((string)$options['current-date']);
        }
        if (isset($options['test-seed'])) {
            $processor->setAiSeedForTesting((int)$options['test-seed']);
        }

        if (isset($options['test-email-text']) || isset($options['test-email-file'])) {
            $emailText = $options['test-email-text'] ?? '';
            if (isset($options['test-email-file'])) {
                $filePath = (string)$options['test-email-file'];
                if (!is_readable($filePath)) {
                    throw new \RuntimeException("Test email file not found or not readable: {$filePath}");
                }
                $emailText = file_get_contents($filePath);
                if ($emailText === false) {
                    throw new \RuntimeException("Could not read test email file: {$filePath}");
                }
            }

            $input = (new RawEmailTextInputSource(
                (string)$emailText,
                isset($options['instructions']) ? (string)$options['instructions'] : null,
                isset($options['model']) ? (string)$options['model'] : null,
                isset($options['debug'])
            ))->toProcessingInput();
            $processor->processUrl(
                $input->url,
                $input->downloadedText,
                $input->display,
                $input->tentative,
                $input->instructions,
                null,
                null,
                $input->requestedModel,
                false,
                false,
                $input->outputJsonOnly,
                $input->cliDebug,
                $input->allowMultiDay
            );
            exit(0);
        }

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
                $processor->processPostmarkRequest($jsonData, isset($options['json']), isset($options['debug']), isset($options['output-ics']));
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

        $input = (new CliInputSource($options))->toProcessingInput();

        try {
            $processor->processUrl(
                $input->url,
                $input->downloadedText,
                $input->display,
                $input->tentative,
                $input->instructions,
                $input->screenshotViewport,
                $input->screenshotZoomed,
                $input->requestedModel,
                $input->needsReview,
                $input->fromExtension,
                $input->outputJsonOnly,
                $input->cliDebug
            );
            exit(0); // Successful CLI execution
        } catch (Throwable $e) {
            // The main try-catch block in index.php will handle this exception
            // and format the error appropriately for CLI output.
            // We log it here too for completeness before re-throwing.
            errlog("Error during CLI processing in handleCli for URL {$input->url}: " . $e->getMessage());
            throw $e; // Re-throw to be caught by the main script's error handler
        }
    }

    private function displayCliHelp()
    {
        $script = basename($_SERVER['SCRIPT_FILENAME'] ?? 'index.php');
        echo "Usage: php " . $script . " [options]\n";
        echo "\n";
        echo "Processes a URL, HTML content, or provided instructions to extract event information and generate an iCalendar (ICS) file or other output.\n";
        echo "This command directly invokes the processing logic.\n";
        echo "\n";
        echo "Required (at least one of the following must be provided):\n";
        echo "  --url <url>                      URL of the event page to process. Will be fetched if --html is not provided.\n";
        echo "  --html <string>                  Pre-downloaded HTML content. If --url is also given, this HTML will be used instead of fetching the URL.\n";
        echo "  -i, --instructions <string>      Direct instructions for the AI to create an event. Can be used alone or to supplement --url/--html.\n";
        echo "  --test-email-text <string>       Test harness: process raw email text and output JSON only; does not email or write calendar output.\n";
        echo "  --test-email-file <filepath>     Test harness: process raw email text from a file and output JSON only; does not email or write calendar output.\n";
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
        echo "  -m, --model <model_id>           Specify the AI model ID to use (e.g., '~openai/gpt-latest').\n";
        echo "  -r, --review <1|0>               Flag if the event needs review (1 for true, 0 for false). Default: 0 (false).\n";
        echo "                                     If true, outputs JSON for review to STDOUT instead of ICS/email.\n";
        echo "  --screenshot_viewport <base64>   Base64 encoded viewport screenshot for vision-capable AI models.\n";
        echo "  --screenshot_zoomed <base64>     Base64 encoded zoomed-out/full-page screenshot for vision-capable AI models.\n";
        echo "  --json                           Output the processed event data as JSON instead of ICS (CLI mode only).\n";
        echo "  --debug                          Output detailed AI request and raw response data to STDERR (CLI mode only).\n";
        echo "  --current-date <YYYY-MM-DD>      Test harness: override the current date for date inference.\n";
        echo "  --test-seed <integer>            Test harness: pass a deterministic model seed for this explicit test run only.\n";
        echo "  --help                           Display this help message and exit.\n";
        echo "\n";
        echo "Examples:\n";
        echo "  php " . $script . " --url https://www.example.com/event\n";
        echo "  php " . $script . " --postmark-json-file /path/to/email.json\n";
        echo "  php " . $script . " --html \"<html><body>Event at 2pm</body></html>\"\n";
        echo "  php " . $script . " --instructions \"Lunch with Bob tomorrow at 1pm at The Cafe\"\n";
        echo "  php " . $script . " --url https://www.example.com/event --instructions \"Focus on the main speaker schedule.\"\n";
        echo "  php " . $script . " --url https://www.example.com/event --display email --model ~openai/gpt-latest\n";
        echo "  php " . $script . " --url https://www.example.com/event --review 1\n";
    }
}
