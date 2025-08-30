import SwiftUI
import Foundation

#if canImport(UIKit)
@main
struct EmailToICSApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
                    .environmentObject(appState)
            }
            .onOpenURL { url in
                Log.general.info("iOS App: onOpenURL host=\(url.host ?? "(nil)", privacy: .public) url=\(url.absoluteString, privacy: .public)")
                if url.host == "process-latest" {
                    appState.loadSharedPayload()
                }
            }
            .task {
                // Load settings on launch
                Log.general.info("iOS App: launching, loading settings & shared payload")
                await appState.loadSettings()
                appState.loadSharedPayload()
                Log.general.info("iOS App: ready")
            }
            .onChange(of: scenePhase) { _ , newPhase in
                Log.general.info("iOS App: scene phase=\(String(describing: newPhase))")
            }
        }
    }
}
#endif

final class AppState: ObservableObject {
    @Published var payload: SharedPayload?
    @Published var settings = Settings()
    @Published var isProcessing = false
    @Published var status: String = ""
    @Published var events: [ExtractedEvent] = []
    @Published var icsData: Data = Data()
    @Published var tentative: Bool = true
    @Published var multiday: Bool = false
    @Published var reviewFirst: Bool = true
    @Published var instructions: String = ""

    // Queue management
    @Published var queue: [QueueItem] = []
    @Published var currentQueueItemID: UUID? = nil

    func loadSharedPayload() {
        Log.general.info("AppState: loading shared payload from \(AppGroup.sharedPayloadURL.path, privacy: .public)")
        if let data = try? Data(contentsOf: AppGroup.sharedPayloadURL),
           let p = try? JSONDecoder().decode(SharedPayload.self, from: data) {
            Log.general.info("AppState: loaded payload url=\(p.url, privacy: .public) selected_len=\(p.selectedText?.count ?? 0)")
            DispatchQueue.main.async {
                self.payload = p
            }
        } else {
            Log.general.info("AppState: no payload found or decode failed")
        }
    }

    func loadSettings() async {
        Log.general.info("AppState: loadSettings() starting")
        let newSettings: Settings
        if let data = UserDefaults.standard.data(forKey: "iosSettings"),
           var decoded = try? JSONDecoder().decode(Settings.self, from: data) {
            decoded.openRouterKey = Keychain.get("openRouterKey") ?? ""
            decoded.postmarkKey = Keychain.get("postmarkKey") ?? ""
            Log.general.info("AppState: settings loaded (model=\(decoded.defaultModel, privacy: .public), from=\(decoded.fromEmail, privacy: .public)) key?=\(!decoded.openRouterKey.isEmpty) post?=\(!decoded.postmarkKey.isEmpty)")
            newSettings = decoded
        } else {
            var tmp = settings
            tmp.openRouterKey = Keychain.get("openRouterKey") ?? ""
            tmp.postmarkKey = Keychain.get("postmarkKey") ?? ""
            Log.general.info("AppState: no persisted settings; using defaults + keychain (key?=\(!tmp.openRouterKey.isEmpty))")
            newSettings = tmp
        }
        await MainActor.run { self.settings = newSettings }
        // Load queue after settings so we can render properly
        await MainActor.run { self.queue = QueueStore.load() }
    }

    func saveSettings() {
        // Persist non-secrets in UserDefaults; store secrets in iCloud Keychain
        var copy = settings
        let openKey = copy.openRouterKey
        let postKey = copy.postmarkKey
        copy.openRouterKey = ""
        copy.postmarkKey = ""
        if let data = try? JSONEncoder().encode(copy) {
            UserDefaults.standard.set(data, forKey: "iosSettings")
            Log.general.info("AppState: settings saved (model=\(copy.defaultModel, privacy: .public), from=\(copy.fromEmail, privacy: .public))")
        }
        do {
            try Keychain.set(openKey, for: "openRouterKey")
            try Keychain.set(postKey, for: "postmarkKey")
            Log.general.info("AppState: secrets saved to keychain (openrouter?=\(!openKey.isEmpty) postmark?=\(!postKey.isEmpty))")
        } catch {
            // Non-fatal; caller UI will still have keys in memory
            print("Keychain save error: \(error)")
            Log.general.error("AppState: keychain save error: \(error.localizedDescription)")
        }
    }

    // MARK: - Queue APIs
    func enqueueFromShare(_ payload: SharedPayload,
                          tentative: Bool,
                          multiday: Bool,
                          reviewFirst: Bool,
                          instructions: String) {
        let item = QueueItem(
            id: UUID(),
            payload: payload,
            tentative: tentative,
            multiday: multiday,
            reviewFirst: reviewFirst,
            instructions: instructions,
            defaultModel: settings.defaultModel,
            fromEmail: settings.fromEmail,
            toTentativeEmail: settings.toTentativeEmail,
            toConfirmedEmail: settings.toConfirmedEmail,
            status: .pending,
            errorMessage: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
        QueueStore.append(item)
        queue = QueueStore.load()
    }

    func removeQueueItem(id: UUID) {
        QueueStore.update { items in items.removeAll { $0.id == id } }
        queue = QueueStore.load()
        if currentQueueItemID == id { currentQueueItemID = nil }
    }

    func markQueueItem(_ id: UUID, status: QueueStatus, error: String? = nil) {
        QueueStore.update { items in
            if let i = items.firstIndex(where: { $0.id == id }) {
                items[i].status = status
                items[i].errorMessage = error
                items[i].updatedAt = Date()
            }
        }
        queue = QueueStore.load()
    }

    // Process a queued item using the existing pipeline
    func processQueueItem(_ item: QueueItem) async {
        currentQueueItemID = item.id
        await MainActor.run {
            // Prime UI with the queued payload + toggles
            self.payload = item.payload
            self.tentative = item.tentative
            self.multiday = item.multiday
            self.reviewFirst = item.reviewFirst
            self.instructions = item.instructions
        }
        markQueueItem(item.id, status: .processing)
        do {
            try await runPipelineInternal(sourceURLString: item.payload.url,
                                          tentative: item.tentative,
                                          multiday: item.multiday,
                                          reviewFirst: item.reviewFirst,
                                          instructions: item.instructions,
                                          model: item.defaultModel)

            if !item.reviewFirst {
                // Auto-send via Postmark using snapshot settings
                let postmark = PostmarkClient(apiKey: self.settings.postmarkKey)
                let to = item.tentative ? item.toTentativeEmail : item.toConfirmedEmail
                try await postmark.send(
                    from: item.fromEmail,
                    to: to,
                    subject: events.count == 1 ? events[0].summary : "Calendar Events: \(events.count)",
                    body: "See attached ICS.",
                    icsData: icsData
                )
                await MainActor.run { self.status = "Email sent." }
                removeQueueItem(id: item.id)
            } else {
                // Wait for user action (Send/Dismiss) to clear
                markQueueItem(item.id, status: .pending)
            }
        } catch {
            Log.general.error("Queue: processing failed: \(error.localizedDescription)")
            await MainActor.run { self.status = "Error: \(error.localizedDescription)" }
            markQueueItem(item.id, status: .failed, error: error.localizedDescription)
        }
    }

    // Public helpers for UI actions
    func dismissCurrentItem() {
        guard let id = currentQueueItemID else { return }
        removeQueueItem(id: id)
        events = []
        icsData = Data()
        status = ""
        payload = nil
        instructions = ""
        tentative = true
        multiday = false
        reviewFirst = true
    }

    // MARK: - Pipeline (refactor to allow queued processing)
    func runPipeline() async { // existing call site uses this
        let urlString: String? = payload?.url ?? (instructions.isEmpty ? nil : nil) // keep old logic via helper
        guard let urlStr = urlString else { return }
        do {
            try await runPipelineInternal(sourceURLString: urlStr,
                                          tentative: tentative,
                                          multiday: multiday,
                                          reviewFirst: reviewFirst,
                                          instructions: instructions,
                                          model: self.settings.defaultModel)
        } catch {
            Log.general.error("Pipeline: failed with error: \(error.localizedDescription)")
            await MainActor.run { self.status = "Error: \(error.localizedDescription)" }
        }
    }

    private func runPipelineInternal(sourceURLString: String,
                                     tentative: Bool,
                                     multiday: Bool,
                                     reviewFirst: Bool,
                                     instructions: String,
                                     model: String) async throws {
        guard let url = URL(string: sourceURLString) else { return }
        await MainActor.run { self.isProcessing = true }
        defer { DispatchQueue.main.async { self.isProcessing = false } }

        Log.general.info("Pipeline: start url=\(sourceURLString, privacy: .public) tentative=\(tentative) multiday=\(multiday) reviewFirst=\(reviewFirst)")
        Log.general.info("Pipeline: model=\(model, privacy: .public) openrouterKey=\(Log.redactKey(self.settings.openRouterKey), privacy: .public)")
        await MainActor.run { self.status = "Loading page..." }
        let loader = WebLoader()
        let page = try await loader.load(url: url)
        Log.general.info("Pipeline: page html_len=\(page.html.count) image_present=\(page.jpegBase64 != nil)")

        await MainActor.run { self.status = "Analyzing content with AI..." }
        let ai = OpenRouterClient(apiKey: self.settings.openRouterKey)
        let extracted = try await ai.extract(
            pageHTML: page.html,
            sourceURL: sourceURLString,
            instructions: instructions,
            tentative: tentative,
            multiday: multiday,
            model: model,
            reasoning: self.settings.reasoningEffort,
            jpegBase64: page.jpegBase64
        )
        Log.general.info("Pipeline: extracted events=\(extracted.count)")
        await MainActor.run {
            self.events = extracted
            self.status = "Generating ICS..."
        }

        let ics = ICSBuilder.build(events: extracted, organizerEmail: self.settings.fromEmail, tentative: tentative)
        Log.general.info("Pipeline: ICS size=\(ics.count) bytes (~\(ics.count/1024) KB)")
        await MainActor.run {
            self.icsData = ics
            self.status = "Ready"
        }
    }
}
