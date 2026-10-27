import SwiftUI
import WebToICSCore

/// Request/response details for one job (the Chrome extension's "Request details" analogue).
struct JobDetailView: View {
    let job: ShareJob
    let events: [ResolvedEvent]

    private var store: FileJobStore { AppEnvironment.shared.store }

    var body: some View {
        List {
            Section("Job") {
                LabeledContent("Title", value: job.displayTitle)
                if let url = job.source.url { LabeledContent("URL", value: url).textSelection(.enabled) }
                LabeledContent("Stage", value: job.state.stage.displayName)
                LabeledContent("Status", value: job.state.status.rawValue)
                LabeledContent("Attempt", value: "\(job.state.attempt)\(job.state.retriedWithRawHTML ? " (raw HTML retry)" : "")")
                LabeledContent("Capture", value: "\(job.source.captureTier.rawValue)\(job.source.cleanMethod.map { " · \($0)" } ?? "")\(job.source.truncated ? " · truncated" : "")")
                LabeledContent("Model", value: job.options.model)
                LabeledContent("Destination", value: job.options.destination.displayName + (job.options.tentative ? " (tentative)" : ""))
                LabeledContent("Created", value: job.createdAt.formatted(date: .abbreviated, time: .shortened))
                if let error = job.state.lastError {
                    Text(error).foregroundStyle(.red).font(.caption)
                }
            }
            if !job.options.instructions.isEmpty {
                Section("Special instructions") { Text(job.options.instructions).font(.caption) }
            }
            if !events.isEmpty {
                Section("Events") {
                    ForEach(events) { event in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(event.event.summary).font(.subheadline).bold()
                            Text(EventRowView.timeText(for: event.event)).font(.caption)
                            Text(event.locationText).font(.caption2).foregroundStyle(.secondary)
                            if let provider = event.location?.provider {
                                Text("Location via \(provider)").font(.caption2).foregroundStyle(.tertiary)
                            }
                            Text(event.event.description).font(.caption2).foregroundStyle(.secondary).lineLimit(8)
                        }
                    }
                }
            }
            Section("Artifacts") {
                ForEach(artifactNames, id: \.self) { name in
                    NavigationLink(name) {
                        ArtifactView(title: name, text: store.readArtifactString(job: job.id, name: name) ?? "")
                    }
                }
            }
        }
        .navigationTitle("Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var artifactNames: [String] {
        let dir = store.jobDirectory(job.id)
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.filter { !$0.hasPrefix(".") }.sorted()
    }
}

struct ArtifactView: View {
    let title: String
    let text: String

    var body: some View {
        ScrollView {
            Text(text.isEmpty ? "(empty)" : String(text.prefix(200_000)))
                .font(.system(.caption2, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
