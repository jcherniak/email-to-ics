import Foundation
import WebToICSCore

/// Hook the stage coordinator uses to reflect job changes in the Live Activity. The real implementation
/// (ActivityKit) is installed by the app; tests and the placeholder use no-ops.
protocol ActivityUpdating: Sendable {
    /// Called after any job change. `foreground` tells whether a new activity may be started.
    func reflect(jobs: [ShareJob], foreground: Bool) async
}

struct NoopActivityUpdater: ActivityUpdating {
    func reflect(jobs: [ShareJob], foreground: Bool) async {}
}
