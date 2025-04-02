<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use Dotenv\Dotenv;
use OpenAI\Exceptions\UnserializableResponse;
use Spatie\PdfToText\Pdf;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use ICal\ICal;

ignore_user_abort();
ini_set('display_errors', 'On');
ini_set('error_reporting', E_ALL & ~E_DEPRECATED);

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
    private $openaiApiKey;
	private $postmarkApiKey;

	private $fromEmail;

	private $inboundConfirmedEmail;
	private $inboundTentativeEmail;
	private $toTentativeEmail;
	private $toConfirmedEmail;
	private $errorEmail;

    private $openaiClient;
    private $httpClient;
    private $logDir;
	private $googleMapsKey;

	private $aiProvider;
	private $aiModel;
	private $deepseekApiKey;
	private $anthropicKey;

    public function __construct()
    {
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'];
        $this->postmarkApiKey = $_ENV['POSTMARK_API_KEY'];
		$this->fromEmail = $_ENV['FROM_EMAIL'];
		$this->inboundConfirmedEmail = $_ENV['INBOUND_CONFIRMED_EMAIL'];
		$this->inboundTentativeEmail = $_ENV['INBOUND_TENTATIVE_EMAIL'];
		$this->toTentativeEmail = $_ENV['TO_TENTATIVE_EMAIL'];
		$this->toConfirmedEmail = $_ENV['TO_CONFIRMED_EMAIL'];
		$this->errorEmail = $_ENV['ERROR_EMAIL'];

        $this->logDir = $_ENV['LOG_DIR'];
		$this->googleMapsKey = $_ENV['GOOGLE_MAPS_API_KEY'];

		$this->aiProvider = $_ENV['AI_PROVIDER'] ?? 'openai';
		$this->aiModel = $_ENV['AI_MODEL'] ?? 'o3-mini';
		$this->deepseekApiKey = $_ENV['DEEPSEEK_API_KEY'] ?? null;
		$this->anthropicKey = $_ENV['ANTHROPIC_KEY'] ?? null;

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

	private function buildAiClient()
	{
		$factory = OpenAI::factory();

		switch ($this->aiProvider) {
			case 'deepseek':
				$factory->withBaseUri('https://api.deepseek.com/v1');
				$factory->withApiKey($this->deepseekApiKey);
				break;
			case 'anthropic':
				$factory->withBaseUri('https://api.anthropic.com/v1');
				$factory->withApiKey($this->anthropicKey);
				break;
			case 'openai':
			default:
				$factory->withApiKey($this->openaiApiKey);
				break;
		}

		return $factory->make();
	}

	public function processUrl($url, $downloadedText, $display, $tentative = true, $instructions = null)
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

		$downloadedText = $this->extractMainContent($downloadedText);

//		$downloadedText = (new \Html2Text\Html2Text($downloadedText))->getText();

		$combinedText = <<<TEXT
{$url}

--- Text content fetched from URL above ---
{$downloadedText}
TEXT;

		$calEvent = $this->generateIcalEvent($combinedText, $instructions);
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

		return $body->innerHTML;
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
				$element->parentNode?->removeChild($element);
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
				$element->parentNode?->removeChild($element);
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

    private function generateIcalEvent($combinedText, $instructions = null)
	{
		$schema =  [
			'type' => 'object',
			'properties' => [
				'success' => [
					'type' => 'boolean'
				],
				'errorMessage' => [
					'type' => 'string'
				],
				'ICS' => [
					'type' => 'string'
				],
				'EmailSubject' => [
					'type' => 'string'
				],
				'LocationLookup' => [
					'type' => 'string'
				],
			],
			'required' => ['success', 'errorMessage', 'ICS', 'EmailSubject', 'LocationLookup'],
			'additionalProperties' => false,
		];

		$retries = $_ENV['OPENAI_RETRIES'];
		for ($i = 0; $i < $retries; $i++) {
			$curYear = date('Y');
			$curDate = date('m/d');
			$nextYear = $curYear + 1;
			$system = <<<PROMPT
Create an iCal event from the following email text. Provide the ICS file content only. Do not add any comments or other information other than the contents of the ICS file.

Assume the timezone is pacific time if not specified in the email. Based on the date, determine if it should be PST or PDT.

Render escaped characters from the input. So "\n" becomes rendered as a newline in the output.

Make the organizer of the event "Email-to-ICS <{$this->fromEmail}>".

Include the entirety of email, as written, for the description of the event.

PRODID should say "Email-to-ICS via {$this->aiProvider} by Justin".

For a event title, generate a relevant one for this event. Don't use the subject of the original email, but provide a summary based on the content. For example a doctors appointment reminder should say "Dr. White Appointment". If it's a video appointment, say "Dr. White Video Appointment". For a concert ticket confirmation, it should say something like "SF Symphony Concert - beethoven, mozart".

If a date/time exists in the PDF attachment, use it. If no end-date is found, assume the event is 2 hours. If it's an opera, 3 hours. A doctor's appointment, 30 minutes.

If there is no year in the provided content, assume it is {$curYear} if the month / date is equal to or after {$curDate} and {$nextYear} if before.

Make sure the date/time of the ICS are in pacific time. Adjust as necessary from the input timezone.

If the content describes a flight:
- Using the airport codes, determine the start and end timezone and set the event to start and end in the appropriate timezones. Override all timezone instructions above. For example, if the destination is EWR, then the end timezone should be America/New_York. SFO, America/Los_Angeles, ORD, America/Chicago, etc...
- Include the confirmation number in the top of the description.
- Include the flight number in the top of the description and the title. Prefix it with the airline code such as UA1234 or DL4456
- Don't include any text about special deals.
- The description field should be in the format: ```
Flight number: UA1234
Confirmation number: GJGJGJ
Departure airport: SFO
Arrival airport: EWR
```
- The location field should contain a google maps link to the departure airport

- The description for non-flight events should include information from the HTML body. Keep it under 1500 characters. Include the URL at the bottom of the description.  Put HTML into an X-ALT-DESC;FMTTYPE=text/html: field
as well as formatted plain text in the DESCRIPTION field.

For the ICS file, ensure it matches RFC5545. Specifically:
- Ensure all lines are terminated by CRLF
- Lines of text SHOULD NOT be longer than 75 octets, excluding the line break. Long content lines SHOULD be split into a multiple line representations using a line "folding" technique. That is, a long line can be split between any two characters by inserting a CRLF immediately followed by a single linear white-space character (i.e., SPACE or HTAB). Any sequence of CRLF followed immediately by a single linear white-space character is ignored (i.e., removed) when processing the content type.
- Ensure a UID is generated. Make it look like Ymd-His@calendar.postmark.justin-c.com. AKA 20240530-195600@calendar.postmark.justin-c.com
- Ensure a VTIMEZONE object is present
- For the description, include newlines to make it look good.
- Keep the description under 1000 characters.
- Keep the description in plain text, not HTML.

If the content comes from Eventbrite, include the ticket link in the description, even at the expense of other details.

IMPORTANT: If there are multiple events in the body, take the one that seems like the primary one.  For example, if there is text that says "Other events", then a series of dates below that, ignore that and find the date/time listed earlier on the page. If an event comes from a <section> with a class of "upcoming_events", then ignore it.

# Output Format
- Combine all individual events into one .ics file.
- Ensure the format adheres to the iCalendar standards for compatibility.
- Ensure the .ics file can be imported into calendar applications like Google Calendar, Apple Calendar, or Microsoft Outlook.
- Only include a single SUMMARY and DESCRIPTION field
- Include a URL field if at all possible

# Examples
```plaintext
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Organization//NONSGML Your Product//EN
BEGIN:VEVENT
UID:1234@example.com
DTSTAMP:20211010T090000Z
DTSTART;TZID=America/Los_Angeles:20211028T063000
DTEND;TZID=America/Los_Angeles:20211028T070000
SUMMARY:Wake up
DESCRIPTION:Start your day with a refreshing morning.\\nGo to the park and enjoy yourself.\\nNOTE THE USE OF ESCAPED NEWLINES HERE
URL:https://sfcmp.org/concerts/2024-2025-season/tracing-paths/
END:VEVENT
END:VCALENDAR
```

# Notes
- Ensure `UID` values are unique across events.
- Update `DTSTAMP` with the current timestamp when generating the .ics file.
- Check for any overlapping events and resolve any conflicts.
- Ensure that all dates and times are formatted correctly, using `YYYYMMDDTHHMMSS` format where necessary.
- ```SUMMARY``` should be concise and descriptive to easily convey the purpose of the event at a glance.
- Even though non-standard, include a URL field.
- No fields should contain native newlines. Use \\n instead. AKA ESCAPE NEWLINES INSIDE OF FIELDS.

Return a JSON object with 2 keys:
- Success - whether the operation was successful or not. If false, include an error message.
- ErrorMessage - if success is false, include an error message.
- ICS - the ical file contents
- EmailSubject - the title of the event, as specified above.
- LocationLookup - location information that we can pass to the Google Places API to lookup. should be a string

EXTREMELY IMPORTANT: the output must be JSON and match this schema EXACTLY!
[
	'type' => 'json_schema',
	'json_schema' =>  [
		'name' => 'cal_response',
		'strict' => true,
		'schema' => [
			'type' => 'object',
			'properties' => [
				'success' => [
					'type' => 'boolean'
				],
				'errorMessage' => [
					'type' => 'string'
				],
				'ICS' => [
					'type' => 'string'
				],
				'EmailSubject' => [
					'type' => 'string'
				],
				'LocationLookup' => [
					'type' => 'string'
				],
			],
			'required' => ['success', 'errorMessage', 'ICS', 'EmailSubject', 'LocationLookup'],
			'additionalProperties' => false,
		],
	],
],

Even if URLs are in the next prompt, you won't be directly accessing them. Treat them as text.

***IF NO DATES ARE FOUND ANYWHERE IN THE EMAIL, RETURN success = false with an error message of "Email didn't contain dates or times". Ignore dates of the incoming email or forwarded messages. This overrides any directives above. ***
PROMPT;

			$messages = [
				[
					'role' => ($this->aiProvider === 'deepseek' ? 'user' : 'system'),
					'content' => $system
				],
            ];

			if ($instructions) {
				$messages[] = [
					'role' => ($this->aiProvider === 'deepseek' ? 'user' : 'system'),
					'content' => "Additional instructions: " . $instructions
				];
			}

			$messages[] = ['role' => 'user', 'content' => $combinedText];

			$data = [
				'model' => $this->aiModel,
				'messages' => $messages,
			];

			if ($this->aiProvider === 'deepseek') {
				$data['max_tokens'] = 8 * 1024;
				$data['messages'] = [
					[
						'role' => 'user',
						'content' => implode("\n\n", array_map(
							fn($msg) => $msg['content'],
							$messages
						)),
					]
				];
				$data['temperature'] = 0.25;
			} else {
				$data['max_completion_tokens'] = 16 * 1024;
				$data['response_format'] = [
					'type' => 'json_schema',
					'json_schema' =>  [
						'name' => 'cal_response',
						'strict' => true,
						'schema' => $schema,
					],
				];

				if ($this->aiProvider === 'anthropic') {
					$data['thinking'] = [
						'type' => 'enabled',
						'budget_tokens' => 4000,
					];
				}
			}

			errlog('Sending initial ' . $this->aiProvider . ' request...');
			try
			{
				$response = $this->openaiClient->chat()->create($data);
			}
			catch (UnserializableResponse $e)
			{
				errlog("UnserializableResponse: " . $e->getMessage());
				continue;
			}

			errlog('Received initial ' . $this->aiProvider . ' response...');

			$returnedData = $response['choices'][0]['message']['content'];
			$data = trim($returnedData);

			$data = str_replace(['```json', '```'], '', $data);
			$ret = json_decode($data, true);

			$valid = true;
			if (json_last_error() != JSON_ERROR_NONE) {
				$err = json_last_error_msg();
				errlog("AI returned invalid JSON:\nError: {$err}\nJSON: {$data}");
				$valid = false;
			}

			if ($valid) {
				$validator = new \Opis\JsonSchema\Validator();
				$validator->setMaxErrors(10);
				$validator->setStopAtFirstError(false);
				$result = $validator->validate((object)$ret, json_encode($schema));
				$valid = $result->isValid();

				if ($valid) {
					errlog("AI response passed schema validation");
				} else {
					errlog("AI response failed schema validation: " . $result->error()->message());
				}
			}

			if (!$valid) {
				$oldAiProvider = $this->aiProvider;
				$oldAiModel = $this->aiModel;
				try {
					$this->aiProvider = 'openai';
					$this->aiModel = 'o1-pro';
					$this->openaiClient = $this->buildAiClient();

					// Try and correct the JSON using openai
					$messages = [
						['role' => 'assistant', 'content' => $data],
						['role' => 'user', 'content' => 'The JSON returned is invalid. Please correct it to match the schema.'],
					];

					$data = [
						'model' => $this->aiModel,
						'messages' => $messages,
						'response_format' => [
							'type' => 'json_object',
						],
					];

					errlog("Retrying with {$this->aiProvider} to correct JSON...");

					$response = $this->openaiClient->chat()->create($data);
					$returnedData = $response['choices'][0]['message']['content'];
					$newData = trim($returnedData);

					$ret = json_decode($newData, true, 512, JSON_INVALID_UTF8_IGNORE);

					$valid = true;
					if (json_last_error() != JSON_ERROR_NONE) {
						$err = json_last_error_msg();
						errlog("AI returned invalid JSON:\nError: {$err}\nJSON: {$data}");
						$valid = false;
					}

					if ($valid) {
						$validator = new \Opis\JsonSchema\Validator();
						$validator->setMaxErrors(10);
						$validator->setStopAtFirstError(false);
						$result = $validator->validate((object)$ret, json_encode($schema));
						$valid = $result->isValid();

						if (!$valid) {
							errlog("AI response failed schema validation: " . $result->error()->message());
						}
					}

					if (!$valid) {
						if ($i < $retries - 1) {
							errlog("AI returned invalid JSON a second time.., retrying whole operation...\n\nJSON: {$newData}");
							continue;
						}

						http_response_code(500);
						echo "<h1>AI returned invalid json:</h1>";
						echo '<pre>';
							echo htmlspecialchars($this->unescapeNewlines($returnedData));
						echo '</pre>';
						die;
					}
				} finally {
					$this->aiProvider = $oldAiProvider;
					$this->aiModel = $oldAiModel;
					$this->openaiClient = $this->buildAiClient();
				}
			}
			
			if (!empty($ret['success']) && $ret['success'] === false) {
				if ($i < $retries - 1) {
					errlog("AI returned success = false with error message: {$ret['errorMessage']}\n\nJSON: {$data}");
					continue;
				}

				http_response_code(200);
				echo "<h1>AI returned error message:</h1>";
				echo '<pre>';
					echo htmlspecialchars($this->unescapeNewlines($returnedData));
				echo '</pre>';
				die;
			}

			// Clean up the ICS description
			$ret['ICS'] = $this->cleanupIcsDescription($ret['ICS']);

			try
			{
				$file = tempnam(sys_get_temp_dir(), 'ical-ai');
				file_put_contents($file, $ret['ICS']);

				new ICal($file);
			}
			catch (Throwable $e)
			{
				if ($i < $retries - 1) {
					errlog("ICS couldn't be parsed: {$e}.\n\nICS: {$data}\n");
					continue;
				}

				throw $e;
			}

			if (!empty($ret['LocationLookup'])) {
				try {
					$place = $this->getGoogleMapsLink($ret['LocationLookup']);
					errlog("Google maps lookup for '{$ret['LocationLookup']}' returned '{$place}'");

					if ($place) {
						$ret['ICS'] = $this->updateIcsLocation($ret['ICS'], $place);
					}
				} catch (Throwable $e) {
					errlog("Error(s) doing google maps lookup: " . var_export($e, true));
				}
			}


			return $ret;
		}

		throw new Exception('should never reach here...');
	}

	private function cleanupIcsDescription($icsContent) {
		$lines = explode("\n", $icsContent);
		$output = [];
		$inDescription = false;
		$descriptionLines = [];

		foreach ($lines as $line) {
			if (strpos($line, 'DESCRIPTION:') === 0) {
				$inDescription = true;
				$output[] = $line;
			} elseif ($inDescription && strpos($line, ' ') === 0) {
				// This is a continuation line of the description
				$descriptionLines[] = trim($line);
			} elseif ($inDescription) {
				// We've reached the end of the description
				$inDescription = false;
				// Clean up the description lines
				$description = implode(' ', $descriptionLines);
				$description = preg_replace('/\s+/', ' ', $description); // Replace multiple spaces with single space
				
				// Recursively replace multiple newlines until no more than 2 in a row
				do {
					$oldDescription = $description;
					$description = str_replace('\\n\\n\\n', '\\n\\n', $description);
				} while ($oldDescription !== $description);
				
				$description = trim($description);
				// Add the cleaned description back
				$output[] = 'DESCRIPTION:' . $description;
				$output[] = $line;
			} else {
				$output[] = $line;
			}
		}

		return implode("\n", $output);
	}

	private function updateIcsLocation($icsContent, $location) {
		$lines = explode("\n", $icsContent);
		$output = [];
		$locationUpdated = false;

		foreach ($lines as $line) {
			// Check if the line starts with "LOCATION:" to find an existing location
			if (strpos($line, 'LOCATION:') === 0) {
				// Replace existing location with the new location
				$output[] = 'LOCATION:' . $location;
				$locationUpdated = true;
			} else {
				$output[] = $line;
			}
		}

		// If no LOCATION field was originally present, add it before END:VEVENT
		if (!$locationUpdated) {
			$updatedOutput = [];
			foreach ($output as $line) {
				if (trim($line) == "END:VEVENT") {
					// Add location before the line END:VEVENT
					$updatedOutput[] = 'LOCATION:' . $location;
				}
				$updatedOutput[] = $line;
			}
			$output = $updatedOutput;
		}

		// Join the lines back into a single ICS formatted string
		return implode("\n", $output);
	}

	private function getGoogleMapsLink($lookup) {
		// Base URL for the Google Places Text Search API
		$baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";

		// Construct the request URL
		$requestUrl = sprintf(
			"%s?query=%s&key=%s",
			$baseUrl,
			urlencode($lookup),
			$this->googleMapsKey
		);

		// Initialize cURL session
		$ch = curl_init();

		// Set cURL options
		curl_setopt($ch, CURLOPT_URL, $requestUrl);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		// Execute cURL request and fetch response
		$response = curl_exec($ch);

		// Close cURL session
		curl_close($ch);

		// Decode the JSON response
		$data = json_decode($response, true);

		// Check if we got a valid response and return the place id
		if (!empty($data['results'])) {
			$result = $data['results'][0];

			return $result['name'] . ' ' . $result['formatted_address'];
//			// Return the place_id of the first result
//			$placeId = $data['results'][0]['place_id'];
//
//			// Base URL for Google Maps search with API parameter
//			$baseUrl = "https://www.google.com/maps/search/?api=1";
//
//			// Construct the URL with query and place_id
//			$url = sprintf("%s&query=%s&query_place_id=%s", $baseUrl, urlencode($lookup), urlencode($placeId));
//
//			return $url;
		}

		return null;
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

		return $sanitizer->sanitizeFor('div', $html); // Will sanitize as body
	}
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
			$_REQUEST['instructions'] ?? null
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
	http_response_code(200); // 500 - Postmark will just keep resending if it gets a 500
	header('Content-type: text/plain');
	errlog($t);
	print_r($t);

	$err = '<h1>ERROR PROCESSING CALENDAR EVENT</h1>' .
		'<p>Error: <b>' . $t->getMessage() . '</b></p>' .
		'<pre>' . var_export($t, true) . '</pre>' .
		'<p>Original POST:</p>' .
		'<pre>' . json_encode($_POST) . '</pre>';

	$processor = new EmailProcessor;
	$processor->sendEmail(null, $_ENV['ERROR_EMAIL'], 'ERROR PROCESSING CALENDAR EVENT', $err);
}

$out = ob_get_flush();
//errlog('OUTPUT: ' . $out);

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
