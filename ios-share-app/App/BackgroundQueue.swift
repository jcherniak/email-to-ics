import Foundation
import BackgroundTasks

#if canImport(UIKit)
final class BackgroundQueueManager {
    static let shared = BackgroundQueueManager()
    private init() {}

    static let taskIdentifier = "com.tls.email-to-ics.queueprocess"

    func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.taskIdentifier, using: nil) { task in
            self.handle(task: task as! BGProcessingTask)
        }
    }

    func schedule() {
        let request = BGProcessingTaskRequest(identifier: Self.taskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        do {
            try BGTaskScheduler.shared.submit(request)
            Log.general.info("BGTask: scheduled processing task")
        } catch {
            Log.general.error("BGTask: schedule failed: \(error.localizedDescription)")
        }
    }

    private func handle(task: BGProcessingTask) {
        Log.general.info("BGTask: started")
        schedule() // schedule next

        let queue = DispatchQueue.global(qos: .utility)
        task.expirationHandler = {
            Log.general.error("BGTask: expired")
        }
        queue.async {
            Task {
                let ok = await self.processNextPending()
                task.setTaskCompleted(success: ok)
                Log.general.info("BGTask: completed success=\(ok)")
            }
        }
    }

    // MARK: - Work
    private func loadSettingsSnapshot() -> Settings {
        var s = Settings()
        if let data = UserDefaults.standard.data(forKey: "iosSettings"),
           var decoded = try? JSONDecoder().decode(Settings.self, from: data) {
            decoded.openRouterKey = Keychain.get("openRouterKey") ?? ""
            decoded.postmarkKey = Keychain.get("postmarkKey") ?? ""
            return decoded
        } else {
            s.openRouterKey = Keychain.get("openRouterKey") ?? ""
            s.postmarkKey = Keychain.get("postmarkKey") ?? ""
            return s
        }
    }

    private func mark(_ id: UUID, status: QueueStatus, error: String? = nil) {
        QueueStore.update { items in
            if let i = items.firstIndex(where: { $0.id == id }) {
                items[i].status = status
                items[i].errorMessage = error
                items[i].updatedAt = Date()
            }
        }
    }

    private func remove(_ id: UUID) {
        QueueStore.update { items in items.removeAll { $0.id == id } }
    }

    private func fetchHTML(_ url: URL) async throws -> String {
        let (data, _) = try await URLSession.shared.data(from: url)
        return String(data: data, encoding: .utf8) ?? ""
    }

    private func processNextPending() async -> Bool {
        var items = QueueStore.load()
        guard let next = items.first(where: { $0.status == .pending && $0.reviewFirst == false }) else {
            Log.general.info("BGTask: no pending auto items")
            return true
        }
        mark(next.id, status: .processing)
        let settings = loadSettingsSnapshot()
        guard !settings.openRouterKey.isEmpty else {
            Log.general.error("BGTask: missing OpenRouter key")
            mark(next.id, status: .failed, error: "Missing OpenRouter key")
            return false
        }
        do {
            guard let url = URL(string: next.payload.url) else { throw NSError(domain: "badurl", code: -1) }
            let html = try await fetchHTML(url)
            let ai = OpenRouterClient(apiKey: settings.openRouterKey)
            let events = try await ai.extract(
                pageHTML: html,
                sourceURL: next.payload.url,
                instructions: next.instructions,
                tentative: next.tentative,
                multiday: next.multiday,
                model: next.defaultModel,
                reasoning: settings.reasoningEffort,
                jpegBase64: nil
            )
            let ics = ICSBuilder.build(events: events, organizerEmail: settings.fromEmail, tentative: next.tentative)

            // Email via Postmark
            guard !settings.postmarkKey.isEmpty else {
                mark(next.id, status: .failed, error: "Missing Postmark key")
                return false
            }
            let postmark = PostmarkClient(apiKey: settings.postmarkKey)
            let to = next.tentative ? (settings.toTentativeEmail) : (settings.toConfirmedEmail)
            guard !settings.fromEmail.isEmpty && !to.isEmpty else {
                mark(next.id, status: .failed, error: "Missing from/to emails")
                return false
            }
            try await postmark.send(
                from: settings.fromEmail,
                to: to,
                subject: events.count == 1 ? events[0].summary : "Calendar Events: \(events.count)",
                body: "See attached ICS.",
                icsData: ics
            )
            remove(next.id)
            return true
        } catch {
            Log.general.error("BGTask: processing failed: \(error.localizedDescription)")
            mark(next.id, status: .failed, error: error.localizedDescription)
            return false
        }
    }
}
#endif

