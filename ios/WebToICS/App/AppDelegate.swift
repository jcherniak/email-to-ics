import UIKit
import WebToICSCore
import os

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        AppEnvironment.shared.bootstrap()
        return true
    }

    /// The system launches or wakes the app when a background transfer started by the share extension (or the
    /// app) finishes. Reconnect to that session; its delegate callbacks replay and `StageCoordinator` persists
    /// the outcome before the completion handler runs.
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String,
                     completionHandler: @escaping () -> Void) {
        AppEnvironment.shared.bootstrap()
        guard SessionIdentifier.isOurs(identifier) else {
            completionHandler()
            return
        }
        AppEnvironment.shared.logger.info("wake for background session \(identifier, privacy: .public)")
        BackgroundTransferCenter.shared.reconnect(identifier: identifier, completion: completionHandler)
        Task { await StageCoordinator.shared.rescan(reason: "wake") }
    }
}
