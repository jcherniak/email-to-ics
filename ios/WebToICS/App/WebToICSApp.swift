import SwiftUI
import WebToICSCore

@main
struct WebToICSApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                Text("Web to ICS")
                    .font(.title)
                    .padding()
                Text("Share a web page to get started.")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
