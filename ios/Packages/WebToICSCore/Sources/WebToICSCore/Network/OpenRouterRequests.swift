import Foundation

/// Request builders and response decoding for OpenRouter. Transport is handled elsewhere
/// (a background `URLSession` in the app/extension) so everything here is pure and testable.
public enum OpenRouterAPI {
    public static let chatCompletionsURL = URL(string: "https://openrouter.ai/api/v1/chat/completions")!
    public static let modelsURL = URL(string: "https://openrouter.ai/api/v1/models")!
    public static let referer = "https://github.com/jcherniak/email-to-ics"
    public static let title = "WebToICS iOS"

    public struct Message: Equatable, Sendable {
        public var role: String
        public var content: String
        public init(role: String, content: String) {
            self.role = role
            self.content = content
        }
        public static func system(_ content: String) -> Message { Message(role: "system", content: content) }
        public static func user(_ content: String) -> Message { Message(role: "user", content: content) }
    }

    public static func request(url: URL, apiKey: String?, method: String = "GET") -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.setValue(referer, forHTTPHeaderField: "HTTP-Referer")
        request.setValue(title, forHTTPHeaderField: "X-Title")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if method != "GET" {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    /// Chat-completions body. `responseFormat` is the dictionary produced by `ExtractionSchema.responseFormat()`.
    public static func chatBody(model: String, messages: [Message], responseFormat: [String: Any]? = nil,
                                temperature: Double = 0.1, maxTokens: Int = 20000) throws -> Data {
        var body: [String: Any] = [
            "model": model,
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "temperature": temperature,
            "max_tokens": maxTokens,
        ]
        if let responseFormat {
            body["response_format"] = responseFormat
        }
        return try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
    }

    public static func chatRequest(model: String, messages: [Message], apiKey: String,
                                   responseFormat: [String: Any]? = nil,
                                   temperature: Double = 0.1, maxTokens: Int = 20000) throws -> (URLRequest, Data) {
        let data = try chatBody(model: model, messages: messages, responseFormat: responseFormat,
                                temperature: temperature, maxTokens: maxTokens)
        return (request(url: chatCompletionsURL, apiKey: apiKey, method: "POST"), data)
    }

    public static func modelsRequest(apiKey: String?) -> URLRequest {
        request(url: modelsURL, apiKey: apiKey)
    }

    // MARK: Responses

    public struct ChatResponse: Decodable {
        public struct Choice: Decodable {
            public struct Message: Decodable {
                public var content: String?
            }
            public var message: Message?
            public var finishReason: String?
            enum CodingKeys: String, CodingKey { case message, finishReason = "finish_reason" }
        }
        public struct APIError: Decodable {
            public var message: String?
            public var code: Int?
        }
        public var choices: [Choice]?
        public var error: APIError?
    }

    public enum ResponseError: Error, LocalizedError, Equatable {
        case api(String)
        case emptyContent
        case malformed(String)

        public var errorDescription: String? {
            switch self {
            case .api(let message): return "OpenRouter error: \(message)"
            case .emptyContent: return "OpenRouter returned no content."
            case .malformed(let detail): return "OpenRouter response could not be read: \(detail)"
            }
        }
    }

    /// Returns the assistant text of the first choice, with Markdown code fences removed.
    public static func content(from data: Data) throws -> String {
        let response: ChatResponse
        do {
            response = try JSONDecoder().decode(ChatResponse.self, from: data)
        } catch {
            let preview = String(decoding: data.prefix(300), as: UTF8.self)
            throw ResponseError.malformed(preview)
        }
        if let error = response.error, let message = error.message {
            throw ResponseError.api(message)
        }
        guard let raw = response.choices?.first?.message?.content else {
            throw ResponseError.emptyContent
        }
        let stripped = stripCodeFences(raw)
        guard !stripped.isEmpty else { throw ResponseError.emptyContent }
        return stripped
    }

    public static func stripCodeFences(_ text: String) -> String {
        var s = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("```") {
            if let newline = s.firstIndex(of: "\n") {
                s = String(s[s.index(after: newline)...])
            } else {
                s = String(s.dropFirst(3))
            }
            if s.hasSuffix("```") {
                s = String(s.dropLast(3))
            }
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
