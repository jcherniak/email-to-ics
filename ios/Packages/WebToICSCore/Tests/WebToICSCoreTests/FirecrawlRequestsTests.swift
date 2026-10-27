import XCTest
@testable import WebToICSCore

final class FirecrawlRequestsTests: XCTestCase {
    func testScrapeRequestBody() throws {
        let (request, body) = try FirecrawlAPI.scrapeRequest(url: "https://example.com/show", apiKey: "fc-key")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url, FirecrawlAPI.scrapeURL)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer fc-key")
        let json = jsonObject(body)
        XCTAssertEqual(json["url"] as? String, "https://example.com/show")
        XCTAssertEqual(json["formats"] as? [String], ["markdown", "html"])
        XCTAssertEqual(json["onlyMainContent"] as? Bool, true)
        XCTAssertEqual(json["maxAge"] as? Int, 3_600_000)
        XCTAssertEqual(json["removeBase64Images"] as? Bool, true)
    }

    func testParse() throws {
        let ok = Data("{\"success\":true,\"data\":{\"markdown\":\"# Hi\\n\",\"html\":\"<p>Hi</p>\",\"metadata\":{\"title\":\"Hi\"}}}".utf8)
        let scraped = try FirecrawlAPI.parse(ok)
        XCTAssertEqual(scraped, FirecrawlAPI.Scraped(markdown: "# Hi", html: "<p>Hi</p>", title: "Hi"))
        XCTAssertThrowsError(try FirecrawlAPI.parse(Data("{\"success\":false,\"error\":\"bad key\"}".utf8))) { e in
            XCTAssertEqual(e as? FirecrawlAPI.ScrapeError, .api("bad key"))
        }
        XCTAssertThrowsError(try FirecrawlAPI.parse(Data("{\"success\":true,\"data\":{\"markdown\":\"  \"}}".utf8))) { e in
            XCTAssertEqual(e as? FirecrawlAPI.ScrapeError, .noContent)
        }
    }
}
