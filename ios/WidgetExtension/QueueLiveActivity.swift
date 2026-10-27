import ActivityKit
import SwiftUI
import WidgetKit

/// Minimal Live Activity scaffold; the full lock-screen and Dynamic Island layouts land in a later commit.
struct QueueLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WebToICSActivityAttributes.self) { context in
            VStack(alignment: .leading) {
                Text("Web to ICS")
                    .font(.headline)
                Text("\(context.state.completed) of \(context.state.total) done")
                ProgressView(value: context.state.progress)
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    Text("\(context.state.completed) of \(context.state.total) done")
                }
            } compactLeading: {
                ProgressView(value: context.state.progress).progressViewStyle(.circular)
            } compactTrailing: {
                Text("\(context.state.completed)/\(context.state.total)")
            } minimal: {
                ProgressView(value: context.state.progress).progressViewStyle(.circular)
            }
        }
    }
}
