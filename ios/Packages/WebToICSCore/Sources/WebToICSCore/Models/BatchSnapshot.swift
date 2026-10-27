import Foundation

/// Stage weights for progress estimation (user guidance: the AI call takes ~5x a Firecrawl fetch).
public enum StageWeights {
    public static let capture = 1.0
    public static let extract = 5.0
    public static let retry = 5.0
    public static let geocode = 0.5

    public static func weight(of stage: JobStage) -> Double {
        switch stage {
        case .capture: return capture
        case .extract: return extract
        case .geocode: return geocode
        case .ready, .added: return 0
        }
    }

    public static func totalWeight(for job: ShareJob) -> Double {
        capture + extract + geocode + (job.state.retriedWithRawHTML ? retry : 0)
    }

    public static func completedWeight(for job: ShareJob) -> Double {
        if job.isDone { return totalWeight(for: job) }
        var done = job.state.completedStages.reduce(0) { $0 + weight(of: $1) }
        // A retry only counts once the second extraction attempt finished.
        if job.state.retriedWithRawHTML, job.state.completedStages.contains(.extract) { done += retry }
        return min(done, totalWeight(for: job))
    }
}

/// Aggregate view of one batch, used by the Live Activity and the Inbox header.
public struct BatchSnapshot: Equatable, Sendable {
    public struct JobSummary: Equatable, Sendable {
        public var id: UUID
        public var title: String
        public var state: String
    }

    public var batchID: UUID?
    public var total: Int
    public var completed: Int
    public var failed: Int
    public var inProgress: Int
    public var progress: Double
    public var currentTitle: String?
    public var currentStage: String?
    public var recent: [JobSummary]

    public static let empty = BatchSnapshot(batchID: nil, total: 0, completed: 0, failed: 0, inProgress: 0,
                                            progress: 0, currentTitle: nil, currentStage: nil, recent: [])

    public var isFinished: Bool { total > 0 && inProgress == 0 }
    public var percent: Int { Int((progress * 100).rounded()) }
    public var headline: String { "\(completed) of \(total) done · \(percent)%" }

    public static func make(jobs allJobs: [ShareJob], batchID: UUID? = nil, recentLimit: Int = 6) -> BatchSnapshot {
        var jobs = allJobs.filter { !$0.cleared && !$0.isDismissed }
        if let batchID { jobs = jobs.filter { $0.batchID == batchID } }
        guard !jobs.isEmpty else { return .empty }
        let totalWeight = jobs.reduce(0) { $0 + StageWeights.totalWeight(for: $1) }
        let doneWeight = jobs.reduce(0) { $0 + StageWeights.completedWeight(for: $1) }
        let current = jobs.filter(\.isInProgress).sorted { $0.createdAt < $1.createdAt }.first
        let recent = jobs.sorted { $0.state.updatedAt > $1.state.updatedAt }.prefix(recentLimit).map { job in
            JobSummary(id: job.id, title: String(job.displayTitle.prefix(40)), state: stateLabel(job))
        }
        return BatchSnapshot(
            batchID: batchID ?? jobs.first?.batchID,
            total: jobs.count,
            completed: jobs.filter(\.isDone).count,
            failed: jobs.filter(\.isFailed).count,
            inProgress: jobs.filter(\.isInProgress).count,
            progress: totalWeight > 0 ? min(1, doneWeight / totalWeight) : 0,
            currentTitle: current?.displayTitle,
            currentStage: current?.state.stage.displayName,
            recent: Array(recent))
    }

    static func stateLabel(_ job: ShareJob) -> String {
        if job.isFailed { return "Failed" }
        if job.isAdded { return "Added" }
        if job.isReady { return "Ready" }
        return job.state.stage.displayName
    }
}
