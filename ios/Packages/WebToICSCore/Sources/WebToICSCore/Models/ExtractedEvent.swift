import Foundation

/// One calendar event as returned by the model. Field names mirror the PHP backend and the
/// Chrome extension schema (`eventData` items) so prompts and fixtures stay shared.
public struct ExtractedEvent: Codable, Hashable, Sendable {
    public var summary: String
    public var description: String
    public var htmlDescription: String
    /// Local wall-clock time without offset (`2026-05-29T19:30:00`) or `YYYY-MM-DD` for all-day events.
    public var dtstart: String
    /// Same format as `dtstart`; may be empty when the model could not determine an end.
    public var dtend: String
    /// IANA time zone identifier, e.g. `America/Los_Angeles`.
    public var timezone: String
    public var location: String
    public var url: String
    public var isAllDay: Bool

    public init(summary: String, description: String = "", htmlDescription: String = "", dtstart: String,
                dtend: String = "", timezone: String = "", location: String = "", url: String = "", isAllDay: Bool = false) {
        self.summary = summary
        self.description = description
        self.htmlDescription = htmlDescription
        self.dtstart = dtstart
        self.dtend = dtend
        self.timezone = timezone
        self.location = location
        self.url = url
        self.isAllDay = isAllDay
    }

    enum CodingKeys: String, CodingKey {
        case summary, description, htmlDescription, dtstart, dtend, timezone, location, url, isAllDay
    }

    /// Lenient decoding: strict-schema responses always carry every key, but a retry with a
    /// non-strict model may omit optional ones or send `null`.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        summary = try c.decodeIfPresent(String.self, forKey: .summary) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        htmlDescription = try c.decodeIfPresent(String.self, forKey: .htmlDescription) ?? ""
        dtstart = try c.decodeIfPresent(String.self, forKey: .dtstart) ?? ""
        dtend = try c.decodeIfPresent(String.self, forKey: .dtend) ?? ""
        timezone = try c.decodeIfPresent(String.self, forKey: .timezone) ?? ""
        location = try c.decodeIfPresent(String.self, forKey: .location) ?? ""
        url = try c.decodeIfPresent(String.self, forKey: .url) ?? ""
        isAllDay = try c.decodeIfPresent(Bool.self, forKey: .isAllDay) ?? false
    }

    public var hasUsableDates: Bool {
        !summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !dtstart.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
