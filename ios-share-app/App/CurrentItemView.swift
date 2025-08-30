import SwiftUI

struct CurrentItemView: View {
    @EnvironmentObject var app: AppState
    @State private var manualURL: String = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Share Input") {
                    if let p = app.payload {
                        Text(p.url).font(.footnote).lineLimit(3)
                        if let t = p.selectedText, !t.isEmpty { Text("Selected: \(t)").font(.footnote).lineLimit(3) }
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
                        Button("Dismiss Item (Clear from Queue)") { app.dismissCurrentItem() }
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Email to ICS")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { app.dismissCurrentItem() }
                }
            }
        }
    }

    private func process() {
        Task { await app.runPipeline() }
    }

    private func shareICS() {
        guard !app.icsData.isEmpty else { return }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("event.ics")
        try? app.icsData.write(to: tmp)
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
                if let id = app.currentQueueItemID { app.removeQueueItem(id: id) }
                app.showCurrentDialog = false
            } catch {
                await MainActor.run { app.status = "Email failed: \(error.localizedDescription)" }
            }
        }
    }

    #if canImport(UIKit)
    private func addToCalendar() {
        guard let first = app.events.first else { return }
        CalendarHelper.shared.addToCalendar(from: first) { _ in }
    }
    #endif

    #if canImport(AppKit)
    private func addToCalendarMac() {
        guard let first = app.events.first else { return }
        MacCalendarHelper.shared.addToCalendar(from: first) { _ in }
    }
    #endif
}

