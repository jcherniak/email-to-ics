import XCTest
@testable import WebToICSCore

final class VTimeZoneBuilderTests: XCTestCase {
    func testLosAngelesWindowMatchesFixtureBlocks() {
        let tz = TimeZone(identifier: "America/Los_Angeles")!
        let start = Fixtures.date("2026-05-30T02:30:00Z")
        let window = VTimeZoneBuilder.window(for: [start], timeZone: tz)
        let lines = VTimeZoneBuilder.lines(tzid: "America/Los_Angeles", timeZone: tz, rangeStart: window.start, rangeEnd: window.end)
        let expected = Fixtures.string("presidio-email-1.expected.ics")
            .components(separatedBy: "\n")
            .drop { $0 != "BEGIN:VTIMEZONE" }
            .prefix { $0 != "END:VCALENDAR" }
        XCTAssertEqual(lines, Array(expected))
    }

    func testZoneWithoutDaylightSavingHasSingleBlock() {
        let tz = TimeZone(identifier: "America/Phoenix")!
        let lines = VTimeZoneBuilder.lines(tzid: "America/Phoenix", timeZone: tz,
                                           rangeStart: Fixtures.date("2025-01-01T07:00:00Z"), rangeEnd: Fixtures.date("2028-01-01T07:00:00Z"))
        XCTAssertEqual(lines.filter { $0 == "BEGIN:STANDARD" }.count, 1)
        XCTAssertTrue(lines.contains("TZOFFSETTO:-0700"))
        XCTAssertFalse(lines.contains("BEGIN:DAYLIGHT"))
    }

    func testEuropeanZoneOffsets() {
        let tz = TimeZone(identifier: "Europe/Berlin")!
        let window = VTimeZoneBuilder.window(for: [Fixtures.date("2026-07-01T10:00:00Z")], timeZone: tz)
        let lines = VTimeZoneBuilder.lines(tzid: "Europe/Berlin", timeZone: tz, rangeStart: window.start, rangeEnd: window.end)
        XCTAssertTrue(lines.contains("TZOFFSETTO:+0200"))
        XCTAssertTrue(lines.contains("TZOFFSETTO:+0100"))
        XCTAssertTrue(lines.contains("DTSTART:20250101T000000"))
        XCTAssertTrue(lines.contains("DTSTART:20260329T030000"), "DTSTART is the local time after the spring transition")
    }
}
