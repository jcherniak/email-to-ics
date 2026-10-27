import SwiftUI
import WebToICSCore

struct EventRowView: View {
    let event: ResolvedEvent
    let selected: Bool
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Color.accentColor : Color.secondary)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.event.summary).font(.subheadline).fontWeight(.medium).lineLimit(2)
                    Text(Self.timeText(for: event.event)).font(.caption).foregroundStyle(.secondary)
                    if !event.locationText.isEmpty {
                        Text(event.locationText).font(.caption2).foregroundStyle(.secondary).lineLimit(2)
                    }
                }
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    static func timeText(for event: ExtractedEvent) -> String {
        guard let timing = try? EventTiming.resolve(event) else { return "\(event.dtstart) – \(event.dtend)" }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timing.timeZone
        let tz = timing.timeZone
        if timing.isAllDay {
            let lastDay = calendar.date(byAdding: .day, value: -1, to: timing.end) ?? timing.start
            let start = format(timing.start, .dateTime.weekday(.abbreviated).month(.abbreviated).day().year(), in: tz)
            if calendar.isDate(lastDay, inSameDayAs: timing.start) { return "\(start) · all day" }
            let end = format(lastDay, .dateTime.month(.abbreviated).day().year(), in: tz)
            return "\(start) – \(end) · all day"
        }
        let start = format(timing.start, .dateTime.weekday(.abbreviated).month(.abbreviated).day().year().hour().minute(), in: tz)
        let sameDay = calendar.isDate(timing.start, inSameDayAs: timing.end)
        let end = sameDay
            ? format(timing.end, .dateTime.hour().minute(), in: tz)
            : format(timing.end, .dateTime.month(.abbreviated).day().hour().minute(), in: tz)
        let zone = tz.abbreviation(for: timing.start) ?? tz.identifier
        return "\(start) – \(end) \(zone)"
    }

    private static func format(_ date: Date, _ style: Date.FormatStyle, in timeZone: TimeZone) -> String {
        var zoned = style
        zoned.timeZone = timeZone
        return date.formatted(zoned)
    }
}
