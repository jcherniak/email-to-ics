<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

class_alias(\Jcherniak\EmailToIcs\Calendar\IcalGenerator::class, 'App\IcalGenerator');
class_alias(\Jcherniak\EmailToIcs\Calendar\CustomEvent::class, 'App\CustomEvent');
class_alias(\Jcherniak\EmailToIcs\Calendar\CustomEventFactory::class, 'App\CustomEventFactory');
