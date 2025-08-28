import SwiftUI

struct ContentView: View {
    @EnvironmentObject var app: AppState

    var body: some View {
        List {
            Section("Share Input") {
                if let p = app.payload {
                    Text(p.url).font(.footnote).lineLimit(3)
                    if let t = p.selectedText, !t.isEmpty {
                        Text("Selected: \(t)").font(.footnote).lineLimit(3)
                    }
                    Toggle("Tentative", isOn: $app.tentative)
                    Toggle("Multiday", isOn: $app.multiday)
                    Toggle("Review before send", isOn: $app.reviewFirst)
                    TextField("Special instructions (optional)", text: $app.instructions, axis: .vertical)
                } else {
                    Text("Share a URL to this app using the Share Sheet. Look for ‘Create calendar event with AI’.")
                }
                Button("Process Now", action: process)
                    .disabled(app.payload == nil || app.isProcessing)
            }

            if app.isProcessing || !app.status.isEmpty {
                Section("Status") { Text(app.status).font(.footnote) }
            }

            if !app.events.isEmpty {
                Section("Extracted Events") {
                    ForEach(Array(app.events.enumerated()), id: \.0) { idx, e in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(idx+1). \(e.summary)").font(.headline)
                            if !e.location.isEmpty { Text(e.location).font(.subheadline) }
                            Text("Start: \(e.start_date) \(e.start_time ?? "")").font(.caption)
                            if let end = e.end_date { Text("End: \(end) \(e.end_time ?? "")").font(.caption) }
                            if !e.description.isEmpty { Text(e.description).font(.caption) }
                        }
                    }
                }
                Section {
                    Button("Share ICS", action: shareICS)
                    Button("Send via Postmark", action: sendEmail)
                }
            }

            SettingsSection()
        }
        .navigationTitle("Email to ICS")
    }

    private func process() {
        Task { await runPipeline() }
    }

    private func runPipeline() async {
        guard let p = app.payload, let url = URL(string: p.url) else { return }
        app.isProcessing = true
        defer { app.isProcessing = false }

        do {
            await MainActor.run { app.status = "Loading page..." }
            let loader = WebLoader()
            let page = try await loader.load(url: url)

            await MainActor.run { app.status = "Analyzing content with AI..." }
            let ai = OpenRouterClient(apiKey: app.settings.openRouterKey)
            let events = try await ai.extract(
                pageHTML: page.html,
                sourceURL: p.url,
                instructions: app.instructions,
                tentative: app.tentative,
                multiday: app.multiday,
                model: app.settings.defaultModel,
                jpegBase64: page.jpegBase64
            )
            await MainActor.run {
                app.events = events
                app.status = "Generating ICS..."
            }

            let ics = ICSBuilder.build(events: events, organizerEmail: app.settings.fromEmail, tentative: app.tentative)
            await MainActor.run {
                app.icsData = ics
                app.status = "Ready"
            }
        } catch {
            await MainActor.run { app.status = "Error: \(error.localizedDescription)" }
        }
    }

    private func shareICS() {
        guard !app.icsData.isEmpty else { return }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("event.ics")
        try? app.icsData.write(to: tmp)
        #if canImport(UIKit)
        let av = UIActivityViewController(activityItems: [tmp], applicationActivities: nil)
        UIApplication.shared.windows.first?.rootViewController?.present(av, animated: true)
        #elseif canImport(AppKit)
        NSWorkspace.shared.open(tmp)
        #endif
    }

    private func sendEmail() {
        Task {
            do {
                let postmark = PostmarkClient(apiKey: app.settings.postmarkKey)
                let to = app.tentative ? app.settings.toTentativeEmail : app.settings.toConfirmedEmail
                try await postmark.send(
                    from: app.settings.fromEmail,
                    to: to,
                    subject: app.events.count == 1 ? app.events[0].summary : "Calendar Events: \(app.events.count)",
                    body: "See attached ICS.",
                    icsData: app.icsData
                )
                await MainActor.run { app.status = "Email sent." }
            } catch {
                await MainActor.run { app.status = "Email failed: \(error.localizedDescription)" }
            }
        }
    }
}

private struct SettingsSection: View {
    @EnvironmentObject var app: AppState
    @State private var show = false
    var body: some View {
        Section("Settings") {
            Button("Open Settings") { show = true }
                .sheet(isPresented: $show) { SettingsView().environmentObject(app) }
        }
    }
}
