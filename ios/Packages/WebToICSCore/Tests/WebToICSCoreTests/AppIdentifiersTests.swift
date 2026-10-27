import XCTest
@testable import WebToICSCore

final class AppIdentifiersTests: XCTestCase {
    func testDeepLinks() {
        XCTAssertEqual(AppIdentifiers.batchDeepLink.absoluteString, "webtoics://batch")
        let id = UUID(uuidString: "11111111-2222-3333-4444-555555555555")!
        XCTAssertEqual(AppIdentifiers.jobDeepLink(id).absoluteString, "webtoics://job/11111111-2222-3333-4444-555555555555")
    }

    func testBundleIdentifiers() {
        XCTAssertEqual(AppIdentifiers.shareExtensionBundleID, "com.justin-c.web-to-ics.share")
        XCTAssertEqual(AppIdentifiers.widgetExtensionBundleID, "com.justin-c.web-to-ics.widgets")
        XCTAssertEqual(AppIdentifiers.appGroup, "group.com.justin-c.web-to-ics")
    }
}
