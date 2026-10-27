import XCTest
@testable import WebToICSCore

final class HTMLTextCleanerTests: XCTestCase {
    func testStripsChromeAndKeepsContentWithLineBreaks() {
        let html = """
        <html><head><title>Opera &amp; More</title><style>p{}</style><script>var x=1;</script></head>
        <body><nav>Menu</nav><header>Top</header>
        <main><h1>Doubt</h1><p>May 29, 2026 at 7:30 PM</p><ul><li>Row one</li><li>Row&nbsp;two</li></ul>
        <!-- comment --><p>Tickets &#36;20 &#x2014; buy</p></main><footer>Foot</footer></body></html>
        """
        let result = HTMLTextCleaner.clean(html: html)
        XCTAssertEqual(result.title, "Opera & More")
        XCTAssertFalse(result.text.contains("Menu"))
        XCTAssertFalse(result.text.contains("var x"))
        XCTAssertFalse(result.text.contains("Foot"))
        let collapsed = result.text.replacingOccurrences(of: "\n\n", with: "\n")
        XCTAssertTrue(collapsed.contains("Doubt\nMay 29, 2026 at 7:30 PM"), collapsed)
        XCTAssertTrue(collapsed.contains("Row one\nRow two"), collapsed)
        XCTAssertTrue(collapsed.contains("Tickets $20 \u{2014} buy"), collapsed)
        XCTAssertFalse(result.truncated)
    }

    func testTruncates() {
        let html = "<p>" + String(repeating: "a", count: 50) + "</p>"
        let result = HTMLTextCleaner.clean(html: html, limit: 10)
        XCTAssertEqual(result.text.count, 10)
        XCTAssertTrue(result.truncated)
    }

    func testDecodeEntities() {
        XCTAssertEqual(HTMLTextCleaner.decodeEntities("a &lt; b &amp;&amp; c &gt; d &quot;q&quot; &unknown;"), "a < b && c > d \"q\" &unknown;")
    }
}
