import SwiftUI
import os

#if os(macOS)
@main
struct EmailToICSMacApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var appState = AppState()
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .frame(minWidth: 600, minHeight: 500)
        }
        .commands { }
        .onChange(of: scenePhase) { _, newPhase in
            Log.general.info("Mac App: scene phase=\(String(describing: newPhase))")
        }
    }
}
#endif
