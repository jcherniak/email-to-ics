import XCTest
@testable import WebToICSCore

final class SessionIdentifierTests: XCTestCase {
    func testRoundTrip() {
        let id = UUID()
        let identifier = SessionIdentifier(jobID: id, stage: .extract, attempt: 2)
        XCTAssertEqual(identifier.rawValue, "com.justin-c.web-to-ics.job.\(id.uuidString).extract.2")
        XCTAssertEqual(SessionIdentifier(rawValue: identifier.rawValue), identifier)
        XCTAssertTrue(SessionIdentifier.isOurs(identifier.rawValue))
    }

    func testRejectsGarbage() {
        XCTAssertNil(SessionIdentifier(rawValue: "com.other.session"))
        XCTAssertNil(SessionIdentifier(rawValue: "com.justin-c.web-to-ics.job.not-a-uuid.extract.1"))
        XCTAssertNil(SessionIdentifier(rawValue: "com.justin-c.web-to-ics.job.\(UUID().uuidString).bogus.1"))
        XCTAssertNil(SessionIdentifier(rawValue: "com.justin-c.web-to-ics.job.\(UUID().uuidString).extract.0"))
        XCTAssertFalse(SessionIdentifier.isOurs("com.apple.something"))
    }
}
