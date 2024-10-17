<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use Dotenv\Dotenv;
use Spatie\PdfToText\Pdf;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use ICal\ICal;

ini_set('session.cookie_lifetime', 60 * 60 * 24 * 30);

ignore_user_abort();
ini_set('display_errors', 'On');
ini_set('error_reporting', E_ALL);
function exception_error_handler(int $errno, string $errstr, string $errfile = null, int $errline) {
    if (!(error_reporting() & $errno)) {
        // This error code is not included in error_reporting
        return;
	}
	throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
}
set_error_handler(exception_error_handler(...));

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	header("HTTP/1.1 204 No Content");
	exit;
}

class EmailProcessor
{
    private $openaiApiKey;
    private $postmarkApiKey;
    private $fromEmail;
    private $toEmail;
    private $openaiClient;
    private $httpClient;
    private $logDir;
    private $authKey;

    public function __construct()
    {
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'];
        $this->postmarkApiKey = $_ENV['POSTMARK_API_KEY'];
        $this->fromEmail = $_ENV['FROM_EMAIL'];
        $this->toEmail = $_ENV['TO_EMAIL'];
        $this->logDir = $_ENV['LOG_DIR'];
        $this->authKey = $_ENV['WEBHOOK_AUTH_KEY'];

		$this->openaiClient = OpenAI::client($this->openaiApiKey);
		$this->httpClient = new Client([
            'base_uri' => 'https://api.postmarkapp.com',
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-Postmark-Server-Token' => $this->postmarkApiKey,
            ],
        ]);
	}

	public function processUrl($url, $display) {
		if (!$this->is_valid_url($url)) {
			http_response_code(400);
			echo 'Bad url!';
			die;
		}

		$downloadedText = $this->fetch_url($url);

		$combinedText = <<<TEXT
{$url}

--- HTML fetched from URL above ---
{$downloadedText}
TEXT;

		$calEvent = $this->generateIcalEvent($combinedText);
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
		}

		$recipientEmail = $this->toEmail;
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

	protected function unescapeNewlines($str)
	{
		return str_replace('\n', "\n",
			str_replace('\r\n', "\n",
				$str
			)
		);
	}

    public function processPostmarkRequest()
    {
        if (($_GET['auth'] ?? null) != $this->authKey) {
            http_response_code(403);
            echo "Invalid auth\n";
            die;
        }

        $input = file_get_contents('php://input');
        file_put_contents($this->logDir . '/inbound-email.' . date('YmdHis') . '.json', $input);

        $body = json_decode($input, true);
        if (json_last_error() != JSON_ERROR_NONE) {
            http_response_code(400);
            echo 'Invalid input: ' . json_last_error_msg();
            die;
        }

        $emailText = $body['TextBody'];
		$pdfText = $this->extractPdfText($body['Attachments'] ?? []);

        $combinedText = $emailText;
        if ($pdfText) {
            $combinedText .= "\n\n--- Extracted from PDF Attachment ---\n\n" . $pdfText;
		}

		if ($this->is_valid_url($emailText)) {
			$downloadedText = $this->fetch_url($emailText);

			$combinedText .= "\n\n--- HTML fetched from URL above ---\n\n";
			$combinedText .= $downloadedText;
		}

        $ret = $this->generateIcalEvent($combinedText);

        $calendarEvent = $ret['ICS'];
        $subject = $ret['EmailSubject'];

        // Use recipient email from environment or default to FromFull email
        $recipientEmail = !empty($this->toEmail) ? $this->toEmail : $body['FromFull']['Email'];

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

		// Attempt to fetch the HTML content from the given URL
		$htmlContent = @file_get_contents($url);

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
                    error_log("Error extracting PDF text: " . $e->getMessage());
                }
            }
        }
        return null;
    }

    private function generateIcalEvent($combinedText)
	{
		$retries = $_ENV['OPENAI_RETRIES'];
		for ($i = 0; $i < $retries; $i++) {
			$curYear = date('Y');
			$curDate = date('m/d');
			$nextYear = $curYear + 1;
			$system = <<<PROMPT
Create an iCal event from the following email text. Provide the ICS file content only. Do not add any comments or other information other than the contents of the ICS file.

Assume the timezone is pacific time if not specified in the email. Based on the date, determine if it should be PST or PDT.

Render escaped characters from the input. So "\n" becomes rendered as a newline in the output.

Make the organizer of the event "Email-to-ICS <{$this->toEmail}>".

Include the entirety of email, as written, for the description of the event.

PRODID should say "Email-to-ICS via OpenAI by Justin".

For a event title, generate a relevant one for this event. Don't use the subject of the original email, but provide a summary based on the content. For example a doctors appointment reminder should say "Dr. White Appointment". If it's a video appointment, say "Dr. White Video Appointment". For a concert ticket confirmation, it should say something like "SF Symphony Concert - beethoven, mozart".

If a date/time exists in the PDF attachment, use it. If no end-date is found, assume the event is 2 hours. If it's an opera, 3 hours. A doctor's appointment, 30 minutes.

If there is no year in the provided content, assume it is {$curYear} if the month / date is equal to or after {$curDate} and {$nextYear} if before.

Make sure the date/time of the ICS are in pacific time. Adjust as necessary from the input timezone.

For the ICS file, ensure it matches RFC5545. Specifically:
- Ensure all lines are terminated by CRLF
- Lines of text SHOULD NOT be longer than 75 octets, excluding the line break. Long content lines SHOULD be split into a multiple line representations using a line "folding" technique. That is, a long line can be split between any two characters by inserting a CRLF immediately followed by a single linear white-space character (i.e., SPACE or HTAB). Any sequence of CRLF followed immediately by a single linear white-space character is ignored (i.e., removed) when processing the content type.
- Ensure a UID is generated. Make it look like Ymd-His@calendar.postmark.justin-c.com. AKA 20240530-195600@calendar.postmark.justin-c.com
- Ensure a VTIMEZONE object is present
- For the description, include newlines to make it look good.

Return a JSON object with 2 keys:
- ICS - the ical file contents
- EmailSubject - the title of the event, as specified above.
PROMPT;

			$data = [
				'model' => 'gpt-4o',  // Use 'gpt-4' for the latest version of GPT
				'messages' => [
					['role' => 'system', 'content' => $system],
					['role' => 'user', 'content' => $combinedText],
				],
				'max_tokens' => 4095,
				'response_format' => ['type' => 'json_object'],
			];

			$response = $this->openaiClient->chat()->create($data);

			$returnedData = $response['choices'][0]['message']['content'];
			$data = trim($returnedData);
			$ret = json_decode($data, true);
			if (json_last_error() != JSON_ERROR_NONE) {
				if ($i < $retries - 1) {
					error_log("OpenAI returned invalid JSON, retrying...\n\nJSON: {$data}");
					continue;
				}

				http_response_code(500);
				echo "<h1>Openai returned invalid json:</h1>";
				echo '<pre>';
					echo htmlspecialchars($this->unescapeNewlines($returnedData));
				echo '</pre>';
				die;
			}

			try
			{
				$file = tempnam(sys_get_temp_dir(), 'ical-ai');
				file_put_contents($file, $ret['ICS']);

				new ICal($file);
			}
			catch (Throwable $e)
			{
				if ($i < $retries - 1) {
					error_log("ICS couldn't be parsed: {$e}.\n\nICS: {$data}\n");
					continue;
				}

				throw $e;
			}

			return $ret;
		}

		throw new Exception('should never reach here...');
	}

    private function sendEmailWithAttachment($toEmail, $ics, $subject, $originalEmail, $pdfText = null, $downloadedText = null)
	{
		error_log('Orig email: ' . $originalEmail);
		error_log('Downloaded: ' . $downloadedText);

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

	protected function sendEmail($ics, $toEmail, $subject, $htmlBody, $otherAattachments = []) {
		$attachments = array_merge([
			[
				'Name' => 'event.ics',
				'Content' => base64_encode($ics),
				'ContentType' => 'text/calendar',
			],
		], $otherAattachments);

        $response = $this->httpClient->post('/email', [
            'json' => [
                'From' => $this->fromEmail,
                'To' => $toEmail,
                'Subject' => $subject,
				'HTMLBody' => $htmlBody,
				'Attachments' => $attachments,
            ],
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new Exception('Failed to send email via Postmark');
        }

        error_log("Postmark response:\n" . $response->getBody()->getContents());
	}

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

		// Allow the "div" element and no attribute can be on it
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

		return $sanitizer->sanitizeFor('div', $html); // Will sanitize as body
	}
}

class WebPage
{
    public function handleRequest()
    {
        $authorized = $this->checkSessionAuth() || $this->checkBasicAuth();

        if (!$authorized) {
            $this->displayLoginForm(); // Display a login form instead of requesting basic auth
            return;
        }

        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                $this->displayGetForm();
                break;
            case 'POST':
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
        return !empty($_SESSION['authenticated']);
    }

    private function checkBasicAuth()
    {
		if (
			isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']) &&
            $_SERVER['PHP_AUTH_USER'] === $_ENV['HTTP_AUTH_USERNAME'] &&
			$_SERVER['PHP_AUTH_PW'] === $_ENV['HTTP_AUTH_PASSWORD']
		) {
            $_SESSION['authenticated'] = true; // Store authentication in session
            return true;
		}

        return false;
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
        if ($_POST['username'] === $_ENV['HTTP_AUTH_USERNAME'] &&
            $_POST['password'] === $_ENV['HTTP_AUTH_PASSWORD']) {
            $_SESSION['authenticated'] = true;
            $this->displayGetForm(); // Successfully authenticated
        } else {
            echo 'Invalid credentials. Please try again.';
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
			session_destroy();
		} elseif (isset($_POST['url'])) {
            $this->processFormSubmission($_POST['url']);
        } elseif ($this->isPostmarkInboundWebhook($json_data)) {
			$post_data = file_get_contents("php://input");
			$json_data = json_decode($post_data, true);

            $this->processPostmarkInbound($json_data);
        } else {
			http_response_code(400);
			echo "Invalid POST request.";
			die;
        }
    }

    private function processFormSubmission($url)
    {
		$processor = new EmailProcessor();
		$processor->processUrl($url, $_REQUEST['display'] ?? 'email');
    }

    private function isPostmarkInboundWebhook($json_data)
    {
        return isset($json_data['MessageStream']) &&
               $json_data['MessageStream'] === 'inbound' &&
               isset($_GET['auth']);
    }

    private function processPostmarkInbound($json_data)
    {
		$processor = new EmailProcessor();
		$processor->processPostmarkRequest($json_data);
	}
}

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

session_start();

try {
	$page = new WebPage();
	$page->handleRequest();
} catch (Throwable $t) {
	header('Content-type: text/plain');
	error_log($t);
	print_r($t);
}
