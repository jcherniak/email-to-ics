import Foundation

/// Top-level model response. `eventData` is requested as an array (1...10) but a single object or a
/// legacy `events` key is accepted when decoding.
public struct ExtractionResult: Codable, Equatable, Sendable {
    public var success: Bool
    public var errorMessage: String
    public var eventData: [ExtractedEvent]
    public var emailSubject: String
    public var locationLookup: String

    public init(success: Bool = true, errorMessage: String = "", eventData: [ExtractedEvent],
                emailSubject: String = "", locationLookup: String = "") {
        self.success = success
        self.errorMessage = errorMessage
        self.eventData = eventData
        self.emailSubject = emailSubject
        self.locationLookup = locationLookup
    }

    enum CodingKeys: String, CodingKey {
        case success, errorMessage, eventData, events, emailSubject, locationLookup
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        success = try c.decodeIfPresent(Bool.self, forKey: .success) ?? true
        errorMessage = try c.decodeIfPresent(String.self, forKey: .errorMessage) ?? ""
        if let array = try? c.decode([ExtractedEvent].self, forKey: .eventData) {
            eventData = array
        } else if let single = try? c.decode(ExtractedEvent.self, forKey: .eventData) {
            eventData = [single]
        } else if let legacy = try? c.decode([ExtractedEvent].self, forKey: .events) {
            eventData = legacy
        } else {
            eventData = []
        }
        emailSubject = try c.decodeIfPresent(String.self, forKey: .emailSubject) ?? ""
        locationLookup = try c.decodeIfPresent(String.self, forKey: .locationLookup) ?? ""
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(success, forKey: .success)
        try c.encode(errorMessage, forKey: .errorMessage)
        try c.encode(eventData, forKey: .eventData)
        try c.encode(emailSubject, forKey: .emailSubject)
        try c.encode(locationLookup, forKey: .locationLookup)
    }

    /// Events that carry at least a title and a start.
    public var usableEvents: [ExtractedEvent] { eventData.filter(\.hasUsableDates) }
}
