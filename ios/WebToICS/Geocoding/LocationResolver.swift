import Foundation
import WebToICSCore

/// Resolves the model's location text to a place name, address and coordinate.
protocol LocationResolver: Sendable {
    func resolve(query: String) async -> ResolvedLocation?
}

enum LocationResolution {
    static let timeout: TimeInterval = 8

    /// Geocodes every distinct location once and builds the resolved events for a job.
    static func resolveEvents(_ result: ExtractionResult, tentative: Bool, resolver: LocationResolver) async -> [ResolvedEvent] {
        var cache: [String: ResolvedLocation?] = [:]
        var resolved: [ResolvedEvent] = []
        for event in result.eventData {
            let lookup = result.locationLookup.trimmingCharacters(in: .whitespacesAndNewlines)
            let query = (lookup.isEmpty ? event.location : lookup).trimmingCharacters(in: .whitespacesAndNewlines)
            var location: ResolvedLocation? = nil
            if !query.isEmpty, !looksVirtual(query) {
                if let cached = cache[query] {
                    location = cached
                } else {
                    location = await withTimeout(timeout) { await resolver.resolve(query: query) }
                    cache[query] = location
                }
            }
            resolved.append(ResolvedEvent(event: event, location: location, tentative: tentative))
        }
        return resolved
    }

    static func looksVirtual(_ text: String) -> Bool {
        let lower = text.lowercased()
        return lower.hasPrefix("http") || lower.contains("zoom.us") || lower.contains("meet.google") || lower.contains("teams.microsoft")
            || lower == "online" || lower == "virtual"
    }

    static func withTimeout<T: Sendable>(_ seconds: TimeInterval, _ operation: @escaping @Sendable () async -> T?) async -> T? {
        await withTaskGroup(of: T?.self) { group in
            group.addTask { await operation() }
            group.addTask {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                return nil
            }
            let first = await group.next() ?? nil
            group.cancelAll()
            return first
        }
    }
}
