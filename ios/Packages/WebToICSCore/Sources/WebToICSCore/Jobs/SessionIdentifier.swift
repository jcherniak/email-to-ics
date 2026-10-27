import Foundation

/// Background `URLSession` identifier for one stage attempt of one job:
/// `com.justin-c.web-to-ics.job.<uuid>.<stage>.<attempt>`. Unique per attempt so a retry never reuses a session.
public struct SessionIdentifier: RawRepresentable, Hashable, Codable, Sendable, CustomStringConvertible {
    public var jobID: UUID
    public var stage: JobStage
    public var attempt: Int

    public init(jobID: UUID, stage: JobStage, attempt: Int) {
        self.jobID = jobID
        self.stage = stage
        self.attempt = attempt
    }

    public init?(rawValue: String) {
        guard rawValue.hasPrefix(AppIdentifiers.backgroundSessionPrefix) else { return nil }
        let rest = rawValue.dropFirst(AppIdentifiers.backgroundSessionPrefix.count)
        let parts = rest.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3, let id = UUID(uuidString: String(parts[0])),
              let stage = JobStage(rawValue: String(parts[1])), let attempt = Int(parts[2]), attempt > 0 else { return nil }
        self.init(jobID: id, stage: stage, attempt: attempt)
    }

    public var rawValue: String {
        "\(AppIdentifiers.backgroundSessionPrefix)\(jobID.uuidString).\(stage.rawValue).\(attempt)"
    }

    public var description: String { rawValue }

    public static func isOurs(_ identifier: String) -> Bool {
        identifier.hasPrefix(AppIdentifiers.backgroundSessionPrefix)
    }
}
