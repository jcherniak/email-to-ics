import XCTest
@testable import WebToICSCore

/// Byte-for-byte parity (after canonicalisation) with the PHP backend's Presidio fixtures.
final class ICSGeneratorParityTests: XCTestCase {
    let options = ICSGenerator.Options(prodID: ICSGenerator.Options.phpProdID,
                                       now: Fixtures.date("2026-05-01T12:00:00Z"),
                                       uidProvider: { "0123456789abcdef0123456789abcdef" })

    func testEachPresidioPerformanceMatchesFixture() throws {
        let result = Fixtures.presidioResult()
        for (index, event) in result.eventData.enumerated() {
            let ics = try ICSGenerator().calendar(for: [event], status: nil, options: options)
            let expected = ICSGenerator.canonicalize(Fixtures.string("presidio-email-\(index + 1).expected.ics"))
            XCTAssertEqual(ICSGenerator.canonicalize(ics), expected, "event \(index + 1) differs")
            XCTAssertTrue(ics.contains("\r\n"), "CRLF line endings")
            XCTAssertFalse(ics.contains("ORGANIZER"))
            XCTAssertFalse(ics.contains("ATTENDEE"))
            XCTAssertFalse(ics.contains("RSVP"))
            XCTAssertFalse(ics.contains("METHOD:REQUEST"))
        }
    }

    func testCombinedCalendarHasOneTimeZoneAndStatus() throws {
        let result = Fixtures.presidioResult()
        let ics = try ICSGenerator().calendar(for: result.eventData, status: .tentative, options: options)
        XCTAssertEqual(ics.components(separatedBy: "BEGIN:VEVENT").count - 1, 3)
        XCTAssertEqual(ics.components(separatedBy: "BEGIN:VTIMEZONE").count - 1, 1)
        XCTAssertEqual(ics.components(separatedBy: "STATUS:TENTATIVE").count - 1, 3)
        XCTAssertTrue(ics.hasSuffix("END:VCALENDAR\r\n"))
        let lines = ics.components(separatedBy: "\r\n")
        XCTAssertTrue(lines.allSatisfy { $0.utf8.count <= 75 }, "every physical line is at most 75 octets")
        // STATUS sits between LOCATION and X-ALT-DESC
        let statusIndex = lines.firstIndex(of: "STATUS:TENTATIVE")!
        XCTAssertTrue(lines[statusIndex - 1].hasPrefix("LOCATION:"))
        XCTAssertTrue(lines[statusIndex + 1].hasPrefix("X-ALT-DESC;FMTTYPE=text/html:"))
    }

    func testResolvedEventsCarryTheirOwnStatusAndLocation() throws {
        let event = Fixtures.presidioResult().eventData[0]
        let resolved = [
            ResolvedEvent(event: event, location: ResolvedLocation(displayName: "Presidio Theatre", formattedAddress: "99 Moraga Ave, San Francisco, CA 94129", provider: "test"), tentative: false),
            ResolvedEvent(event: event, location: nil, tentative: true),
        ]
        let ics = try ICSGenerator().calendar(for: resolved, options: options)
        XCTAssertTrue(ics.contains("STATUS:CONFIRMED"))
        XCTAssertTrue(ics.contains("STATUS:TENTATIVE"))
        XCTAssertTrue(ics.contains("LOCATION:Presidio Theatre\\, 99 Moraga Ave\\, San Francisco\\, CA 94129"))
    }
}
