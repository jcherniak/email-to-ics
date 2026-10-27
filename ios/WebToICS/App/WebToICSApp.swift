import SwiftUI
import WebToICSCore

@main
struct WebToICSApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var jobs = JobsModel()

    var body: some Scene {
        WindowGroup {
            InboxView(model: jobs)
                .onOpenURL { url in
                    guard let link = DeepLink(url: url) else { return }
                    jobs.handle(link)
                    Task { await StageCoordinator.shared.rescan(reason: "deep link") }
                }
                .task {
                    AppEnvironment.shared.bootstrap()
                    await StageCoordinator.shared.rescan(reason: "launch")
                    jobs.reload()
                }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task {
                    await StageCoordinator.shared.rescan(reason: "foreground")
                    jobs.reload()
                }
            }
        }
    }
}
