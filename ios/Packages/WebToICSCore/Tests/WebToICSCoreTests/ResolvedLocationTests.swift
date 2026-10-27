import XCTest
@testable import WebToICSCore

final class ResolvedLocationTests: XCTestCase {
    func testCombinedText() {
        let fallback = "Presidio Theatre, 99 Moraga Ave, San Francisco, CA"
        XCTAssertEqual(ResolvedLocation(provider: "t").combinedText(fallback: fallback), fallback)
        XCTAssertEqual(ResolvedLocation(displayName: "Presidio Theatre", provider: "t").combinedText(fallback: fallback), "Presidio Theatre")
        XCTAssertEqual(ResolvedLocation(displayName: "Presidio Theatre", formattedAddress: "99 Moraga Avenue, San Francisco, CA 94129", provider: "t")
                        .combinedText(fallback: fallback), "Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129")
        XCTAssertEqual(ResolvedLocation(formattedAddress: "99 Moraga Avenue, San Francisco, CA 94129", provider: "t")
                        .combinedText(fallback: fallback), "Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129")
        XCTAssertEqual(ResolvedLocation(displayName: "Presidio Theatre", formattedAddress: "Presidio Theatre, 99 Moraga Ave", provider: "t")
                        .combinedText(fallback: fallback), "Presidio Theatre, 99 Moraga Ave")
    }

    func testDeliverableEventUsesResolvedLocation() {
        let event = ExtractedEvent(summary: "S", dtstart: "2026-01-01T10:00:00", location: "Venue")
        let resolved = ResolvedEvent(event: event, location: ResolvedLocation(displayName: "Venue", formattedAddress: "1 Main St", provider: "t"), tentative: true)
        XCTAssertEqual(resolved.deliverableEvent.location, "Venue, 1 Main St")
        XCTAssertEqual(ResolvedEvent(event: event, location: nil, tentative: false).locationText, "Venue")
    }
}
