<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use Dotenv\Dotenv;
use Spatie\PdfToText\Pdf;

ini_set('display_errors', 'On');
ini_set('error_reporting', E_ALL);

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
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();

        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'];
        $this->postmarkApiKey = $_ENV['POSTMARK_API_KEY'];
        $this->fromEmail = $_ENV['FROM_EMAIL'];
        $this->toEmail = $_ENV['TO_EMAIL'];
        $this->logDir = $_ENV['LOG_DIR'];
        $this->authKey = $_ENV['AUTH_KEY'];

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

    public function processRequest()
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

        $ret = $this->generateIcalEvent($combinedText);

        $calendarEvent = $ret['ICS'];
        $subject = $ret['EmailSubject'];

        // Use recipient email from environment or default to FromFull email
        $recipientEmail = !empty($this->toEmail) ? $this->toEmail : $body['FromFull']['Email'];

        $this->sendEmailWithAttachment($recipientEmail, $calendarEvent, $subject, $body);

        echo json_encode(['status' => 'success', 'message' => 'Email processed successfully', 'ics' => $calendarEvent]);
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
        $system = <<<'PROMPT'
Create an iCal event from the following email text. Provide the ICS file content only. Do not add any comments or other information other than the contents of the ICS file.

Assume the timezone is pacific time if not specified in the email. Based on the date, determine if it should be PST or PDT.

Render escaped characters from the input. So "\n" becomes rendered as a newline in the output.

Assume TextBody contains a forwarded email. Make it from an email with {$this->fromEmail} with a name of the original sender of the forwarded message.

Include the entirety of TextBody, as written, for the description of the event.

PRODID should say "Email-to-ICS via OpenAI by Justin".

For a event title, generate a relevant one for this event. Don't use the subject of the original email, but provide a summary based on the content. For example a doctors appointment reminder should say "Dr. White Appointment". If it's a video appointment, say "Dr. White Video Appointment". For a concert ticket confirmation, it should say something like "SF Symphony Concert - beethoven, mozart".

If a date/time exists in the PDF attachment, use it. If no end-date is found, assume the event is 2 hours. If it's an opera, 3 hours. A doctor's appointment, 30 minutes.

For the ICS file, ensure it matches RFC5545. Specifically:
- Ensure all lines are terminated by CRLF
- Lines of text SHOULD NOT be longer than 75 octets, excluding the line break. Long content lines SHOULD be split into a multiple line representations using a line "folding" technique. That is, a long line can be split between any two characters by inserting a CRLF immediately followed by a single linear white-space character (i.e., SPACE or HTAB). Any sequence of CRLF followed immediately by a single linear white-space character is ignored (i.e., removed) when processing the content type.
- Ensure a UID is generated. Make it look like Ymd-His@calendar.postmark.justin-c.com. AKA 20240530-195600@calendar.postmark.justin-c.com
- Ensure a VTIMEZONE object is present

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

		$data = trim($response['choices'][0]['message']['content']);
error_log("OpenAI returned: {$data}");
		$ret = json_decode($data, true);
		if (json_last_error() != JSON_ERROR_NONE) {
			http_response_code(500);
			echo "Openai returned invalid json:\n";
			echo $data;
			die;
		}

		return $ret;
	}

    private function sendEmailWithAttachment($toEmail, $icsAttachment, $subject, $originalEmail)
	{
		$attachments = [
					[
						'Name' => 'event.ics',
						'Content' => base64_encode($icsAttachment),
						'ContentType' => 'text/calendar',
					],
		];

		if (!empty($originalEmail['Attachments']))
		{
			$attachments = array_merge($attachments, $originalEmail['Attachments']);
		}

		$origBody = $originalEmail['HtmlBody'] ?? nl2br($originalEmail['TextBody']);
        $response = $this->httpClient->post('/email', [
            'json' => [
                'From' => $this->fromEmail,
                'To' => $toEmail,
                'Subject' => $subject,
				'HTMLBody' => <<<BODY
<p>Please find your iCal event attached.</p>

<p>
---------- Forwarded message ----------<br>
<b>From</b>: {$originalEmail['FromName']} <{$originalEmail['From']}><br>
<b>Date</b>: {$originalEmail['Date']}<br>
<b>To</b>: {$originalEmail['To']}<br>
<b>Subject</b>: {$originalEmail['Subject']}<br>


{$origBody}
BODY
				,
				'Attachments' => $attachments,
            ],
        ]);

        if ($response->getStatusCode() !== 200) {
            throw new Exception('Failed to send email via Postmark');
        }

        error_log("Postmark response:\n" . $response->getBody()->getContents());
    }
}

// For demonstration purposes, directly processing the request
// In production, you may wish to route this to appropriate entry points

$processor = new EmailProcessor();
$processor->processRequest();
