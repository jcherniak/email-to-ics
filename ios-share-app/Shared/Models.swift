import Foundation

struct SharedPayload: Codable, Equatable {
    var url: String
    var title: String?
    var selectedText: String?
    var createdAt: Date = .init()
}

struct ExtractedEvent: Codable {
    var summary: String
    var location: String
    var start_date: String
    var start_time: String?
    var end_date: String?
    var end_time: String?
    var description: String
    var timezone: String
    var url: String
}

struct Settings: Codable {
    var openRouterKey: String = ""
    var postmarkKey: String = ""
    var fromEmail: String = ""
    var toTentativeEmail: String = ""
    var toConfirmedEmail: String = ""
    var defaultModel: String = "openai/gpt-5"
    var reasoningEffort: ReasoningEffort = .medium
}

enum ReasoningEffort: String, Codable, CaseIterable, Identifiable {
    case none
    case low
    case medium
    case high
    var id: String { rawValue }
    var label: String {
        switch self {
        case .none: return "None"
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        }
    }
}
