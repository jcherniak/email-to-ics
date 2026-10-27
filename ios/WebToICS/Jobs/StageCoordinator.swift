import Foundation
import UIKit
import WebToICSCore
import os

/// App-side driver of the job pipeline: handles finished background transfers (from a wake or while running),
/// geocodes, rescans the queue on foreground, and reflects everything into the Live Activity and the UI.
actor StageCoordinator {
    static let shared = StageCoordinator(environment: .shared)

    private let env: AppEnvironment
    private var activityUpdater: ActivityUpdating = NoopActivityUpdater()
    private var geocodingJobs: Set<UUID> = []

    init(environment: AppEnvironment) {
        self.env = environment
    }

    func setActivityUpdater(_ updater: ActivityUpdating) {
        activityUpdater = updater
    }

    // MARK: Transfer results

    func handle(_ result: TransferResult) async {
        let runner = env.makeRunner()
        do {
            let outcome = try runner.handle(result)
            switch outcome {
            case .needsGeocode(let extraction):
                await geocode(jobID: result.identifier.jobID, result: extraction, runner: runner)
            case .advanced(let next):
                if case .needsGeocode = next, let extraction = runner.loadResult(result.identifier.jobID) {
                    await geocode(jobID: result.identifier.jobID, result: extraction, runner: runner)
                }
            case .failed(let message):
                env.logger.error("job \(result.identifier.jobID.uuidString, privacy: .public) failed: \(message, privacy: .public)")
            case .ignored:
                env.logger.debug("ignored stale result \(result.identifier.rawValue, privacy: .public)")
            }
        } catch {
            env.logger.error("handle failed: \(error.localizedDescription, privacy: .public)")
        }
        await changed()
    }

    private func geocode(jobID: UUID, result: ExtractionResult, runner: StageRunner) async {
        guard !geocodingJobs.contains(jobID) else { return }
        geocodingJobs.insert(jobID)
        defer { geocodingJobs.remove(jobID) }
        let tentative = (try? env.store.load(jobID))?.options.tentative ?? true
        let resolved = await LocationResolution.resolveEvents(result, tentative: tentative, resolver: env.locationResolver)
        do {
            try runner.markGeocoded(jobID, resolved: resolved)
        } catch {
            env.logger.error("markGeocoded failed: \(error.localizedDescription, privacy: .public)")
            try? runner.markGeocodeSkipped(jobID, result: result, tentative: tentative)
        }
    }

    // MARK: Rescan

    /// Picks up anything the extension or an earlier wake left pending.
    func rescan(reason: String) async {
        let runner = env.makeRunner()
        let jobs = (try? env.store.all(includeCleared: false)) ?? []
        for job in jobs where !job.isDismissed && !job.cleared {
            switch (job.state.stage, job.state.status) {
            case (.capture, .pending), (.extract, .pending):
                do {
                    let outcome = try runner.startNextStage(job.id)
                    if case .needsGeocode = outcome, let extraction = runner.loadResult(job.id) {
                        await geocode(jobID: job.id, result: extraction, runner: runner)
                    }
                } catch {
                    env.logger.error("rescan start failed for \(job.id.uuidString, privacy: .public): \(error.localizedDescription, privacy: .public)")
                }
            case (.geocode, .pending):
                if let extraction = runner.loadResult(job.id) {
                    await geocode(jobID: job.id, result: extraction, runner: runner)
                } else {
                    try? runner.markTransferLost(job.id)
                }
            case (_, .inFlight):
                await checkInFlight(job, runner: runner)
            default:
                break
            }
        }
        env.logger.info("rescan (\(reason, privacy: .public)) over \(jobs.count) jobs")
        await changed()
    }

    /// Reattaches to the background session; if it has no task left and nothing arrived, the transfer is lost.
    private func checkInFlight(_ job: ShareJob, runner: StageRunner) async {
        guard let identifier = job.state.sessionIdentifier else { return }
        BackgroundTransferCenter.shared.reconnectIfNeeded(identifier: identifier)
        let tasks = await BackgroundTransferCenter.shared.taskCount(identifier: identifier)
        guard tasks == 0 else { return }
        // Give replayed delegate events a moment to land.
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        guard let fresh = try? env.store.load(job.id), fresh.state.status == .inFlight,
              fresh.state.sessionIdentifier == identifier,
              Date().timeIntervalSince(fresh.state.updatedAt) > 90 else { return }
        env.logger.notice("transfer lost for \(job.id.uuidString, privacy: .public); marking retryable")
        try? runner.markTransferLost(job.id)
    }

    // MARK: User actions

    func retry(_ id: UUID) async {
        let runner = env.makeRunner()
        do {
            let outcome = try runner.retry(id)
            if case .needsGeocode = outcome, let extraction = runner.loadResult(id) {
                await geocode(jobID: id, result: extraction, runner: runner)
            }
        } catch {
            env.logger.error("retry failed: \(error.localizedDescription, privacy: .public)")
        }
        await changed()
    }

    func dismiss(_ id: UUID) async {
        try? env.makeRunner().dismiss(id)
        await changed()
    }

    func markAdded(_ id: UUID) async {
        try? env.makeRunner().markAdded(id)
        await changed()
    }

    /// Hides added/dismissed/failed jobs from the Inbox and deletes their artifacts.
    func clearFinished() async {
        let jobs = (try? env.store.all(includeCleared: false)) ?? []
        for job in jobs where job.isSettled || job.isFailed {
            try? env.store.delete(job.id)
        }
        await changed()
    }

    func deleteJob(_ id: UUID) async {
        try? env.store.delete(id)
        await changed()
    }

    // MARK: Notifications

    private func changed() async {
        let jobs = (try? env.store.all(includeCleared: false)) ?? []
        let foreground = await MainActor.run { UIApplication.shared.applicationState == .active }
        await activityUpdater.reflect(jobs: jobs, foreground: foreground)
        await MainActor.run {
            NotificationCenter.default.post(name: .webToICSJobsChanged, object: nil)
        }
    }
}
