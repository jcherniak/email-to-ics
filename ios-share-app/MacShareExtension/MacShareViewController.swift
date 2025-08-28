import Cocoa
import UniformTypeIdentifiers

final class MacShareViewController: NSViewController {
    override func loadView() { self.view = NSView() }

    override func viewDidLoad() {
        super.viewDidLoad()
        handleInput()
    }

    private func handleInput() {
        guard let items = self.extensionContext?.inputItems as? [NSExtensionItem] else { return }
        var sharedURL: URL?
        var selectedText: String?

        let group = DispatchGroup()
        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                        if let url = item as? URL { sharedURL = url }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                        if let text = item as? String { selectedText = text }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            guard let sharedURL else { return }
            let payload = SharedPayload(url: sharedURL.absoluteString, title: nil, selectedText: selectedText)
            do {
                let data = try JSONEncoder().encode(payload)
                try data.write(to: AppGroup.sharedPayloadURL, options: .atomic)
            } catch { }
        }
    }

    @IBAction func openInApp(_ sender: Any?) {
        if let url = URL(string: "emailtoics://process-latest") {
            NSWorkspace.shared.open(url)
        }
        self.extensionContext?.completeRequest(returningItems: nil)
    }
}

