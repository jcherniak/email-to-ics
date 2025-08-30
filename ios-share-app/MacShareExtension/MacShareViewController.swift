import Cocoa
import UniformTypeIdentifiers
import os

final class MacShareViewController: NSViewController {
    override func loadView() { self.view = NSView() }

    override func viewDidLoad() {
        super.viewDidLoad()
        handleInput()
    }

    private func handleInput() {
        guard let items = self.extensionContext?.inputItems as? [NSExtensionItem] else { return }
        Log.general.info("ShareExt(macOS): received \(items.count) items")
        var sharedURL: URL?
        var selectedText: String?

        let group = DispatchGroup()
        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                        if let url = item as? URL { sharedURL = url; Log.general.info("ShareExt(macOS): URL=\(url.absoluteString, privacy: .public)") }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                        if let text = item as? String { selectedText = text; Log.general.debug("ShareExt(macOS): selected text len=\(text.count)") }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            guard let sharedURL else { Log.general.error("ShareExt(macOS): no URL in input"); return }
            let payload = SharedPayload(url: sharedURL.absoluteString, title: nil, selectedText: selectedText)
            do {
                let data = try JSONEncoder().encode(payload)
                try data.write(to: AppGroup.sharedPayloadURL, options: .atomic)
                Log.general.info("ShareExt(macOS): wrote payload to app group")
            } catch {
                Log.general.error("ShareExt(macOS): payload write error: \(error.localizedDescription)")
            }
        }
    }

    @IBAction func openInApp(_ sender: Any?) {
        if let url = URL(string: "emailtoics://process-latest") {
            NSWorkspace.shared.open(url)
        }
        self.extensionContext?.completeRequest(returningItems: nil)
    }
}
