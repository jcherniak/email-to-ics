import Foundation

struct SharedPayload: Codable {
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
}

