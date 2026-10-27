import Foundation

/// Firecrawl v2 scrape endpoint, used only when the user configured a key and shared a bare URL.
/// Body mirrors the original shortcut, plus `html` so the raw-HTML retry has input.
public enum FirecrawlAPI {
    public static let scrapeURL = URL(string: "https://api.firecrawl.dev/v2/scrape")!

    public static func scrapeRequest(url: String, apiKey: String) throws -> (URLRequest, Data) {
        var request = URLRequest(url: scrapeURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let body: [String: Any] = [
            "url": url,
            "formats": ["markdown", "html"],
            "onlyMainContent": true,
            "maxAge": 3_600_000,
            "removeBase64Images": true,
        ]
        let data = try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
        return (request, data)
    }

    public struct ScrapeResponse: Decodable {
        public struct Payload: Decodable {
            public struct Metadata: Decodable {
                public var title: String?
                public var sourceURL: String?
                public var statusCode: Int?
            }
            public var markdown: String?
            public var html: String?
            public var rawHtml: String?
            public var metadata: Metadata?
        }
        public var success: Bool?
        public var data: Payload?
        public var error: String?
    }

    public enum ScrapeError: Error, LocalizedError, Equatable {
        case api(String)
        case noContent
        case malformed(String)
        public var errorDescription: String? {
            switch self {
            case .api(let m): return "Firecrawl error: \(m)"
            case .noContent: return "Firecrawl returned no page content."
            case .malformed(let d): return "Firecrawl response could not be read: \(d)"
            }
        }
    }

    public struct Scraped: Equatable, Sendable {
        public var markdown: String
        public var html: String?
        public var title: String?
    }

    public static func parse(_ data: Data) throws -> Scraped {
        let response: ScrapeResponse
        do {
            response = try JSONDecoder().decode(ScrapeResponse.self, from: data)
        } catch {
            throw ScrapeError.malformed(String(decoding: data.prefix(300), as: UTF8.self))
        }
        if response.success == false || response.data == nil {
            throw ScrapeError.api(response.error ?? "unknown error")
        }
        let markdown = response.data?.markdown?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !markdown.isEmpty else { throw ScrapeError.noContent }
        return Scraped(markdown: markdown,
                       html: response.data?.html ?? response.data?.rawHtml,
                       title: response.data?.metadata?.title)
    }
}
