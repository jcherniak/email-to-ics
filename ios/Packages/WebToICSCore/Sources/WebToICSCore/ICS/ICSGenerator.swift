import Foundation

/// Builds RFC 5545 calendars matching `src/Calendar/IcalGenerator.php` (eluceo/ical) byte for byte for the
/// Presidio fixtures, with the Chrome extension's STATUS line added when requested. Personal, editable events:
/// METHOD:PUBLISH, no ORGANIZER/ATTENDEE/RSVP.
public struct ICSGenerator: Sendable {
    public enum EventStatus: String, Sendable {
        case tentative = "TENTATIVE"
        case confirmed = "CONFIRMED"

        public init(tentative: Bool) { self = tentative ? .tentative : .confirmed }
    }

    public struct Input: Sendable {
        public var event: ExtractedEvent
        public var status: EventStatus?

        public init(event: ExtractedEvent, status: EventStatus? = nil) {
            self.event = event
            self.status = status
        }
    }

    public struct Options: Sendable {
        public static let defaultProdID = "-//email-to-ics//iOS//EN"
        public static let phpProdID = "-//eluceo/ical//2.0/EN"

        public var prodID: String
        public var now: Date
        public var defaultTimeZoneID: String
        public var uidProvider: @Sendable () -> String

        public init(prodID: String = Options.defaultProdID, now: Date = Date(), defaultTimeZoneID: String = EventTiming.defaultTimeZoneID,
                    uidProvider: @escaping @Sendable () -> String = Options.randomUID) {
            self.prodID = prodID
            self.now = now
            self.defaultTimeZoneID = defaultTimeZoneID
            self.uidProvider = uidProvider
        }

        /// 32 lowercase hex characters, like the PHP backend's `bin2hex(random_bytes(16))`.
        public static func randomUID() -> String {
            UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        }
    }

    public init() {}

    public func calendar(for events: [ExtractedEvent], status: EventStatus? = nil, options: Options = Options()) throws -> String {
        try calendar(for: events.map { Input(event: $0, status: status) }, options: options)
    }

    public func calendar(for resolved: [ResolvedEvent], options: Options = Options()) throws -> String {
        try calendar(for: resolved.map { Input(event: $0.deliverableEvent, status: EventStatus(tentative: $0.tentative)) }, options: options)
    }

    public func calendar(for inputs: [Input], options: Options = Options()) throws -> String {
        var lines: [String] = [
            "BEGIN:VCALENDAR",
            "PRODID:\(options.prodID)",
            "VERSION:2.0",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
        ]
        var zones: [(tzid: String, timeZone: TimeZone)] = []
        var zoneDates: [Date] = []
        let stamp = EventTiming.formatter("yyyyMMdd'T'HHmmss'Z'", timeZone: TimeZone(identifier: "UTC")!).string(from: options.now)

        for input in inputs {
            let event = input.event
            let timing = try EventTiming.resolve(event, defaultTimeZoneID: options.defaultTimeZoneID)
            lines.append("BEGIN:VEVENT")
            lines += ICSWriter.contentLine("UID", value: options.uidProvider())
            lines += ICSWriter.contentLine("DTSTAMP", value: stamp)
            lines += ICSWriter.contentLine("SUMMARY", value: ICSWriter.escapeText(event.summary))
            lines += ICSWriter.contentLine("DESCRIPTION", value: ICSWriter.escapeText(event.description))
            let url = ICSWriter.sanitizeValue(event.url.trimmingCharacters(in: .whitespacesAndNewlines))
            if !url.isEmpty {
                lines += ICSWriter.contentLine("URL", value: url)
            }
            if timing.isAllDay {
                let day = EventTiming.formatter("yyyyMMdd", timeZone: timing.timeZone)
                lines += ICSWriter.contentLine("DTSTART", parameters: [("VALUE", "DATE")], value: day.string(from: timing.start))
                lines += ICSWriter.contentLine("DTEND", parameters: [("VALUE", "DATE")], value: day.string(from: timing.end))
            } else if EventTiming.isUTC(timing.timeZone) {
                let utc = EventTiming.formatter("yyyyMMdd'T'HHmmss'Z'", timeZone: timing.timeZone)
                lines += ICSWriter.contentLine("DTSTART", value: utc.string(from: timing.start))
                lines += ICSWriter.contentLine("DTEND", value: utc.string(from: timing.end))
            } else {
                let tzid = timing.timeZone.identifier
                let local = EventTiming.formatter("yyyyMMdd'T'HHmmss", timeZone: timing.timeZone)
                lines += ICSWriter.contentLine("DTSTART", parameters: [("TZID", tzid)], value: local.string(from: timing.start))
                lines += ICSWriter.contentLine("DTEND", parameters: [("TZID", tzid)], value: local.string(from: timing.end))
                if !zones.contains(where: { $0.tzid == tzid }) {
                    zones.append((tzid, timing.timeZone))
                }
                zoneDates += [timing.start, timing.end]
            }
            let location = event.location.trimmingCharacters(in: .whitespacesAndNewlines)
            if !location.isEmpty {
                lines += ICSWriter.contentLine("LOCATION", value: ICSWriter.escapeText(location))
            }
            if let status = input.status {
                lines += ICSWriter.contentLine("STATUS", value: status.rawValue)
            }
            let html = event.htmlDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            if !html.isEmpty {
                lines += ICSWriter.contentLine("X-ALT-DESC", parameters: [("FMTTYPE", "text/html")], value: ICSWriter.escapeText(html))
            }
            lines.append("END:VEVENT")
        }

        for zone in zones {
            let window = VTimeZoneBuilder.window(for: zoneDates, timeZone: zone.timeZone)
            lines += VTimeZoneBuilder.lines(tzid: zone.tzid, timeZone: zone.timeZone, rangeStart: window.start, rangeEnd: window.end)
        }
        lines.append("END:VCALENDAR")
        return ICSWriter.join(lines)
    }

    /// Normalises line endings and masks the per-run values so two calendars can be compared.
    public static func canonicalize(_ ics: String, maskProdID: Bool = false) -> String {
        var text = ics.replacingOccurrences(of: "\r\n", with: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        text = text.replacingOccurrences(of: "(?m)^UID:.*$", with: "UID:<uid>", options: .regularExpression)
        text = text.replacingOccurrences(of: "(?m)^DTSTAMP:.*$", with: "DTSTAMP:<dtstamp>", options: .regularExpression)
        if maskProdID {
            text = text.replacingOccurrences(of: "(?m)^PRODID:.*$", with: "PRODID:<prodid>", options: .regularExpression)
        }
        return text
    }
}
