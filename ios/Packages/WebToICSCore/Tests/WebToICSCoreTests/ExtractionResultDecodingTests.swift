import XCTest
@testable import WebToICSCore

final class ExtractionResultDecodingTests: XCTestCase {
    func testDecodesFixtureArray() {
        let result = Fixtures.presidioResult()
        XCTAssertTrue(result.success)
        XCTAssertEqual(result.eventData.count, 3)
        XCTAssertEqual(result.eventData[0].summary, "Opera Parallele - Doubt")
        XCTAssertEqual(result.eventData[2].dtstart, "2026-05-31T15:00:00")
        XCTAssertEqual(result.eventData[0].timezone, "America/Los_Angeles")
        XCTAssertFalse(result.eventData[0].isAllDay)
    }

    func testDecodesSingleObjectAndLegacyEventsKey() throws {
        let single = """
        {"success":true,"errorMessage":"","eventData":{"summary":"A","dtstart":"2026-01-02T10:00:00"},"emailSubject":"A","locationLookup":""}
        """
        let one = try JSONDecoder().decode(ExtractionResult.self, from: Data(single.utf8))
        XCTAssertEqual(one.eventData.map(\.summary), ["A"])
        XCTAssertEqual(one.eventData[0].dtend, "")
        XCTAssertFalse(one.eventData[0].isAllDay)

        let legacy = """
        {"events":[{"summary":"B","dtstart":"2026-01-02","isAllDay":true}]}
        """
        let two = try JSONDecoder().decode(ExtractionResult.self, from: Data(legacy.utf8))
        XCTAssertTrue(two.success)
        XCTAssertEqual(two.eventData.map(\.summary), ["B"])
        XCTAssertTrue(two.eventData[0].isAllDay)
    }

    func testRoundTripEncoding() throws {
        let original = Fixtures.presidioResult()
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(ExtractionResult.self, from: data)
        XCTAssertEqual(decoded, original)
    }

    func testUsableEventsFiltersEmpty() {
        let result = ExtractionResult(eventData: [
            ExtractedEvent(summary: "", dtstart: "2026-01-01T10:00:00"),
            ExtractedEvent(summary: "Keep", dtstart: ""),
            ExtractedEvent(summary: "Keep", dtstart: "2026-01-01T10:00:00"),
        ])
        XCTAssertEqual(result.usableEvents.count, 1)
    }
}
