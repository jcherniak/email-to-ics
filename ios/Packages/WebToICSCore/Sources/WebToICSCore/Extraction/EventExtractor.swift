import Foundation

public enum ExtractionError: Error, LocalizedError, Equatable {
    case http(Int, String)
    case transport(String)
    case invalidJSON(String)
    case modelReportedFailure(String)
    case noEvents

    public var errorDescription: String? {
        switch self {
        case .http(let code, let body): return "HTTP \(code): \(body)"
        case .transport(let message): return message
        case .invalidJSON(let detail): return "Model returned invalid JSON: \(detail)"
        case .modelReportedFailure(let message): return message.isEmpty ? "The model found no event." : message
        case .noEvents: return "No events with dates were found."
        }
    }

    /// Failures that are worth a second attempt with the raw page HTML.
    public var isRetryableWithRawHTML: Bool {
        switch self {
        case .invalidJSON, .modelReportedFailure, .noEvents: return true
        case .http(let code, _): return code >= 500 || code == 429
        case .transport: return false
        }
    }
}

/// Builds the network request for an extraction and interprets the reply. Transport is external so the same
/// code serves the share extension (background upload) and the app (handling the completed upload).
public protocol EventExtractor: Sendable {
    var displayName: String { get }
    func makeRequest(_ request: ExtractionRequest, model: String, apiKey: String) throws -> (URLRequest, Data)
    func parse(_ body: Data) throws -> ExtractionResult
}
