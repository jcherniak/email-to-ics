import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

/// Lock Screen / banner and Dynamic Island presentations of the batch queue.
struct QueueLiveActivity: Widget {
    private let deepLink = URL(string: "webtoics://batch")!

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WebToICSActivityAttributes.self) { context in
            LockScreenView(state: context.state, isStale: context.isStale)
                .activityBackgroundTint(Color(uiColor: .systemBackground).opacity(0.85))
                .activitySystemActionForegroundColor(.accentColor)
                .widgetURL(deepLink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.title2)
                        .foregroundStyle(.tint)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.completed)/\(context.state.total)")
                        .font(.title3.monospacedDigit())
                        .fontWeight(.semibold)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(Headline.text(context.state))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        ProgressView(value: context.state.progress)
                            .tint(context.state.failed > 0 ? .orange : .accentColor)
                        if let title = context.state.currentTitle {
                            Text("\(context.state.currentStage ?? "Working"): \(title)")
                                .font(.caption2)
                                .lineLimit(1)
                        } else if context.state.failed > 0 {
                            Text("\(context.state.failed) failed · tap to review")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        } else {
                            Text("Ready to review · tap to open")
                                .font(.caption2)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                ProgressRing(progress: context.state.progress, failed: context.state.failed > 0)
                    .frame(width: 18, height: 18)
            } compactTrailing: {
                Text("\(context.state.completed)/\(context.state.total)")
                    .font(.caption2.monospacedDigit())
                    .fontWeight(.semibold)
            } minimal: {
                ProgressRing(progress: context.state.progress, failed: context.state.failed > 0)
                    .frame(width: 18, height: 18)
            }
            .widgetURL(deepLink)
            .keylineTint(.accentColor)
        }
    }
}

private enum Headline {
    static func text(_ state: WebToICSActivityAttributes.ContentState) -> String {
        let percent = Int((state.progress * 100).rounded())
        return "\(state.completed) of \(state.total) done · \(percent)%"
    }
}

private struct ProgressRing: View {
    let progress: Double
    let failed: Bool

    var body: some View {
        ZStack {
            Circle().stroke(Color.secondary.opacity(0.3), lineWidth: 3)
            Circle()
                .trim(from: 0, to: max(0.02, min(1, progress)))
                .stroke(failed ? Color.orange : Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .accessibilityLabel("\(Int((progress * 100).rounded())) percent complete")
    }
}

private struct LockScreenView: View {
    let state: WebToICSActivityAttributes.ContentState
    let isStale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Label("Web to ICS", systemImage: "calendar.badge.plus")
                    .font(.headline)
                Spacer()
                Text(Headline.text(state))
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: state.progress)
                .tint(state.failed > 0 ? .orange : .accentColor)
            if let title = state.currentTitle {
                HStack(spacing: 6) {
                    ProgressView().controlSize(.mini)
                    Text("\(state.currentStage ?? "Working"): \(title)")
                        .font(.caption)
                        .lineLimit(1)
                }
            } else if state.failed > 0 {
                Label("\(state.failed) failed · tap to retry", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.orange)
            } else {
                Label("All pages analyzed · tap to review and add", systemImage: "checkmark.circle")
                    .font(.caption)
                    .foregroundStyle(.green)
            }
            if !state.recent.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(state.recent.prefix(3), id: \.id) { job in
                        HStack(spacing: 6) {
                            Image(systemName: symbol(for: job.state))
                                .font(.caption2)
                                .foregroundStyle(color(for: job.state))
                            Text(job.title).font(.caption2).lineLimit(1)
                            Spacer()
                            Text(job.state).font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            if isStale {
                Text("Waiting for updates…").font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(14)
    }

    private func symbol(for state: String) -> String {
        switch state {
        case "Ready": return "calendar.badge.checkmark"
        case "Added": return "checkmark.circle.fill"
        case "Failed": return "exclamationmark.triangle.fill"
        default: return "circle.dotted"
        }
    }

    private func color(for state: String) -> Color {
        switch state {
        case "Ready": return .blue
        case "Added": return .green
        case "Failed": return .red
        default: return .secondary
        }
    }
}
