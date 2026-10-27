import XCTest
@testable import WebToICSCore

final class OpenRouterExtractorTests: XCTestCase {
    let extractor = OpenRouterExtractor()

    func testMessageOrder() throws {
        let request = ExtractionRequest(pageText: "Body", sourceURL: "https://x.test/a?utm_source=q", pageTitle: "T",
                                        instructions: "Only May 30", tentative: false,
                                        now: Fixtures.date("2026-05-01T12:00:00Z"))
        let messages = try extractor.messages(for: request)
        XCTAssertEqual(messages.map(\.role), ["system", "user", "user", "user"])
        XCTAssertTrue(messages[0].content.contains("Tentative flag: 0 (confirmed)"))
        XCTAssertTrue(messages[1].content.hasPrefix("*** EXTREMELY IMPORTANT INSTRUCTIONS ***"))
        XCTAssertTrue(messages[2].content.contains("https://x.test/a"))
        XCTAssertFalse(messages[2].content.contains("utm_source"))
        XCTAssertEqual(messages[3].content, "Content to analyze:\nBody")

        let bare = try extractor.messages(for: ExtractionRequest(pageText: "Body", isRawHTML: true))
        XCTAssertEqual(bare.map(\.role), ["system", "user"])
        XCTAssertTrue(bare[1].content.contains("raw page HTML"))
    }

    func testMakeRequestUsesStrictSchema() throws {
        let (_, body) = try extractor.makeRequest(ExtractionRequest(pageText: "x"), model: "m", apiKey: "k")
        let json = jsonObject(body)
        let format = try XCTUnwrap(json["response_format"] as? [String: Any])
        let schema = try XCTUnwrap(format["json_schema"] as? [String: Any])
        XCTAssertEqual(schema["strict"] as? Bool, true)
    }

    func testParseFixtureReply() throws {
        let result = try extractor.parse(Fixtures.chatReply(content: Fixtures.string("presidio-ai-output.expected.json")))
        XCTAssertEqual(result.eventData.count, 3)
        XCTAssertEqual(result.emailSubject, "Opera Parallele - Doubt")
    }

    func testParseFailures() {
        let failure = "{\"success\":false,\"errorMessage\":\"No dates\",\"eventData\":[],\"emailSubject\":\"\",\"locationLookup\":\"\"}"
        XCTAssertThrowsError(try extractor.parse(Fixtures.chatReply(content: failure))) { e in
            XCTAssertEqual(e as? ExtractionError, .modelReportedFailure("No dates"))
            XCTAssertTrue((e as? ExtractionError)?.isRetryableWithRawHTML == true)
        }
        let empty = "{\"success\":true,\"errorMessage\":\"\",\"eventData\":[{\"summary\":\"\",\"dtstart\":\"\"}],\"emailSubject\":\"\",\"locationLookup\":\"\"}"
        XCTAssertThrowsError(try extractor.parse(Fixtures.chatReply(content: empty))) { e in
            XCTAssertEqual(e as? ExtractionError, .noEvents)
        }
        XCTAssertThrowsError(try extractor.parse(Fixtures.chatReply(content: "{oops"))) { e in
            if case .invalidJSON = e as? ExtractionError {} else { XCTFail("expected invalidJSON, got \(e)") }
        }
        XCTAssertFalse(ExtractionError.http(401, "").isRetryableWithRawHTML)
        XCTAssertTrue(ExtractionError.http(503, "").isRetryableWithRawHTML)
    }

    func testEmailSubjectDefaultsToFirstSummary() throws {
        let content = "{\"success\":true,\"errorMessage\":\"\",\"eventData\":[{\"summary\":\"Gala\",\"dtstart\":\"2026-09-12T18:00:00\"}],\"emailSubject\":\"\",\"locationLookup\":\"\"}"
        let result = try OpenRouterExtractor.parseContent(content)
        XCTAssertEqual(result.emailSubject, "Gala")
    }
}
