import Foundation

enum OpenRouterError: Error { case badResponse, invalidJSON }

final class OpenRouterClient {
    private let apiKey: String
    init(apiKey: String) { self.apiKey = apiKey }

    func extract(pageHTML: String, sourceURL: String, instructions: String, tentative: Bool, multiday: Bool, model: String, jpegBase64: String?) async throws -> [ExtractedEvent] {
        let systemPrompt = Self.systemPrompt(tentative: tentative, multiday: multiday)
        let userText = "\(instructions.isEmpty ? "" : "Special instructions: \(instructions)\n")\nSource URL (MUST be included in url field and description): \(sourceURL)\n\nContent to analyze:\n\(pageHTML)"

        var userContent: [[String: Any]] = [["type": "text", "text": userText]]
        if let jpegBase64 { userContent.append(["type": "image_url", "image_url": ["url": "data:image/jpeg;base64,\(jpegBase64)"]]) }

        let eventSchema: [String: Any] = [
            "type": "object",
            "properties": [
                "events": [
                    "type": "array",
                    "description": multiday ? "Array of calendar events (focus on primary event, multiple only if no clear primary)" : "Array of calendar events (must contain exactly one event)",
                    "minItems": 1,
                    "maxItems": multiday ? 50 : 1,
                    "items": [
                        "type": "object",
                        "properties": [
                            "summary": ["type": "string"],
                            "location": ["type": "string"],
                            "start_date": ["type": "string", "pattern": "^\\\d{4}-\\\d{2}-\\\d{2}$"],
                            "start_time": ["type": ["string","null"], "pattern": "^\\\d{2}:\\\d{2}$"],
                            "end_date": ["type": ["string","null"], "pattern": "^\\\d{4}-\\\d{2}-\\\d{2}$"],
                            "end_time": ["type": ["string","null"], "pattern": "^\\\d{2}:\\\d{2}$"],
                            "description": ["type": "string"],
                            "timezone": ["type": "string", "default": "America/New_York"],
                            "url": ["type": "string"]
                        ],
                        "required": ["summary","location","start_date","description","timezone","url"],
                        "additionalProperties": false
                    ]
                ]
            ],
            "required": ["events"],
            "additionalProperties": false
        ]

        let payload: [String: Any] = [
            "model": model,
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": userContent]
            ],
            "response_format": [
                "type": "json_schema",
                "json_schema": [
                    "name": "calendar_event",
                    "schema": eventSchema,
                    "strict": true
                ]
            ],
            "max_tokens": 20000,
            "temperature": 0.1
        ]

        var request = URLRequest(url: URL(string: "https://openrouter.ai/api/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, resp) = try await URLSession.shared.data(for: request)
        guard let http = resp as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw OpenRouterError.badResponse }

        // Parse OpenRouter JSON
        let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let choices = root?["choices"] as? [[String: Any]]
        let content = (choices?.first?["message"] as? [String: Any])?["content"] as? String ?? ""
        let clean = Self.cleanJSONContent(content)
        guard let json = clean.data(using: .utf8),
              let obj = try JSONSerialization.jsonObject(with: json) as? [String: Any],
              let events = obj["events"] as? [[String: Any]] else { throw OpenRouterError.invalidJSON }

        return events.compactMap { e in
            guard let summary = e["summary"] as? String,
                  let desc = e["description"] as? String,
                  let loc = e["location"] as? String,
                  let startDate = e["start_date"] as? String,
                  let tz = e["timezone"] as? String,
                  let url = e["url"] as? String else { return nil }
            return ExtractedEvent(
                summary: summary,
                location: loc,
                start_date: startDate,
                start_time: e["start_time"] as? String,
                end_date: e["end_date"] as? String,
                end_time: e["end_time"] as? String,
                description: desc,
                timezone: tz,
                url: url
            )
        }
    }

    private static func systemPrompt(tentative: Bool, multiday: Bool) -> String {
        """
        You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

        Extract event details from the provided content. Pay attention to:
        - Use ISO 8601 date format (YYYY-MM-DD) and 24-hour time format (HH:MM)
        - For all-day events, set start_time and end_time to null
        - If no end time specified, make reasonable estimate
        - Default timezone is America/New_York unless specified
        - Multi-day events: \(multiday ? "Focus on the PRIMARY event mentioned on the page. Only if there is no clear primary event, extract multiple events" : "Extract exactly one event")
        - Event status: \(tentative ? "Tentative" : "Confirmed") (set status field only; do NOT include a "Status:" line in the description)
        - Title prefix (group/host): Determine the presenting organization from the page/site (prefer <meta property="og:site_name">, the site header/brand, or phrases like "X presents ..."). Set the event summary to "[Group]: [Event Title]". Avoid duplicating the prefix if already present.
          - Examples: "KQED Live presents …" -> summary "KQED Live: …". If the site is sfsymphony.org or sanfranciscosymphony.org, use "SF Symphony: …".
          - IMPORTANT: Never use a ticketing/platform brand (e.g., Eventbrite, Ticketmaster) as the group. If the domain is eventbrite.com, identify the organizer from the page (e.g., the Organizer/By section or organizer profile) and use that as the group. If no organizer can be found, omit the prefix rather than using the platform name.
        - Concerts: Include the complete program as listed on the page in the description under a section titled "Program:". Preserve the order, include composer names and full work titles (and movements if listed).
        - Location selection: If both streaming and in-person options are present, ALWAYS use the in-person option. Prefer the physical venue name AND address. A URL as location is allowed only if no physical venue/address appears anywhere on the page; otherwise never use a URL for location.
        - CRITICAL: Always include the source URL in the "url" field
        - CRITICAL: Always add the source URL at the end of the description with format: "\n\nSource: [URL]"
        - Important: Do NOT fetch or browse the Source URL or external resources. Only use the provided HTML and the optional screenshot.
        """
    }

    private static func cleanJSONContent(_ text: String) -> String {
        var t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.hasPrefix("```json") { t = String(t.dropFirst(7)) }
        if t.hasPrefix("```") { t = String(t.dropFirst(3)) }
        if t.hasSuffix("```") { t = String(t.dropLast(3)) }
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

