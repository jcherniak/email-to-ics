import Foundation

public enum EventTimingError: Error, LocalizedError, Equatable {
    case invalidStart(String)
    case invalidEnd(String)

    public var errorDescription: String? {
        switch self {
        case .invalidStart(let s): return "Unreadable start date \"\(s)\"."
        case .invalidEnd(let s): return "Unreadable end date \"\(s)\"."
        }
    }
}

/// Concrete start/end instants for an extracted event, resolving the model's local wall-clock strings,
/// the time zone and the default durations used by the PHP generator (2h, 3h for opera, 30m for appointments).
public struct EventTiming: Equatable, Sendable {
    public var start: Date
    /// For all-day events this is the exclusive end (the day after the last day), at local midnight.
    public var end: Date
    public var isAllDay: Bool
    public var timeZone: TimeZone
    public var endWasDefaulted: Bool

    public static let defaultTimeZoneID = "America/Los_Angeles"

    public static func timeZone(for identifier: String?, fallback: String = defaultTimeZoneID) -> TimeZone {
        let trimmed = identifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmed.isEmpty, let tz = TimeZone(identifier: trimmed) { return tz }
        if ["UTC", "GMT", "Z"].contains(trimmed.uppercased()) { return TimeZone(identifier: "UTC")! }
        return TimeZone(identifier: fallback) ?? .current
    }

    public static func isUTC(_ tz: TimeZone) -> Bool {
        tz.secondsFromGMT() == 0 && (tz.identifier == "UTC" || tz.identifier == "GMT" || tz.identifier.hasPrefix("Etc/"))
    }

    public static func defaultDuration(forSummary summary: String) -> TimeInterval {
        let lower = summary.lowercased()
        if lower.contains("opera") { return 3 * 3600 }
        if lower.contains("doctor") || lower.contains("appointment") { return 30 * 60 }
        return 2 * 3600
    }

    public static func resolve(_ event: ExtractedEvent, defaultTimeZoneID: String = defaultTimeZoneID) throws -> EventTiming {
        let tz = timeZone(for: event.timezone, fallback: defaultTimeZoneID)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = tz
        let startText = event.dtstart.trimmingCharacters(in: .whitespacesAndNewlines)
        let endText = event.dtend.trimmingCharacters(in: .whitespacesAndNewlines)
        let allDay = event.isAllDay || (isDateOnly(startText) && (endText.isEmpty || isDateOnly(endText)))

        if allDay {
            guard let startDay = parseDateOnly(startText, calendar: calendar) ?? parseDateTime(startText, timeZone: tz).map { calendar.startOfDay(for: $0) } else {
                throw EventTimingError.invalidStart(event.dtstart)
            }
            var lastDay = startDay
            if !endText.isEmpty {
                guard let parsedEnd = parseDateOnly(endText, calendar: calendar) ?? parseDateTime(endText, timeZone: tz).map { calendar.startOfDay(for: $0) } else {
                    throw EventTimingError.invalidEnd(event.dtend)
                }
                if parsedEnd >= startDay { lastDay = parsedEnd }
            }
            let exclusiveEnd = calendar.date(byAdding: .day, value: 1, to: lastDay)!
            return EventTiming(start: startDay, end: exclusiveEnd, isAllDay: true, timeZone: tz, endWasDefaulted: endText.isEmpty)
        }

        guard let start = parseDateTime(startText, timeZone: tz) else { throw EventTimingError.invalidStart(event.dtstart) }
        var endWasDefaulted = false
        var end: Date
        if endText.isEmpty {
            end = start.addingTimeInterval(defaultDuration(forSummary: event.summary))
            endWasDefaulted = true
        } else if let parsed = parseDateTime(endText, timeZone: tz) ?? parseDateOnly(endText, calendar: calendar) {
            end = parsed
        } else {
            throw EventTimingError.invalidEnd(event.dtend)
        }
        if end <= start {
            end = start.addingTimeInterval(defaultDuration(forSummary: event.summary))
            endWasDefaulted = true
        }
        return EventTiming(start: start, end: end, isAllDay: false, timeZone: tz, endWasDefaulted: endWasDefaulted)
    }

    // MARK: Parsing

    static func isDateOnly(_ text: String) -> Bool {
        text.range(of: "^\\d{4}-\\d{2}-\\d{2}$", options: .regularExpression) != nil
    }

    static func parseDateOnly(_ text: String, calendar: Calendar) -> Date? {
        guard isDateOnly(text) else { return nil }
        let parts = text.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        components.hour = 0
        components.minute = 0
        components.second = 0
        return calendar.date(from: components)
    }

    /// Accepts `yyyy-MM-ddTHH:mm[:ss]`, a space separator, and strings with an explicit offset or `Z`
    /// (converted into the event's zone).
    static func parseDateTime(_ text: String, timeZone: TimeZone) -> Date? {
        if text.range(of: "(Z|[+-]\\d{2}:?\\d{2})$", options: .regularExpression) != nil {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime]
            if let date = iso.date(from: text) { return date }
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso.date(from: text) { return date }
            return nil
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = timeZone
        for format in ["yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd'T'HH:mm:ss.SSS"] {
            formatter.dateFormat = format
            if let date = formatter.date(from: text) { return date }
        }
        return nil
    }

    // MARK: Formatting helpers shared by ICS and the Google destination

    static func formatter(_ format: String, timeZone: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = timeZone
        f.dateFormat = format
        return f
    }

    /// `yyyy-MM-dd` in the event zone (Google all-day `date`).
    public func startDateString() -> String { Self.formatter("yyyy-MM-dd", timeZone: timeZone).string(from: start) }
    public func endDateString() -> String { Self.formatter("yyyy-MM-dd", timeZone: timeZone).string(from: end) }

    /// RFC 3339 with the zone's offset, e.g. `2026-05-29T19:30:00-07:00` (Google timed `dateTime`).
    public func startRFC3339() -> String { Self.formatter("yyyy-MM-dd'T'HH:mm:ssxxx", timeZone: timeZone).string(from: start) }
    public func endRFC3339() -> String { Self.formatter("yyyy-MM-dd'T'HH:mm:ssxxx", timeZone: timeZone).string(from: end) }
}
