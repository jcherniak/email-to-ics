import Foundation

/// JSON schema requested from OpenRouter (`response_format: json_schema`, strict). Mirrors the PHP backend
/// (`index.php` cal_response_structured) and the Chrome extension, except that `eventData` is always an array.
public enum ExtractionSchema {
    public static let schemaName = "calendar_event"
    public static let eventFieldOrder = ["summary", "description", "htmlDescription", "dtstart", "dtend",
                                         "timezone", "location", "url", "isAllDay"]

    public static func eventSchema() -> [String: Any] {
        let string: ([String: Any]) -> [String: Any] = { extra in
            var d: [String: Any] = ["type": "string"]
            extra.forEach { d[$0.key] = $0.value }
            return d
        }
        let properties: [String: Any] = [
            "summary": string(["description": "Event title following the title rules."]),
            "description": string(["description": "Plain-text description, no HTML, literal \\n for line breaks, ending with the Source line."]),
            "htmlDescription": string(["description": "Short HTML version of the description (p, a, b, i, ul, ol, li, br only) ending with a Source link."]),
            "dtstart": string(["description": "Local start time without offset, e.g. 2026-05-29T19:30:00, or YYYY-MM-DD when isAllDay is true."]),
            "dtend": string(["description": "Local end time in the same format as dtstart. Empty string only when it truly cannot be determined."]),
            "timezone": string(["description": "IANA time zone identifier for dtstart/dtend, e.g. America/Los_Angeles."]),
            "location": string(["description": "Venue name and full street address when available."]),
            "url": string(["description": "The source URL, or the most relevant event/ticket link when no source URL exists."]),
            "isAllDay": ["type": "boolean", "description": "True when the event has a date but no time."],
        ]
        return [
            "type": "object",
            "properties": properties,
            "required": eventFieldOrder,
            "additionalProperties": false,
        ]
    }

    public static func responseSchema() -> [String: Any] {
        [
            "type": "object",
            "properties": [
                "success": ["type": "boolean", "description": "False only when no event with dates could be found."],
                "errorMessage": ["type": "string", "description": "Why extraction failed; empty string on success."],
                "eventData": [
                    "type": "array",
                    "description": "One entry per calendar event. Always an array, even for a single event.",
                    "items": eventSchema(),
                    "minItems": 1,
                    "maxItems": 10,
                ] as [String: Any],
                "emailSubject": ["type": "string", "description": "Same as the first event's summary."],
                "locationLookup": ["type": "string", "description": "Search string for a maps lookup of the venue (name plus city), or empty."],
            ] as [String: Any],
            "required": ["success", "errorMessage", "eventData", "emailSubject", "locationLookup"],
            "additionalProperties": false,
        ]
    }

    /// Value for the `response_format` key of a chat-completions request.
    public static func responseFormat() -> [String: Any] {
        [
            "type": "json_schema",
            "json_schema": [
                "name": schemaName,
                "strict": true,
                "schema": responseSchema(),
            ] as [String: Any],
        ]
    }

    public static func responseSchemaJSON() throws -> Data {
        try JSONSerialization.data(withJSONObject: responseSchema(), options: [.sortedKeys, .prettyPrinted])
    }
}
