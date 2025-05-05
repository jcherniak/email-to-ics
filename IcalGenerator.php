<?php

namespace App;

use Eluceo\iCal\Domain\Entity\Calendar;
use Eluceo\iCal\Domain\Entity\Event as BaseEvent;
use Eluceo\iCal\Presentation\Factory\CalendarFactory;
use Eluceo\iCal\Presentation\Factory\EventFactory as BaseEventFactory;
use Eluceo\iCal\Presentation\Component;
use Eluceo\iCal\Presentation\Component\Property;
use Eluceo\iCal\Presentation\Component\Property\Parameter;
use Eluceo\iCal\Presentation\Component\Property\Value\TextValue;
use Eluceo\iCal\Domain\ValueObject\Date as ICalDate;
use Eluceo\iCal\Domain\ValueObject\DateTime as ICalDateTime;
use Eluceo\iCal\Domain\ValueObject\SingleDay;
use Eluceo\iCal\Domain\ValueObject\MultiDay;
use Eluceo\iCal\Domain\ValueObject\TimeSpan;
use Eluceo\iCal\Domain\ValueObject\Location;
use Eluceo\iCal\Domain\ValueObject\Organizer;
use Eluceo\iCal\Domain\ValueObject\Uri;
use Eluceo\iCal\Domain\ValueObject\EmailAddress;
use DateTimeImmutable;
use DateTimeZone;
use Exception;
use Throwable;

// --- Custom Event Class for HTML Description ---

class CustomEvent extends BaseEvent {
    private ?string $htmlDescription = null;

    public function setHtmlDescription(?string $htmlDescription): self {
        $this->htmlDescription = $htmlDescription;
        return $this;
    }

    public function getHtmlDescription(): ?string {
        return $this->htmlDescription;
    }

    public function hasHtmlDescription(): bool {
         return $this->htmlDescription !== null;
    }
}

// --- Custom Event Factory for HTML Description ---

class CustomEventFactory extends BaseEventFactory {
    public function createComponent(BaseEvent $event): Component {
        // Create the base component first
        $component = parent::createComponent($event);

        // Check if it's our custom event type and has HTML description
        if ($event instanceof CustomEvent && $event->hasHtmlDescription()) {
            $component = $component->withProperty(
                new Property(
                    'X-ALT-DESC', // The property name
                    new TextValue($event->getHtmlDescription()), // The value
                    [new Parameter('FMTTYPE', new TextValue('text/html'))] // Wrap value in TextValue
                )
            );
        }

        return $component;
    }
}

// --- Main Generator Class ---

class IcalGenerator {

    /**
     * Converts structured event data (from AI JSON) into an RFC 5545 ICS string using eluceo/ical.
     *
     * @param array $eventData Associative array conforming to the eventSchema.
     * @param string $fromEmail The sender email address for the organizer field.
     * @return string The generated ICS content.
     * @throws Exception If required fields are missing or dates are invalid.
     */
    public function convertJsonToIcs(array $eventData, string $fromEmail): string
    {
        $tzid = $eventData['timezone'] ?? 'America/Los_Angeles';

        if (empty($eventData['summary']) || empty($eventData['dtstart']) || empty($tzid)) {
            throw new Exception('Missing required event data for ICS conversion (summary, dtstart, timezone).');
        }

        $isAllDay = $eventData['isAllDay'] ?? false;

        try {
            // Use CustomEvent
            $event = new CustomEvent();
            $event->setSummary($eventData['summary']);

            $description = str_replace('\\n', "\n", $eventData['description'] ?? '');
            $event->setDescription($description);

            // Preprocess and set HTML Description on CustomEvent
            if (!empty($eventData['htmlDescription'])) {
                $htmlDescription = trim($eventData['htmlDescription']); // Trim whitespace
                $event->setHtmlDescription($htmlDescription);
            }

            // Set location if available
            if (!empty($eventData['location'])) {
                 $event->setLocation(new Location($eventData['location']));
            }

            // Set URL if available
            if (!empty($eventData['url'])) {
                $event->setUrl(new Uri($eventData['url']));
            }

            // Set organizer
            $organizer = new Organizer(new EmailAddress($fromEmail), 'Email-to-ICS');
            $event->setOrganizer($organizer);

            // Create DateTime objects with the correct timezone for start and end
            $timezone = new DateTimeZone($tzid);

            // Use DateTimeImmutable for safety
            $startDate = new DateTimeImmutable($eventData['dtstart'], $timezone);

            // Set end time
            if (!empty($eventData['dtend'])) {
                $endDate = new DateTimeImmutable($eventData['dtend'], $timezone);
            } else {
                // Calculate default duration if DTEND is missing and not all-day
                $endDate = clone $startDate;
                if (!$isAllDay) {
                    $durationHours = 2;
                    if (stripos($eventData['summary'], 'opera') !== false) $durationHours = 3;
                    elseif (stripos($eventData['summary'], 'doctor') !== false ||
                            stripos($eventData['summary'], 'appointment') !== false) $durationHours = 0.5;
                    $endDate = $endDate->modify('+' . ($durationHours * 3600) . ' seconds');
                }
            }

            // Handle different event types (all-day vs timed)
            if ($isAllDay) {
                $startDateObj = new ICalDate($startDate);
                if (!empty($eventData['dtend'])) {
                    $endDateObj = new ICalDate($endDate);
                    $occurrence = new MultiDay($startDateObj, $endDateObj);
                } else {
                    $occurrence = new SingleDay($startDateObj);
                }
            } else {
                $occurrence = new TimeSpan(
                    new ICalDateTime($startDate, true),
                    new ICalDateTime($endDate, true)
                );
            }

            // Set the occurrence to the event
            $event->setOccurrence($occurrence);

            // Create a calendar domain entity and add the event
            $calendar = new Calendar([$event]);

            // Use Custom Factories
            $eventFactory = new CustomEventFactory();
            $calendarFactory = new CalendarFactory($eventFactory);

            // Transform the calendar domain entity to an iCalendar component
            $calendarComponent = $calendarFactory->createCalendar($calendar);

            // Return the rendered iCalendar component as a string
            return (string) $calendarComponent;

        } catch (Throwable $e) {
            // Log the original event data along with the error
            // Consider using a proper logger if available
            error_log("Error creating iCalendar: " . $e->getMessage() . "\nEvent Data: " . json_encode($eventData) . "\nTrace: " . $e->getTraceAsString());
            throw new Exception("Error creating iCalendar: " . $e->getMessage(), 0, $e);
        }
    }
} 