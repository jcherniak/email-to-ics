import ActivityKit
import Foundation

/// Attributes of the single "queue" Live Activity that tracks one batch of shared pages.
/// Compiled into both the app and the widget extension.
struct WebToICSActivityAttributes: ActivityAttributes {
    struct JobSummary: Codable, Hashable {
        var id: String
        var title: String
        var state: String
    }

    struct ContentState: Codable, Hashable {
        var completed: Int
        var total: Int
        var failed: Int
        /// Weighted completion 0...1 (capture 1, extraction 5, retry +5, geocode 0.5).
        var progress: Double
        var currentTitle: String?
        var currentStage: String?
        /// Most recent jobs, capped so the whole state stays under ActivityKit's 4 KB limit.
        var recent: [JobSummary]
    }

    var batchID: String
}
