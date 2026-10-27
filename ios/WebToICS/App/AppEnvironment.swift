import Foundation
import os
import WebToICSCore

extension Notification.Name {
    /// Posted on the main queue whenever jobs changed on disk (wake, rescan, user action).
    static let webToICSJobsChanged = Notification.Name("WebToICS.jobsChanged")
    /// Posted when a deep link asks the UI to show something (payload: `DeepLink`).
    static let webToICSDeepLink = Notification.Name("WebToICS.deepLink")
}

/// Process-wide services for the app target.
final class AppEnvironment: @unchecked Sendable {
    static let shared = AppEnvironment()

    let logger = Logger(subsystem: AppIdentifiers.appBundleID, category: "app")
    let store: FileJobStore
    let settings: AppSettings
    let secrets: SecretStore
    let locationResolver: LocationResolver

    private init() {
        if let group = FileJobStore.appGroup() {
            store = group
        } else {
            // Should not happen with the App Group entitlement; keep the app usable for debugging.
            let fallback = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("WebToICS", isDirectory: true)
            store = FileJobStore(containerURL: fallback)
        }
        settings = AppSettings.shared()
        secrets = KeychainStore()
        locationResolver = MapKitLocationResolver()
    }

    private var bootstrapped = false

    /// Wires the background transfer center to the stage coordinator. Idempotent.
    func bootstrap() {
        guard !bootstrapped else { return }
        bootstrapped = true
        let logger = self.logger
        BackgroundTransferCenter.shared.log = { message in logger.info("transfer: \(message, privacy: .public)") }
        BackgroundTransferCenter.shared.onResult = { result in
            await StageCoordinator.shared.handle(result)
        }
        Task { @MainActor in
            await StageCoordinator.shared.setActivityUpdater(LiveActivityController.shared)
        }
        if settings.debugShortResourceTimeout {
            BackgroundTransferCenter.shared.resourceTimeout = 60
            logger.notice("debugShortResourceTimeout is on; background resource timeout lowered to 60 s")
        }
    }

    func makeRunner() -> StageRunner {
        StageRunner(store: store, settings: settings.stageSettings, secrets: secrets.snapshot(),
                    transfer: BackgroundTransferCenter.shared)
    }
}
