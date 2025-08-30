import SwiftUI

struct ContentView: View {
    @EnvironmentObject var app: AppState
    @State private var manualURL: String = ""

    var body: some View {
        List {
            if !app.queue.isEmpty {
                Section("Processing Queue") {
                    ForEach(app.queue) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.payload.url).font(.footnote).lineLimit(2)
                            HStack(spacing: 8) {
                                Text(item.status.rawValue.capitalized).font(.caption)
                                if let err = item.errorMessage, !err.isEmpty {
                                    Text("• ").font(.caption)
                                    Text(err).font(.caption)
                                }
                            }
                            HStack {
                                Button(item.status == .failed ? "Retry" : "Process") {
                                    Task { await app.processQueueItem(item) }
                                }.disabled(app.isProcessing)
                                Button("Remove") { app.removeQueueItem(id: item.id) }
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
            }
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
                    Text("Paste a URL or use the Share Sheet.")
                    #if canImport(UIKit)
                    TextField("https://example.com", text: $manualURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                    #else
                    TextField("https://example.com", text: $manualURL)
                    #endif
                }
                Button("Process Now", action: process)
                    .disabled((app.payload == nil && manualURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) || app.isProcessing)
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
                    #if canImport(UIKit)
                    Button("Add to Calendar", action: addToCalendar)
                    #elseif canImport(AppKit)
                    Button("Add to Calendar", action: addToCalendarMac)
                    #endif
                    Button("Share ICS", action: shareICS)
                    Button("Send via Postmark", action: sendEmail)
                    if app.currentQueueItemID != nil {
                        Button("Dismiss Item (Clear from Queue)") { app.dismissCurrentItem() }
                            .foregroundColor(.red)
                    }
                }
            }

            SettingsSection()
        }
        .navigationTitle("Email to ICS")
    }

    private func process() {
        Log.general.info("UI: Process Now tapped")
        Task { await runPipeline() }
    }

    private func runPipeline() async {
        let urlString: String? = app.payload?.url ?? (manualURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : manualURL)
        guard let urlStr = urlString, let url = URL(string: urlStr) else { return }
        app.isProcessing = true
        defer { app.isProcessing = false }

        do {
            Log.general.info("Pipeline: start url=\(urlStr, privacy: .public) tentative=\(app.tentative) multiday=\(app.multiday) reviewFirst=\(app.reviewFirst)")
            Log.general.info("Pipeline: model=\(app.settings.defaultModel, privacy: .public) openrouterKey=\(Log.redactKey(app.settings.openRouterKey), privacy: .public)")
            await MainActor.run { app.status = "Loading page..." }
            let loader = WebLoader()
            let page = try await loader.load(url: url)
            Log.general.info("Pipeline: page html_len=\(page.html.count) image_present=\(page.jpegBase64 != nil)")

            await MainActor.run { app.status = "Analyzing content with AI..." }
            let ai = OpenRouterClient(apiKey: app.settings.openRouterKey)
            let events = try await ai.extract(
                pageHTML: page.html,
                sourceURL: urlStr,
                instructions: app.instructions,
                tentative: app.tentative,
                multiday: app.multiday,
                model: app.settings.defaultModel,
                reasoning: app.settings.reasoningEffort,
                jpegBase64: page.jpegBase64
            )
            Log.general.info("Pipeline: extracted events=\(events.count)")
            await MainActor.run {
                app.events = events
                app.status = "Generating ICS..."
            }

            let ics = ICSBuilder.build(events: events, organizerEmail: app.settings.fromEmail, tentative: app.tentative)
            Log.general.info("Pipeline: ICS size=\(ics.count) bytes (~\(ics.count/1024) KB)")
            await MainActor.run {
                app.icsData = ics
                app.status = "Ready"
            }
        } catch {
            Log.general.error("Pipeline: failed with error: \(error.localizedDescription)")
            await MainActor.run { app.status = "Error: \(error.localizedDescription)" }
        }
    }

    private func shareICS() {
        guard !app.icsData.isEmpty else { return }
        Log.general.info("UI: Share ICS tapped size=\(app.icsData.count)")
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("event.ics")
        do {
            try app.icsData.write(to: tmp)
            Log.general.info("UI: wrote temp ICS to \(tmp.path, privacy: .public)")
        } catch {
            Log.general.error("UI: failed writing temp ICS: \(error.localizedDescription)")
        }
        #if canImport(UIKit)
        let addCal = app.events.first.map { AddToCalendarActivity(event: $0) }
        let av = UIActivityViewController(activityItems: [tmp], applicationActivities: addCal != nil ? [addCal!] : nil)
        if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
           let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
            root.present(av, animated: true)
        }
        #elseif canImport(AppKit)
        NSWorkspace.shared.open(tmp)
        #endif
    }

    private func sendEmail() {
        Task {
            do {
                Log.general.info("UI: Send via Postmark tapped")
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
                Log.general.info("UI: Postmark send succeeded")
                // If this was from a queued item, clear it now
                if let id = app.currentQueueItemID { app.removeQueueItem(id: id) }
            } catch {
                await MainActor.run { app.status = "Email failed: \(error.localizedDescription)" }
                Log.general.error("UI: Postmark send failed: \(error.localizedDescription)")
            }
        }
    }

    #if canImport(UIKit)
    private func addToCalendar() {
        guard let first = app.events.first else { return }
        Log.general.info("UI: Add to Calendar tapped events=\(app.events.count)")
        CalendarHelper.shared.addToCalendar(from: first) { result in
            switch result {
            case .success:
                Log.general.info("Calendar: completed successfully")
            case .failure(let error):
                Log.general.error("Calendar: failed \(error.localizedDescription)")
                Task { @MainActor in app.status = "Calendar failed: \(error.localizedDescription)" }
            }
        }
    }
    #endif

    #if canImport(AppKit)
    private func addToCalendarMac() {
        guard let first = app.events.first else { return }
        Log.general.info("UI(macOS): Add to Calendar tapped events=\(app.events.count)")
        MacCalendarHelper.shared.addToCalendar(from: first) { result in
            switch result {
            case .success:
                Log.general.info("Mac Calendar: completed successfully")
            case .failure(let error):
                Log.general.error("Mac Calendar: failed \(error.localizedDescription)")
                Task { @MainActor in app.status = "Calendar failed: \(error.localizedDescription)" }
            }
        }
    }
    #endif
}

private struct SettingsSection: View {
    @EnvironmentObject var app: AppState
    @State private var show = false
    var body: some View {
        Section("Settings") {
            Button("Open Settings") { show = true }
                .sheet(isPresented: $show) {
                    #if os(macOS)
                    SettingsView().environmentObject(app)
                    #else
                    if #available(iOS 16.0, *) {
                        SettingsView()
                            .environmentObject(app)
                            .presentationDetents([.large])
                            .presentationDragIndicator(.visible)
                    } else {
                        SettingsView().environmentObject(app)
                    }
                    #endif
                }
        }
    }
}
