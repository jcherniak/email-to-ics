import Foundation
import Observation
import WebToICSCore

/// Inbox state: jobs grouped by status, resolved events per ready job, and the user's event selection.
@MainActor
@Observable
final class JobsModel {
    var jobs: [ShareJob] = []
    var resolved: [UUID: [ResolvedEvent]] = [:]
    var selectedEventIDs: Set<UUID> = []
    var snapshot: BatchSnapshot = .empty
    var pendingDeepLink: DeepLink?
    var showSettings = false
    var focusedJobID: UUID?

    private var seenJobIDs: Set<UUID> = []
    private var observer: NSObjectProtocol?

    init() {
        observer = NotificationCenter.default.addObserver(forName: .webToICSJobsChanged, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.reload() }
        }
    }

    func reload() {
        let env = AppEnvironment.shared
        let all = (try? env.store.all(includeCleared: false)) ?? []
        jobs = all.filter { !$0.isDismissed }.sorted { $0.createdAt > $1.createdAt }
        let runner = env.makeRunner()
        var resolvedMap: [UUID: [ResolvedEvent]] = [:]
        for job in jobs where job.isReady || job.isAdded {
            if let events = runner.loadResolved(job.id) {
                resolvedMap[job.id] = events
                if !seenJobIDs.contains(job.id), job.isReady {
                    // New ready job: everything selected by default.
                    selectedEventIDs.formUnion(events.map(\.id))
                    seenJobIDs.insert(job.id)
                }
            }
        }
        resolved = resolvedMap
        let liveIDs = Set(resolvedMap.values.flatMap { $0.map(\.id) })
        selectedEventIDs = selectedEventIDs.intersection(liveIDs)
        snapshot = BatchSnapshot.make(jobs: all)
    }

    var inProgress: [ShareJob] { jobs.filter(\.isInProgress) }
    var ready: [ShareJob] { jobs.filter(\.isReady) }
    var added: [ShareJob] { jobs.filter(\.isAdded) }
    var failed: [ShareJob] { jobs.filter(\.isFailed) }
    var hasFinished: Bool { !added.isEmpty || !failed.isEmpty }

    func events(for job: ShareJob) -> [ResolvedEvent] { resolved[job.id] ?? [] }

    func isSelected(_ event: ResolvedEvent) -> Bool { selectedEventIDs.contains(event.id) }

    func toggle(_ event: ResolvedEvent) {
        if selectedEventIDs.contains(event.id) { selectedEventIDs.remove(event.id) } else { selectedEventIDs.insert(event.id) }
    }

    func setAll(_ selected: Bool, in job: ShareJob) {
        let ids = events(for: job).map(\.id)
        if selected { selectedEventIDs.formUnion(ids) } else { selectedEventIDs.subtract(ids) }
    }

    /// Selected events of ready jobs, grouped by job in inbox order.
    var selectedByJob: [(job: ShareJob, events: [ResolvedEvent])] {
        ready.compactMap { job in
            let chosen = events(for: job).filter { selectedEventIDs.contains($0.id) }
            return chosen.isEmpty ? nil : (job, chosen)
        }
    }

    var selectedCount: Int { selectedByJob.reduce(0) { $0 + $1.events.count } }

    func handle(_ link: DeepLink) {
        pendingDeepLink = link
        switch link {
        case .settings: showSettings = true
        case .job(let id): focusedJobID = id
        case .batch: break
        }
    }

    func retry(_ job: ShareJob) { Task { await StageCoordinator.shared.retry(job.id) } }
    func dismiss(_ job: ShareJob) { Task { await StageCoordinator.shared.dismiss(job.id) } }
    func delete(_ job: ShareJob) { Task { await StageCoordinator.shared.deleteJob(job.id) } }
    func clearFinished() { Task { await StageCoordinator.shared.clearFinished() } }
    func rescan() { Task { await StageCoordinator.shared.rescan(reason: "manual") } }
}
