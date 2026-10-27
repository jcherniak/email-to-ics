import Foundation

/// Emits a VTIMEZONE from the real transitions Foundation knows about, in the same shape the PHP backend
/// (eluceo/ical) produces: one block per transition inside a window from Jan 1 of (first year - 1) to Jan 1 of
/// (last year + 2), no RRULEs, DTSTART written as the local time after the transition.
public enum VTimeZoneBuilder {
    public static func window(for dates: [Date], timeZone: TimeZone) -> (start: Date, end: Date) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let years = dates.map { calendar.component(.year, from: $0) }
        let minYear = (years.min() ?? calendar.component(.year, from: Date())) - 1
        let maxYear = (years.max() ?? calendar.component(.year, from: Date())) + 2
        return (yearStart(minYear, calendar: calendar), yearStart(maxYear, calendar: calendar))
    }

    static func yearStart(_ year: Int, calendar: Calendar) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = 1
        components.day = 1
        components.hour = 0
        components.minute = 0
        components.second = 0
        return calendar.date(from: components)!
    }

    public static func lines(tzid: String, timeZone: TimeZone, rangeStart: Date, rangeEnd: Date) -> [String] {
        var lines = ["BEGIN:VTIMEZONE", "TZID:\(tzid)"]
        let format = EventTiming.formatter("yyyyMMdd'T'HHmmss", timeZone: timeZone)
        func block(at instant: Date, from: Int, to: Int) -> [String] {
            let daylight = timeZone.isDaylightSavingTime(for: instant)
            let name = timeZone.abbreviation(for: instant) ?? tzid
            let kind = daylight ? "DAYLIGHT" : "STANDARD"
            return [
                "BEGIN:\(kind)",
                "DTSTART:\(format.string(from: instant))",
                "TZNAME:\(name)",
                "TZOFFSETTO:\(ICSWriter.formatOffset(to))",
                "TZOFFSETFROM:\(ICSWriter.formatOffset(from))",
                "END:\(kind)",
            ]
        }
        let initialOffset = timeZone.secondsFromGMT(for: rangeStart)
        lines += block(at: rangeStart, from: initialOffset, to: initialOffset)
        var transition = timeZone.nextDaylightSavingTimeTransition(after: rangeStart)
        var guardCount = 0
        while let t = transition, t < rangeEnd, guardCount < 400 {
            let from = timeZone.secondsFromGMT(for: t.addingTimeInterval(-1))
            let to = timeZone.secondsFromGMT(for: t)
            lines += block(at: t, from: from, to: to)
            transition = timeZone.nextDaylightSavingTimeTransition(after: t)
            guardCount += 1
        }
        lines.append("END:VTIMEZONE")
        return lines
    }
}
