<?php

declare(strict_types=1);

define('EMAIL_TO_ICS_SKIP_FRONT_CONTROLLER', true);

$_ENV['OPENROUTER_KEY'] ??= 'test-openrouter-key';
$_ENV['POSTMARK_API_KEY'] ??= 'test-postmark-key';
$_ENV['FROM_EMAIL'] ??= 'calendar@example.test';
$_ENV['INBOUND_CONFIRMED_EMAIL'] ??= 'confirmed-inbound@example.test';
$_ENV['TO_TENTATIVE_EMAIL'] ??= 'tentative@example.test';
$_ENV['TO_CONFIRMED_EMAIL'] ??= 'confirmed@example.test';
$_ENV['GOOGLE_MAPS_API_KEY'] ??= 'test-google-maps-key';
$_ENV['MAPBOX_API_KEY'] ??= 'test-mapbox-key';
$_ENV['GEOCODER_ORDER'] ??= 'mapbox,google';
$_ENV['DEFAULT_MODEL'] = 'test/model';
$_ENV['LOG_LEVEL'] ??= 'error';

$modelCache = [
    'timestamp' => time(),
    'models' => [
        'test/model' => [
            'name' => 'Test Model',
            'description' => 'Deterministic fake model used by PHPUnit.',
            'vision_capable' => false,
            'pricing' => [
                'prompt' => '0',
                'completion' => '0',
                'request' => '0',
            ],
        ],
    ],
];

file_put_contents(sys_get_temp_dir() . '/.models_cache.json', json_encode($modelCache, JSON_PRETTY_PRINT));

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../index.php';
require_once __DIR__ . '/Support/PresidioExpected.php';
require_once __DIR__ . '/Support/FakeEmailProcessor.php';
