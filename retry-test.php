#!/usr/bin/env php
<?php
/**
 * Retry testing script for multi-event extraction
 * Extracts original Postmark JSON from processed file and retries processing
 */

if (php_sapi_name() !== 'cli') {
    die("This script must be run from command line\n");
}

// Parse command line arguments
$opts = getopt('', ['file:', 'iterations:', 'output-ics']);
$processedFile = $opts['file'] ?? null;
$maxIterations = (int)($opts['iterations'] ?? 50);
$outputIcs = isset($opts['output-ics']);

if (!$processedFile) {
    echo "Usage: php retry-test.php --file=/path/to/processed/file.json [--iterations=50] [--output-ics]\n";
    echo "\n";
    echo "Options:\n";
    echo "  --file           Path to processed JSON file\n";
    echo "  --iterations     Maximum iterations (default: 50)\n";
    echo "  --output-ics     Output ICS content instead of emailing\n";
    exit(1);
}

if (!file_exists($processedFile)) {
    fwrite(STDERR, "Error: File not found: $processedFile\n");
    exit(1);
}

echo "Loading processed file: $processedFile\n";
$jsonContent = file_get_contents($processedFile);
$processedData = json_decode($jsonContent, true);

if (!$processedData) {
    fwrite(STDERR, "Error: Could not parse JSON from file\n");
    exit(1);
}

// Extract the original Postmark request from the first entry
$firstEntry = reset($processedData);
if (!$firstEntry) {
    fwrite(STDERR, "Error: No data in processed file\n");
    exit(1);
}

// The processed file doesn't store the original Postmark JSON
// We need to reconstruct it from what we have
// Let me check what's actually stored...
echo "Processed file contents:\n";
print_r(array_keys($firstEntry));

// Check if this is the processed format we expect
if (!isset($firstEntry['status'])) {
    fwrite(STDERR, "Error: Unexpected processed file format\n");
    exit(1);
}

echo "\nThis file has status: " . $firstEntry['status'] . "\n";

// We need to find the original incoming email data
// Let me check the /incoming directory or extract from temp files
$incomingDir = '/var/www/html/email-to-ics/incoming';
if (!is_dir($incomingDir)) {
    fwrite(STDERR, "Error: Incoming directory not found. Cannot extract original email.\n");
    fwrite(STDERR, "We need the original Postmark JSON to retry processing.\n");
    exit(1);
}

// Extract message ID from filename
$basename = basename($processedFile);
if (preg_match('/\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2}-([a-f0-9-]+)-/', $basename, $matches)) {
    $messageId = $matches[1];
    echo "Extracted message ID: $messageId\n";

    // Try to find the original incoming JSON
    $incomingFiles = glob("$incomingDir/*$messageId*.json");
    if (empty($incomingFiles)) {
        fwrite(STDERR, "Error: Could not find original incoming email for message ID: $messageId\n");
        exit(1);
    }

    $originalEmailFile = $incomingFiles[0];
    echo "Found original email: $originalEmailFile\n";
} else {
    fwrite(STDERR, "Error: Could not extract message ID from filename\n");
    exit(1);
}

// Now we can retry with the original email
$iteration = 0;
$success = false;

while ($iteration < $maxIterations && !$success) {
    $iteration++;
    echo "\n=== Iteration $iteration / $maxIterations ===\n";

    // Call index.php with the original email
    $cmd = "php index.php --postmark-json-file=" . escapeshellarg($originalEmailFile);
    if ($outputIcs) {
        $cmd .= " --display=display";  // Output to stdout
    }

    echo "Running: $cmd\n";

    $output = [];
    $returnCode = 0;
    exec($cmd . " 2>&1", $output, $returnCode);

    $outputStr = implode("\n", $output);
    echo "Output:\n$outputStr\n";

    if ($returnCode !== 0) {
        echo "FAILED with return code $returnCode\n";
        fwrite(STDERR, "Processing failed, adjusting code...\n");
        // Here we would analyze the error and adjust
        continue;
    }

    // Check if output contains multiple events
    $eventCount = substr_count($outputStr, 'BEGIN:VEVENT');
    echo "Event count: $eventCount\n";

    if ($eventCount > 1) {
        echo "SUCCESS! Generated $eventCount events\n";
        $success = true;

        if ($outputIcs) {
            echo "\n=== ICS OUTPUT ===\n";
            echo $outputStr;
            echo "\n=== END ICS ===\n";
        }
    } else {
        echo "FAILED: Only generated $eventCount event(s), expected multiple\n";
        fwrite(STDERR, "Insufficient events, adjusting code...\n");
    }
}

if ($success) {
    echo "\n✓ SUCCESS after $iteration iteration(s)\n";
    exit(0);
} else {
    echo "\n✗ FAILED after $maxIterations iterations\n";
    exit(1);
}
