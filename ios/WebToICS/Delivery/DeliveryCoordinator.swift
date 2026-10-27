import EventKit
import Foundation
import Observation
import WebToICSCore

struct DeliveryReport: Equatable {
    var added = 0
    var skipped = 0
    var failures: [String] = []

    var summary: String {
        var parts: [String] = []
        if added > 0 { parts.append("\(added) event\(added == 1 ? "" : "s") added") }
        if skipped > 0 { parts.append("\(skipped) skipped") }
        if !failures.isEmpty { parts.append("\(failures.count) failed") }
        return parts.isEmpty ? "Nothing to add." : parts.joined(separator: ", ")
    }
}

/// Runs the selected events through their jobs' destinations, one sheet at a time, and marks jobs as added.
@MainActor
@Observable
final class DeliveryCoordinator {
    var isRunning = false
    var activeEventEdit: EventEditRequest?
    var activeShare: ICSShareRequest?
    var report: DeliveryReport?

    private let env = AppEnvironment.shared
    private let eventStore = EKEventStore()
    private var editContinuation: CheckedContinuation<EKEventEditViewAction, Never>?
    private var shareContinuation: CheckedContinuation<Bool, Never>?
    private var lastSheetClosedAt: Date?

    func deliver(_ groups: [(job: ShareJob, events: [ResolvedEvent])]) async {
        guard !isRunning, !groups.isEmpty else { return }
        isRunning = true
        defer { isRunning = false }
        var report = DeliveryReport()
        var addedJobs: Set<UUID> = []

        // Apple Calendar: sequential edit sheets.
        let apple = groups.filter { $0.job.options.destination == .appleCalendar }
        if !apple.isEmpty {
            await AppleCalendarEvents.requestAccessIfNeeded(eventStore)
            for group in apple {
                var savedAny = false
                for resolved in group.events {
                    do {
                        let event = try AppleCalendarEvents.makeEvent(resolved, store: eventStore, defaultTimeZoneID: env.settings.defaultTimeZoneID)
                        let action = await presentEditSheet(event)
                        switch action {
                        case .saved: report.added += 1; savedAny = true
                        case .canceled, .deleted: report.skipped += 1
                        @unknown default: report.skipped += 1
                        }
                    } catch {
                        report.failures.append("\(resolved.event.summary): \(error.localizedDescription)")
                    }
                }
                if savedAny { addedJobs.insert(group.job.id) }
            }
        }

        // Google Calendar: API inserts.
        let google = groups.filter { $0.job.options.destination == .googleCalendar }
        for group in google {
            var savedAny = false
            for resolved in group.events {
                guard let calendarID = env.settings.googleCalendarID(tentative: resolved.tentative) else {
                    report.failures.append("\(resolved.event.summary): choose Google calendars in Settings")
                    continue
                }
                do {
                    _ = try await GoogleCalendarClient.shared.insert(resolved.deliverableEvent, tentative: resolved.tentative,
                                                                     calendarID: calendarID, defaultTimeZoneID: env.settings.defaultTimeZoneID)
                    report.added += 1
                    savedAny = true
                } catch {
                    report.failures.append("\(resolved.event.summary): \(error.localizedDescription)")
                }
            }
            if savedAny { addedJobs.insert(group.job.id) }
        }

        // ICS: one calendar with every selected event, then the share sheet.
        let ics = groups.filter { $0.job.options.destination == .icsFile }
        if !ics.isEmpty {
            let events = ics.flatMap(\.events)
            do {
                let calendar = try ICSGenerator().calendar(for: events, options: ICSGenerator.Options(defaultTimeZoneID: env.settings.defaultTimeZoneID))
                let url = try ICSFiles.write(calendar, suggestedTitle: events.count == 1 ? events[0].event.summary : "Events")
                let completed = await presentShareSheet(url)
                if completed {
                    report.added += events.count
                    addedJobs.formUnion(ics.map(\.job.id))
                } else {
                    report.skipped += events.count
                }
            } catch {
                report.failures.append("ICS: \(error.localizedDescription)")
            }
        }

        for id in addedJobs {
            await StageCoordinator.shared.markAdded(id)
        }
        self.report = report
    }

    // MARK: Sheet plumbing

    /// SwiftUI needs the previous sheet's dismissal animation to finish before presenting the next one.
    private func waitForPreviousSheet() async {
        if let closed = lastSheetClosedAt, Date().timeIntervalSince(closed) < 0.7 {
            try? await Task.sleep(nanoseconds: 700_000_000)
        }
    }

    private func presentEditSheet(_ event: EKEvent) async -> EKEventEditViewAction {
        await waitForPreviousSheet()
        return await withCheckedContinuation { continuation in
            editContinuation = continuation
            activeEventEdit = EventEditRequest(event: event, store: eventStore) { [weak self] action in
                self?.finishEdit(action)
            }
        }
    }

    func finishEdit(_ action: EKEventEditViewAction) {
        guard let continuation = editContinuation else { return }
        editContinuation = nil
        activeEventEdit = nil
        lastSheetClosedAt = Date()
        continuation.resume(returning: action)
    }

    /// Called from the sheet's onDismiss; handles swipe-to-dismiss where the delegate never fires.
    func editSheetDismissed() {
        if editContinuation != nil { finishEdit(.canceled) }
    }

    private func presentShareSheet(_ url: URL) async -> Bool {
        await waitForPreviousSheet()
        return await withCheckedContinuation { continuation in
            shareContinuation = continuation
            activeShare = ICSShareRequest(fileURL: url) { [weak self] completed in
                self?.finishShare(completed)
            }
        }
    }

    func finishShare(_ completed: Bool) {
        guard let continuation = shareContinuation else { return }
        shareContinuation = nil
        activeShare = nil
        lastSheetClosedAt = Date()
        continuation.resume(returning: completed)
    }

    func shareSheetDismissed() {
        if shareContinuation != nil { finishShare(false) }
    }
}
