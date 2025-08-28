import SwiftUI

@main
struct EmailToICSApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
                    .environmentObject(appState)
            }
            .onOpenURL { url in
                if url.host == "process-latest" {
                    appState.loadSharedPayload()
                }
            }
            .task {
                // Load settings on launch
                await appState.loadSettings()
                appState.loadSharedPayload()
            }
        }
    }
}

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

    func loadSharedPayload() {
        if let data = try? Data(contentsOf: AppGroup.sharedPayloadURL),
           let p = try? JSONDecoder().decode(SharedPayload.self, from: data) {
            DispatchQueue.main.async {
                self.payload = p
            }
        }
    }

    func loadSettings() async {
        if let data = UserDefaults.standard.data(forKey: "iosSettings"),
           var s = try? JSONDecoder().decode(Settings.self, from: data) {
            // Load secrets from iCloud Keychain (synchronizable)
            s.openRouterKey = Keychain.get("openRouterKey") ?? ""
            s.postmarkKey = Keychain.get("postmarkKey") ?? ""
            await MainActor.run { self.settings = s }
        } else {
            // Populate secrets from Keychain if struct not present yet
            var s = settings
            s.openRouterKey = Keychain.get("openRouterKey") ?? ""
            s.postmarkKey = Keychain.get("postmarkKey") ?? ""
            await MainActor.run { self.settings = s }
        }
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
        }
        do {
            try Keychain.set(openKey, for: "openRouterKey")
            try Keychain.set(postKey, for: "postmarkKey")
        } catch {
            // Non-fatal; caller UI will still have keys in memory
            print("Keychain save error: \(error)")
        }
    }
}
