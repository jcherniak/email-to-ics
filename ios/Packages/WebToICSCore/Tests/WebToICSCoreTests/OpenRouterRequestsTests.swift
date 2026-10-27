import XCTest
@testable import WebToICSCore

final class OpenRouterRequestsTests: XCTestCase {
    func testChatRequestHeadersAndBody() throws {
        let (request, body) = try OpenRouterAPI.chatRequest(
            model: "~openai/gpt-mini-latest",
            messages: [.system("sys"), .user("hi")],
            apiKey: "sk-test",
            responseFormat: ExtractionSchema.responseFormat())
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url, OpenRouterAPI.chatCompletionsURL)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer sk-test")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Title"), "WebToICS iOS")
        XCTAssertNotNil(request.value(forHTTPHeaderField: "HTTP-Referer"))
        let json = jsonObject(body)
        XCTAssertEqual(json["model"] as? String, "~openai/gpt-mini-latest")
        XCTAssertEqual(json["temperature"] as? Double, 0.1)
        XCTAssertEqual(json["max_tokens"] as? Int, 20000)
        let messages = try XCTUnwrap(json["messages"] as? [[String: String]])
        XCTAssertEqual(messages, [["role": "system", "content": "sys"], ["role": "user", "content": "hi"]])
        let format = try XCTUnwrap(json["response_format"] as? [String: Any])
        XCTAssertEqual(format["type"] as? String, "json_schema")
    }

    func testModelsRequest() {
        let request = OpenRouterAPI.modelsRequest(apiKey: nil)
        XCTAssertEqual(request.httpMethod, "GET")
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
        XCTAssertEqual(request.url, OpenRouterAPI.modelsURL)
    }

    func testContentParsingStripsFencesAndSurfacesErrors() throws {
        XCTAssertEqual(try OpenRouterAPI.content(from: Fixtures.chatReply(content: "```json\n{\"a\":1}\n```")), "{\"a\":1}")
        XCTAssertEqual(try OpenRouterAPI.content(from: Fixtures.chatReply(content: "  {\"a\":1} ")), "{\"a\":1}")
        let error = Data("{\"error\":{\"message\":\"rate limited\",\"code\":429}}".utf8)
        XCTAssertThrowsError(try OpenRouterAPI.content(from: error)) { e in
            XCTAssertEqual(e as? OpenRouterAPI.ResponseError, .api("rate limited"))
        }
        XCTAssertThrowsError(try OpenRouterAPI.content(from: Data("not json".utf8))) { e in
            if case .malformed = e as? OpenRouterAPI.ResponseError {} else { XCTFail("expected malformed, got \(e)") }
        }
        XCTAssertThrowsError(try OpenRouterAPI.content(from: Fixtures.chatReply(content: ""))) { e in
            XCTAssertEqual(e as? OpenRouterAPI.ResponseError, .emptyContent)
        }
    }
}
