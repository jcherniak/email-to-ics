import Foundation
import os

enum AppGroup {
    // Replace with your real App Group ID
    static let identifier = "group.com.tls.email-to-ics"

    static func containerURL() -> URL {
        if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) {
            Log.general.info("AppGroup: containerURL=\(url.path, privacy: .public)")
            return url
        }

        // Graceful fallback: don't crash if entitlements are missing/misconfigured during dev.
        // Use Application Support inside the app/extension sandbox so the app can still run.
        let fm = FileManager.default
        let support = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let fallback = support.appendingPathComponent("AppGroupFallback", isDirectory: true)
        do {
            try fm.createDirectory(at: fallback, withIntermediateDirectories: true)
            Log.general.error("AppGroup: container missing for id=\(identifier, privacy: .public); using fallback=\(fallback.path, privacy: .public)")
        } catch {
            Log.general.error("AppGroup: failed to create fallback dir: \(error.localizedDescription)")
        }
        return fallback
    }

    static var sharedPayloadURL: URL {
        let url = containerURL().appendingPathComponent("shared-payload.json")
        Log.general.debug("AppGroup: sharedPayloadURL=\(url.path, privacy: .public)")
        return url
    }
}
