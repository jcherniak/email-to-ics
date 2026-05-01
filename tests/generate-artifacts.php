<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Calendar\IcalGenerator;

require_once __DIR__ . '/bootstrap.php';

$outputDir = __DIR__ . '/artifacts/outputs';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0775, true);
}

$writeJson = static function (string $path, array $data): void {
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
};

$generator = new IcalGenerator();
$baseSubject = 'Opera Parallele - Doubt';
$emailSummaries = [];

$writeJson($outputDir . '/presidio-ai-output.expected.json', PresidioExpected::aiJson());

foreach (PresidioExpected::eventData() as $index => $eventData) {
    $eventNumber = $index + 1;
    $ics = $generator->convertJsonToIcs($eventData, 'calendar@example.test');
    $canonicalIcs = PresidioExpected::canonicalizeIcs($ics);
    $icsFile = sprintf('presidio-email-%d.expected.ics', $eventNumber);

    file_put_contents($outputDir . '/' . $icsFile, $canonicalIcs);

    $date = new DateTimeImmutable($eventData['dtstart'], new DateTimeZone($eventData['timezone']));
    $subject = sprintf('%s - %s', $baseSubject, $date->format('M j, Y g:i A'));

    $emailSummaries[] = [
        'subject' => $subject,
        'contentType' => 'text/calendar; method=PUBLISH; charset=UTF-8',
        'veventCount' => substr_count($ics, 'BEGIN:VEVENT'),
        'canonicalIcsFile' => $icsFile,
    ];
}

$writeJson($outputDir . '/presidio-email-summary.expected.json', $emailSummaries);

echo "Generated output artifacts in {$outputDir}\n";
