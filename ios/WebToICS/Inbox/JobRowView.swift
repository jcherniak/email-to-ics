import SwiftUI
import WebToICSCore

struct JobRowView: View {
    let job: ShareJob

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            statusIcon
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 3) {
                Text(job.displayTitle).font(.body).lineLimit(2)
                Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                if job.isFailed, let error = job.state.lastError {
                    Text(error).font(.caption2).foregroundStyle(.red).lineLimit(3)
                }
            }
            Spacer(minLength: 0)
            if job.isInProgress {
                ProgressView().controlSize(.small)
            }
        }
        .padding(.vertical, 2)
    }

    private var subtitle: String {
        var parts: [String] = []
        if job.isFailed {
            parts.append("Failed while \(job.state.stage.displayName.lowercased())")
        } else if job.isAdded {
            parts.append("Added to \(job.options.destination.displayName)")
        } else {
            parts.append(job.state.stage.displayName)
            if job.state.stage == .extract { parts.append(job.options.model) }
        }
        if let host = job.source.url.flatMap(URL.init(string:))?.host { parts.append(host) }
        parts.append(job.createdAt.formatted(.relative(presentation: .named)))
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private var statusIcon: some View {
        if job.isFailed {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
        } else if job.isAdded {
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
        } else if job.isReady {
            Image(systemName: "calendar.badge.checkmark").foregroundStyle(.blue)
        } else {
            Image(systemName: stageSymbol).foregroundStyle(.secondary)
        }
    }

    private var stageSymbol: String {
        switch job.state.stage {
        case .capture: return "doc.text.magnifyingglass"
        case .extract: return "sparkles"
        case .geocode: return "mappin.and.ellipse"
        case .ready, .added: return "calendar"
        }
    }
}
