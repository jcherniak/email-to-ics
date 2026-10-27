import XCTest
@testable import WebToICSCore

final class EventTimingTests: XCTestCase {
    func testTimedEventWithExplicitEnd() throws {
        let event = ExtractedEvent(summary: "Opera Parallele - Doubt", dtstart: "2026-05-29T19:30:00", dtend: "2026-05-29T22:30:00", timezone: "America/Los_Angeles")
        let timing = try EventTiming.resolve(event)
        XCTAssertFalse(timing.isAllDay)
        XCTAssertEqual(timing.timeZone.identifier, "America/Los_Angeles")
        XCTAssertEqual(timing.startRFC3339(), "2026-05-29T19:30:00-07:00")
        XCTAssertEqual(timing.endRFC3339(), "2026-05-29T22:30:00-07:00")
        XCTAssertFalse(timing.endWasDefaulted)
    }

    func testDefaultDurations() throws {
        func end(_ summary: String) throws -> TimeInterval {
            let t = try EventTiming.resolve(ExtractedEvent(summary: summary, dtstart: "2026-01-10T10:00:00", timezone: "America/New_York"))
            XCTAssertTrue(t.endWasDefaulted)
            return t.end.timeIntervalSince(t.start)
        }
        XCTAssertEqual(try end("SF Opera - Manon"), 3 * 3600)
        XCTAssertEqual(try end("Appointment with Dr. Sweeny"), 30 * 60)
        XCTAssertEqual(try end("Doctor visit"), 30 * 60)
        XCTAssertEqual(try end("Concert at Golden Gate Park"), 2 * 3600)
    }

    func testEndBeforeStartIsReplacedByDefault() throws {
        let t = try EventTiming.resolve(ExtractedEvent(summary: "Talk", dtstart: "2026-01-10T10:00:00", dtend: "2026-01-10T09:00:00", timezone: "UTC"))
        XCTAssertTrue(t.endWasDefaulted)
        XCTAssertEqual(t.end.timeIntervalSince(t.start), 2 * 3600)
        XCTAssertTrue(EventTiming.isUTC(t.timeZone))
    }

    func testAllDayEvents() throws {
        let single = try EventTiming.resolve(ExtractedEvent(summary: "Festival", dtstart: "2026-09-12", timezone: "America/Chicago", isAllDay: true))
        XCTAssertTrue(single.isAllDay)
        XCTAssertEqual(single.startDateString(), "2026-09-12")
        XCTAssertEqual(single.endDateString(), "2026-09-13", "exclusive end is the following day")

        let multi = try EventTiming.resolve(ExtractedEvent(summary: "Conference", dtstart: "2026-09-12", dtend: "2026-09-14", timezone: "America/Chicago"))
        XCTAssertTrue(multi.isAllDay, "date-only strings imply all-day even without the flag")
        XCTAssertEqual(multi.endDateString(), "2026-09-15")
    }

    func testOffsetsAndUnknownZonesAreHandled() throws {
        let zulu = try EventTiming.resolve(ExtractedEvent(summary: "Call", dtstart: "2026-05-29T02:30:00Z", dtend: "", timezone: "America/Los_Angeles"))
        XCTAssertEqual(zulu.startRFC3339(), "2026-05-28T19:30:00-07:00")
        let unknown = try EventTiming.resolve(ExtractedEvent(summary: "X", dtstart: "2026-05-29T10:00", timezone: "Mars/Olympus"))
        XCTAssertEqual(unknown.timeZone.identifier, "America/Los_Angeles")
        XCTAssertThrowsError(try EventTiming.resolve(ExtractedEvent(summary: "Bad", dtstart: "tomorrow"))) { e in
            XCTAssertEqual(e as? EventTimingError, .invalidStart("tomorrow"))
        }
        XCTAssertThrowsError(try EventTiming.resolve(ExtractedEvent(summary: "Bad", dtstart: "2026-05-29T10:00:00", dtend: "later"))) { e in
            XCTAssertEqual(e as? EventTimingError, .invalidEnd("later"))
        }
    }
}
