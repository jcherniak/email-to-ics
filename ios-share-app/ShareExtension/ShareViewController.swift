import UIKit
import MobileCoreServices
import UniformTypeIdentifiers
import os

final class ShareViewController: UIViewController {
    private let statusLabel = UILabel()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let openButton = UIButton(type: .system)
    private let addToQueueButton = UIButton(type: .system)
    private let tentativeSwitch = UISwitch()
    private let multidaySwitch = UISwitch()
    private let reviewFirstSwitch = UISwitch()
    private let instructionsView = UITextView()

    private var capturedPayload: SharedPayload?
    private var didCommitAction = false

    override func viewDidLoad() {
        super.viewDidLoad()
        // Lightweight status UI so users see what's happening and we have a fallback.
        view.backgroundColor = .systemBackground
        statusLabel.text = "Preparing content…"
        statusLabel.numberOfLines = 2
        statusLabel.textAlignment = .center
        spinner.startAnimating()
        openButton.setTitle("Open App Now", for: .normal)
        openButton.isHidden = true
        openButton.addTarget(self, action: #selector(openButtonTapped), for: .touchUpInside)

        addToQueueButton.setTitle("Add To Queue", for: .normal)
        addToQueueButton.isHidden = true
        addToQueueButton.addTarget(self, action: #selector(addToQueueTapped), for: .touchUpInside)

        let grid = UIStackView()
        grid.axis = .vertical
        grid.alignment = .fill
        grid.spacing = 8
        grid.translatesAutoresizingMaskIntoConstraints = false

        let row1 = UIStackView(arrangedSubviews: [UILabel(text: "Tentative"), tentativeSwitch])
        row1.axis = .horizontal; row1.distribution = .equalSpacing
        let row2 = UIStackView(arrangedSubviews: [UILabel(text: "Multiday"), multidaySwitch])
        row2.axis = .horizontal; row2.distribution = .equalSpacing
        let row3 = UIStackView(arrangedSubviews: [UILabel(text: "Review First"), reviewFirstSwitch])
        row3.axis = .horizontal; row3.distribution = .equalSpacing
        tentativeSwitch.isOn = true
        reviewFirstSwitch.isOn = true

        instructionsView.font = .preferredFont(forTextStyle: .footnote)
        instructionsView.layer.borderWidth = 1
        instructionsView.layer.cornerRadius = 8
        instructionsView.layer.borderColor = UIColor.quaternaryLabel.cgColor
        instructionsView.heightAnchor.constraint(equalToConstant: 80).isActive = true

        grid.addArrangedSubview(row1)
        grid.addArrangedSubview(row2)
        grid.addArrangedSubview(row3)
        let instrLabel = UILabel(text: "Instructions (optional)")
        grid.addArrangedSubview(instrLabel)
        grid.addArrangedSubview(instructionsView)

        let buttons = UIStackView(arrangedSubviews: [openButton, addToQueueButton])
        buttons.axis = .horizontal
        buttons.alignment = .center
        buttons.spacing = 20

        let stack = UIStackView(arrangedSubviews: [spinner, statusLabel, grid, buttons])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.9)
        ])

        handleInput()
    }

    private func handleInput() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return }
        Log.general.info("ShareExt(iOS): received \(items.count) items")
        var sharedURL: URL?
        var selectedText: String?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                        if let url = item as? URL { sharedURL = url; Log.general.info("ShareExt(iOS): URL=\(url.absoluteString, privacy: .public)") }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) || provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                    group.enter()
                    let type = provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) ? UTType.plainText.identifier : UTType.text.identifier
                    provider.loadItem(forTypeIdentifier: type, options: nil) { item, _ in
                        if let text = item as? String { selectedText = text; Log.general.debug("ShareExt(iOS): selected text len=\(text.count)") }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            guard let sharedURL else { 
                Log.general.error("ShareExt(iOS): no URL in input")
                self.statusLabel.text = "No URL found in share."
                self.spinner.stopAnimating()
                self.openButton.setTitle("Close", for: .normal)
                self.openButton.isHidden = false
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                return 
            }
            let payload = SharedPayload(url: sharedURL.absoluteString, title: nil, selectedText: selectedText)
            self.capturedPayload = payload
            do {
                let data = try JSONEncoder().encode(payload)
                try data.write(to: AppGroup.sharedPayloadURL, options: .atomic)
                Log.general.info("ShareExt(iOS): wrote payload to app group; launching host app")
                self.statusLabel.text = "Ready. Choose an option below."
                self.spinner.stopAnimating()
                self.openButton.isHidden = false
                self.addToQueueButton.isHidden = false
            } catch {
                Log.general.error("ShareExt(iOS): payload write error: \(error.localizedDescription)")
                self.statusLabel.text = "Couldn’t save content (\(error.localizedDescription))."
                self.spinner.stopAnimating()
                self.openButton.setTitle("Close", for: .normal)
                self.openButton.isHidden = false
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }
        }
    }

    private func openInApp() {
        guard let url = URL(string: "emailtoics://process-latest") else {
            Log.general.error("ShareExt(iOS): Failed to create app URL")
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        Log.general.info("ShareExt(iOS): Opening app with URL: \(url.absoluteString)")
        // Try extensionContext.open which is the recommended approach
        extensionContext?.open(url, completionHandler: { [weak self] success in
            Log.general.info("ShareExt(iOS): extensionContext.open completed with success: \(success)")
            DispatchQueue.main.async {
                if success {
                    // Important: complete immediately so iOS can foreground the app.
                    self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                } else {
                    // Responder-chain fallback and visible manual button.
                    Log.general.info("ShareExt(iOS): Trying responder chain fallback")
                    var responder = self as UIResponder?
                    let selector = sel_registerName("openURL:")
                    var sent = false
                    while responder != nil {
                        if responder!.responds(to: selector) {
                            responder!.perform(selector, with: url)
                            sent = true
                            Log.general.info("ShareExt(iOS): Called openURL via responder chain")
                            break
                        }
                        responder = responder?.next
                    }
                    if sent {
                        self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                    } else {
                        self?.spinner.stopAnimating()
                        self?.openButton.isHidden = false
                        self?.statusLabel.text = "Couldn’t open the app. Tap below."
                    }
                }
            }
        })
    }

    @objc private func openButtonTapped() {
        // Open the app now (user-initiated). Also enqueue the item so it appears in the app queue immediately.
        if let p = capturedPayload {
            enqueue(p)
        }
        if let url = URL(string: "emailtoics://process-latest") {
            _ = self.extensionContext?.open(url, completionHandler: nil)
        }
        didCommitAction = true
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    @objc private func addToQueueTapped() {
        guard let p = capturedPayload else { return }
        enqueue(p)
        statusLabel.text = "Added to queue. You can process it later in the app."
        didCommitAction = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    private func enqueue(_ payload: SharedPayload) {
        let item = QueueItem(
            id: UUID(),
            payload: payload,
            tentative: tentativeSwitch.isOn,
            multiday: multidaySwitch.isOn,
            reviewFirst: reviewFirstSwitch.isOn,
            instructions: instructionsView.text ?? "",
            defaultModel: "openai/gpt-5",
            fromEmail: "",
            toTentativeEmail: "",
            toConfirmedEmail: "",
            status: .pending,
            errorMessage: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
        do {
            var items = QueueStore.load()
            items.append(item)
            let data = try JSONEncoder().encode(items)
            try data.write(to: AppGroup.containerURL().appendingPathComponent("queue.json"), options: .atomic)
            Log.general.info("ShareExt(iOS): enqueued item id=\(item.id)")
        } catch {
            Log.general.error("ShareExt(iOS): enqueue failed: \(error.localizedDescription)")
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // If the user swipes away without choosing, enqueue automatically.
        if !didCommitAction, let p = capturedPayload {
            enqueue(p)
        }
    }
}

private extension UILabel {
    convenience init(text: String) {
        self.init()
        self.text = text
    }
}
