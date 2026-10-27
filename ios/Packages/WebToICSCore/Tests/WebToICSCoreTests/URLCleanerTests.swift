import XCTest
@testable import WebToICSCore

final class URLCleanerTests: XCTestCase {
    func testStripsTrackingParameters() {
        XCTAssertEqual(URLCleaner.strip("https://a.com/p?utm_source=x&utm_medium=y&fbclid=1&keep=2"), "https://a.com/p?keep=2")
        XCTAssertEqual(URLCleaner.strip("https://a.com/p?gclid=1"), "https://a.com/p")
        XCTAssertEqual(URLCleaner.strip("https://a.com/p?ref=home&x=1"), "https://a.com/p?x=1")
    }

    func testLeavesCleanURLsUntouched() {
        XCTAssertEqual(URLCleaner.strip("https://a.com/p?x=1&y=2"), "https://a.com/p?x=1&y=2")
        XCTAssertEqual(URLCleaner.strip("https://a.com/p"), "https://a.com/p")
        XCTAssertEqual(URLCleaner.strip("not a url"), "not a url")
    }
}
