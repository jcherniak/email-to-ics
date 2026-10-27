import Foundation

/// `activity.json` in the App Group: tells the share extension whether a batch/Live Activity is already
/// running (so it can stay in the host app) and which batch new jobs belong to.
public struct ActivityFlag: Codable, Equatable, Sendable {
    public static let staleAfter: TimeInterval = 6 * 60 * 60

    public var batchID: UUID
    /// ActivityKit activity id once the app started it; nil while a batch waits for the app to open.
    public var activityID: String?
    public var startedAt: Date
    public var lastUpdated: Date
    /// True when Live Activities are disabled for the app; the extension then never opens the app automatically.
    public var disabled: Bool

    public init(batchID: UUID, activityID: String? = nil, startedAt: Date = Date(), lastUpdated: Date = Date(), disabled: Bool = false) {
        self.batchID = batchID
        self.activityID = activityID
        self.startedAt = startedAt
        self.lastUpdated = lastUpdated
        self.disabled = disabled
    }

    public func isStale(now: Date = Date()) -> Bool {
        now.timeIntervalSince(lastUpdated) > Self.staleAfter
    }

    /// Decision for the share extension after enqueueing a job.
    public struct Decision: Equatable, Sendable {
        public var batchID: UUID
        public var shouldOpenApp: Bool
        public var flagToWrite: ActivityFlag?
    }

    /// - A fresh flag with a live activity: reuse the batch, stay in the host app.
    /// - A fresh flag without an activity (app not opened yet): reuse the batch, open the app again.
    /// - Missing or stale flag: start a new batch; open the app unless activities are disabled.
    public static func decide(existing: ActivityFlag?, now: Date = Date(), newBatchID: UUID = UUID()) -> Decision {
        if let existing, !existing.isStale(now: now) {
            if existing.disabled {
                return Decision(batchID: existing.batchID, shouldOpenApp: false, flagToWrite: nil)
            }
            return Decision(batchID: existing.batchID, shouldOpenApp: existing.activityID == nil, flagToWrite: nil)
        }
        let disabled = existing?.disabled ?? false
        let flag = ActivityFlag(batchID: newBatchID, activityID: nil, startedAt: now, lastUpdated: now, disabled: disabled)
        return Decision(batchID: newBatchID, shouldOpenApp: !disabled, flagToWrite: flag)
    }
}

public enum ActivityFlagStore {
    public static let fileName = "activity.json"

    public static func load(containerURL: URL) -> ActivityFlag? {
        let url = containerURL.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONCoding.decoder.decode(ActivityFlag.self, from: data)
    }

    public static func save(_ flag: ActivityFlag, containerURL: URL) throws {
        let data = try JSONCoding.encoder.encode(flag)
        try AtomicFile.write(data, to: containerURL.appendingPathComponent(fileName))
    }

    public static func clear(containerURL: URL) {
        try? FileManager.default.removeItem(at: containerURL.appendingPathComponent(fileName))
    }
}

/// Shared JSON configuration (ISO-8601 dates, stable key order).
public enum JSONCoding {
    public static var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.sortedKeys, .prettyPrinted]
        return e
    }

    public static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }
}
