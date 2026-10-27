import XCTest
@testable import WebToICSCore

final class ICSWriterTests: XCTestCase {
    func testEscaping() {
        XCTAssertEqual(ICSWriter.escapeText("a,b;c\\d"), "a\\,b\\;c\\\\d")
        XCTAssertEqual(ICSWriter.escapeText("line1\nline2"), "line1\\nline2")
        XCTAssertEqual(ICSWriter.escapeText("literal\\nbreak"), "literal\\nbreak", "a literal \\n is kept as one escaped newline")
        XCTAssertEqual(ICSWriter.escapeText("tab\there\r\nnext"), "tabhere\\nnext")
        XCTAssertEqual(ICSWriter.escapeText("colon: fine \"quotes\""), "colon: fine \"quotes\"")
        XCTAssertEqual(ICSWriter.sanitizeValue("https://a.b/c,d\u{01}"), "https://a.b/c,d")
    }

    func testFoldingRespectsOctetsAndUTF8() {
        let ascii = String(repeating: "x", count: 200)
        let folded = ICSWriter.fold("DESCRIPTION:" + ascii)
        XCTAssertEqual(folded[0].utf8.count, 75)
        XCTAssertTrue(folded.dropFirst().allSatisfy { $0.hasPrefix(" ") && $0.utf8.count <= 75 })
        XCTAssertEqual(folded.map { $0.hasPrefix(" ") ? String($0.dropFirst()) : $0 }.joined(), "DESCRIPTION:" + ascii)

        let emoji = String(repeating: "é", count: 100) // 2 bytes each
        let foldedEmoji = ICSWriter.fold("SUMMARY:" + emoji)
        XCTAssertTrue(foldedEmoji.allSatisfy { $0.utf8.count <= 75 })
        XCTAssertEqual(foldedEmoji.map { $0.hasPrefix(" ") ? String($0.dropFirst()) : $0 }.joined(), "SUMMARY:" + emoji)
        XCTAssertFalse(foldedEmoji.joined().contains("\u{FFFD}"))

        XCTAssertEqual(ICSWriter.fold("SHORT:line"), ["SHORT:line"])
        XCTAssertEqual(ICSWriter.fold(String(repeating: "a", count: 75)).count, 1)
        XCTAssertEqual(ICSWriter.fold(String(repeating: "a", count: 76)).count, 2)
    }

    func testContentLineAndOffsets() {
        XCTAssertEqual(ICSWriter.contentLine("DTSTART", parameters: [("TZID", "America/Los_Angeles")], value: "20260529T193000"),
                       ["DTSTART;TZID=America/Los_Angeles:20260529T193000"])
        XCTAssertEqual(ICSWriter.formatOffset(-8 * 3600), "-0800")
        XCTAssertEqual(ICSWriter.formatOffset(5 * 3600 + 30 * 60), "+0530")
        XCTAssertEqual(ICSWriter.formatOffset(0), "+0000")
        XCTAssertEqual(ICSWriter.join(["A", "B"]), "A\r\nB\r\n")
    }
}
