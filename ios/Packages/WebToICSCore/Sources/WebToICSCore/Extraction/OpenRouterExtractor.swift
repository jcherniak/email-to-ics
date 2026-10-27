import Foundation

/// The only extractor: OpenRouter chat completions with a strict JSON schema.
public struct OpenRouterExtractor: EventExtractor {
    public var temperature: Double
    public var maxTokens: Int

    public init(temperature: Double = 0.1, maxTokens: Int = 20000) {
        self.temperature = temperature
        self.maxTokens = maxTokens
    }

    public var displayName: String { "OpenRouter" }

    public func messages(for request: ExtractionRequest) throws -> [OpenRouterAPI.Message] {
        let context = PromptContext(now: request.now, calendarTimeZone: TimeZone(identifier: request.defaultTimeZoneID) ?? .current,
                                    defaultTimeZoneID: request.defaultTimeZoneID, tentative: request.tentative)
        var messages: [OpenRouterAPI.Message] = [
            .system(try PromptBuilder.systemPrompt(context: context, customPrompt: request.customPrompt)),
        ]
        if let instructions = PromptBuilder.instructionsMessage(request.instructions) {
            messages.append(.user(instructions))
        }
        if let source = PromptBuilder.sourceMessage(url: request.sourceURL, title: request.pageTitle, siteName: request.siteName) {
            messages.append(.user(source))
        }
        messages.append(.user(PromptBuilder.contentMessage(text: request.pageText, isRawHTML: request.isRawHTML)))
        return messages
    }

    public func makeRequest(_ request: ExtractionRequest, model: String, apiKey: String) throws -> (URLRequest, Data) {
        try OpenRouterAPI.chatRequest(model: model, messages: try messages(for: request), apiKey: apiKey,
                                      responseFormat: ExtractionSchema.responseFormat(),
                                      temperature: temperature, maxTokens: maxTokens)
    }

    public func parse(_ body: Data) throws -> ExtractionResult {
        let content: String
        do {
            content = try OpenRouterAPI.content(from: body)
        } catch let error as OpenRouterAPI.ResponseError {
            switch error {
            case .api(let message): throw ExtractionError.transport("OpenRouter error: \(message)")
            case .emptyContent: throw ExtractionError.invalidJSON("empty response")
            case .malformed(let detail): throw ExtractionError.invalidJSON(detail)
            }
        }
        return try Self.parseContent(content)
    }

    /// Parses the assistant text (already stripped of fences) into an `ExtractionResult`.
    public static func parseContent(_ content: String) throws -> ExtractionResult {
        guard let data = content.data(using: .utf8) else { throw ExtractionError.invalidJSON("not UTF-8") }
        let result: ExtractionResult
        do {
            result = try JSONDecoder().decode(ExtractionResult.self, from: data)
        } catch {
            throw ExtractionError.invalidJSON(String(content.prefix(200)))
        }
        if !result.success {
            throw ExtractionError.modelReportedFailure(result.errorMessage)
        }
        guard !result.usableEvents.isEmpty else { throw ExtractionError.noEvents }
        var cleaned = result
        cleaned.eventData = result.usableEvents
        if cleaned.emailSubject.isEmpty { cleaned.emailSubject = cleaned.eventData[0].summary }
        return cleaned
    }
}
