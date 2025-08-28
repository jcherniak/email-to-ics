import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private let titleLabel = UILabel()
    private let openButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        titleLabel.text = "Create calendar event with AI"
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        openButton.setTitle("Open in App", for: .normal)
        openButton.addTarget(self, action: #selector(openInApp), for: .touchUpInside)
        openButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)
        view.addSubview(openButton)
        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
            openButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            openButton.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16)
        ])

        handleInput()
    }

    private func handleInput() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return }
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
            } catch {
                // ignore write errors in UI
            }
        }
    }

    @objc private func openInApp() {
        if let url = URL(string: "emailtoics://process-latest") {
            extensionContext?.open(url, completionHandler: { _ in
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            })
        } else {
            extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}

