import Foundation

/// Builds the request of each network stage. Pure; bodies are written to disk by the runner.
public struct StageRequestFactory: Sendable {
    public var extractor: OpenRouterExtractor

    public init(extractor: OpenRouterExtractor = OpenRouterExtractor()) {
        self.extractor = extractor
    }

    public static let browserUserAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

    public func firecrawl(url: String, apiKey: String) throws -> (URLRequest, Data) {
        try FirecrawlAPI.scrapeRequest(url: url, apiKey: apiKey)
    }

    public func directFetch(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(Self.browserUserAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", forHTTPHeaderField: "Accept")
        request.setValue("en-US,en;q=0.9", forHTTPHeaderField: "Accept-Language")
        return request
    }

    public func extract(_ request: ExtractionRequest, model: String, apiKey: String) throws -> (URLRequest, Data) {
        try extractor.makeRequest(request, model: model, apiKey: apiKey)
    }
}
