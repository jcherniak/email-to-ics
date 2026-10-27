import ActivityKit
import Foundation
import WebToICSCore
import os

/// Owns the single queue Live Activity for the current batch and mirrors its existence into `activity.json`
/// so the share extension knows whether to open the app.
@MainActor
final class LiveActivityController: ActivityUpdating {
    static let shared = LiveActivityController()

    private let store: FileJobStore
    private let logger = AppEnvironment.shared.logger
    private var activity: Activity<WebToICSActivityAttributes>?
    private var stateObservation: Task<Void, Never>?

    init(store: FileJobStore = AppEnvironment.shared.store) {
        self.store = store
    }

    nonisolated func reflect(jobs: [ShareJob], foreground: Bool) async {
        await reflectOnMain(jobs: jobs, foreground: foreground)
    }

    private func reflectOnMain(jobs: [ShareJob], foreground: Bool) async {
        let container = store.containerURL
        let flag = ActivityFlagStore.load(containerURL: container)
        let now = Date()
        let activeFlag = (flag?.isStale(now: now) == false) ? flag : nil
        let batchID = activeFlag?.batchID ?? jobs.filter { !$0.cleared && !$0.isDismissed }.map(\.batchID).last
        let batchJobs = jobs.filter { $0.batchID == batchID && !$0.cleared && !$0.isDismissed }
        let snapshot = BatchSnapshot.make(jobs: jobs, batchID: batchID)

        adoptExistingActivityIfNeeded(batchID: batchID)

        guard let batchID, snapshot.total > 0 else {
            await endActivity(final: nil, policy: .immediate)
            if flag?.activityID != nil || activeFlag == nil { ActivityFlagStore.clear(containerURL: container) }
            return
        }

        let state = Self.contentState(from: snapshot)
        let allSettled = batchJobs.allSatisfy(\.isSettled)

        if activity == nil {
            guard !allSettled else {
                ActivityFlagStore.clear(containerURL: container)
                return
            }
            let info = ActivityAuthorizationInfo()
            guard info.areActivitiesEnabled else {
                // Remember that activities are off so the extension stops bouncing to the app.
                try? ActivityFlagStore.save(ActivityFlag(batchID: batchID, activityID: nil, startedAt: activeFlag?.startedAt ?? now,
                                                         lastUpdated: now, disabled: true), containerURL: container)
                return
            }
            guard foreground else { return }
            do {
                let started = try Activity.request(
                    attributes: WebToICSActivityAttributes(batchID: batchID.uuidString),
                    content: ActivityContent(state: state, staleDate: now.addingTimeInterval(15 * 60)),
                    pushType: nil)
                activity = started
                observe(started)
                try? ActivityFlagStore.save(ActivityFlag(batchID: batchID, activityID: started.id, startedAt: activeFlag?.startedAt ?? now,
                                                         lastUpdated: now, disabled: false), containerURL: container)
                logger.info("started live activity \(started.id, privacy: .public) for batch \(batchID.uuidString, privacy: .public)")
            } catch {
                logger.error("could not start live activity: \(error.localizedDescription, privacy: .public)")
            }
            return
        }

        guard let activity else { return }
        if allSettled {
            await endActivity(final: state, policy: .after(now.addingTimeInterval(120)))
            ActivityFlagStore.clear(containerURL: container)
            return
        }
        await activity.update(ActivityContent(state: state, staleDate: now.addingTimeInterval(15 * 60)))
        if var current = activeFlag {
            current.activityID = activity.id
            current.lastUpdated = now
            current.disabled = false
            try? ActivityFlagStore.save(current, containerURL: container)
        } else {
            try? ActivityFlagStore.save(ActivityFlag(batchID: batchID, activityID: activity.id, startedAt: now, lastUpdated: now), containerURL: container)
        }
    }

    /// After a relaunch, pick up the activity the previous process started.
    private func adoptExistingActivityIfNeeded(batchID: UUID?) {
        guard activity == nil else { return }
        let candidates = Activity<WebToICSActivityAttributes>.activities
        if let batchID, let match = candidates.first(where: { $0.attributes.batchID == batchID.uuidString }) {
            activity = match
            observe(match)
        }
        // Any other leftover activities belong to finished batches.
        for stale in candidates where stale.id != activity?.id {
            Task { await stale.end(nil, dismissalPolicy: .immediate) }
        }
    }

    private func observe(_ activity: Activity<WebToICSActivityAttributes>) {
        stateObservation?.cancel()
        stateObservation = Task { [weak self] in
            for await state in activity.activityStateUpdates {
                guard let self else { return }
                if state == .dismissed || state == .ended {
                    await self.activityWentAway(activity.id)
                    return
                }
            }
        }
    }

    private func activityWentAway(_ id: String) {
        if activity?.id == id { activity = nil }
        let container = store.containerURL
        if let flag = ActivityFlagStore.load(containerURL: container), flag.activityID == id {
            ActivityFlagStore.clear(containerURL: container)
        }
    }

    private func endActivity(final: WebToICSActivityAttributes.ContentState?, policy: ActivityUIDismissalPolicy) async {
        guard let activity else { return }
        let content = final.map { ActivityContent(state: $0, staleDate: nil) }
        await activity.end(content, dismissalPolicy: policy)
        self.activity = nil
        stateObservation?.cancel()
        stateObservation = nil
    }

    static func contentState(from snapshot: BatchSnapshot) -> WebToICSActivityAttributes.ContentState {
        WebToICSActivityAttributes.ContentState(
            completed: snapshot.completed,
            total: snapshot.total,
            failed: snapshot.failed,
            progress: snapshot.progress,
            currentTitle: snapshot.currentTitle.map { String($0.prefix(60)) },
            currentStage: snapshot.currentStage,
            recent: snapshot.recent.prefix(6).map {
                WebToICSActivityAttributes.JobSummary(id: $0.id.uuidString, title: String($0.title.prefix(40)), state: $0.state)
            })
    }
}
