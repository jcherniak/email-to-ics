import Foundation

public struct ResolvedLocation: Codable, Hashable, Sendable {
    public var displayName: String?
    public var formattedAddress: String?
    public var latitude: Double?
    public var longitude: Double?
    public var provider: String

    public init(displayName: String? = nil, formattedAddress: String? = nil, latitude: Double? = nil,
                longitude: Double? = nil, provider: String) {
        self.displayName = displayName
        self.formattedAddress = formattedAddress
        self.latitude = latitude
        self.longitude = longitude
        self.provider = provider
    }

    /// `"<place name>, <address>"` in the style of the backend's location combiner.
    public func combinedText(fallback: String) -> String {
        let name = displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let address = formattedAddress?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        switch (name.isEmpty, address.isEmpty) {
        case (true, true): return fallback
        case (false, true): return name
        case (true, false):
            let original = fallback.trimmingCharacters(in: .whitespacesAndNewlines)
            let originalName = original.split(separator: ",").first.map(String.init)?.trimmingCharacters(in: .whitespaces) ?? ""
            if !originalName.isEmpty, !address.lowercased().hasPrefix(originalName.lowercased()) {
                return "\(originalName), \(address)"
            }
            return address
        case (false, false):
            if address.lowercased().hasPrefix(name.lowercased()) { return address }
            return "\(name), \(address)"
        }
    }
}

/// An extracted event after geocoding, ready for delivery.
public struct ResolvedEvent: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var event: ExtractedEvent
    public var location: ResolvedLocation?
    public var tentative: Bool

    public init(id: UUID = UUID(), event: ExtractedEvent, location: ResolvedLocation? = nil, tentative: Bool) {
        self.id = id
        self.event = event
        self.location = location
        self.tentative = tentative
    }

    /// Location text to put on the calendar event.
    public var locationText: String {
        location?.combinedText(fallback: event.location) ?? event.location
    }

    /// The event with the resolved location folded into `location`.
    public var deliverableEvent: ExtractedEvent {
        var copy = event
        copy.location = locationText
        return copy
    }
}
