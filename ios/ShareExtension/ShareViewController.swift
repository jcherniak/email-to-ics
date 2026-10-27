import SwiftUI
import UIKit
import WebToICSCore

/// Principal class of the share extension (see Info.plist NSExtensionPrincipalClass).
final class ShareViewController: UIViewController {
    private let environment = ShareEnvironment.live()
    private lazy var model = ShareModel(environment: environment)
    private let capturer = OffscreenWebViewCapturer()
    private var hosting: UIHostingController<ShareOptionsView>?
    private var finished = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        preferredContentSize = CGSize(width: 420, height: 560)

        let root = ShareOptionsView(
            model: model,
            onSubmit: { [weak self] in self?.submit() },
            onCancel: { [weak self] in self?.cancel() },
            onOpenApp: { [weak self] in
                self?.openHostApp(AppIdentifiers.deepLink("settings"))
                self?.cancel()
            })
        let hosting = UIHostingController(rootView: root)
        addChild(hosting)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        hosting.view.backgroundColor = .clear
        view.addSubview(hosting.view)
        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        hosting.didMove(toParent: self)
        self.hosting = hosting
        // Behind the sheet so WebKit considers it on screen (hidden views get throttled).
        capturer.attach(to: view)
        view.sendSubviewToBack(capturer.webView)

        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        Task { [weak self] in
            guard let self else { return }
            await self.model.load(items: items)
            self.model.startPrefetchIfNeeded(using: self.capturer)
        }
    }

    private func submit() {
        Task { [weak self] in
            guard let self else { return }
            guard let decision = await self.model.submit() else { return }
            if decision.shouldOpenApp {
                self.openHostApp(AppIdentifiers.batchDeepLink)
            }
            self.complete(after: decision.shouldOpenApp ? 0.6 : 0.35)
        }
    }

    private func cancel() {
        model.cancelCapture()
        guard !finished else { return }
        finished = true
        extensionContext?.cancelRequest(withError: NSError(domain: NSCocoaErrorDomain, code: NSUserCancelledError))
    }

    private func complete(after delay: TimeInterval) {
        guard !finished else { return }
        finished = true
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    /// Share extensions cannot rely on `extensionContext.open`; SwiftUI's `OpenURLAction` works, with the
    /// classic responder-chain `openURL:` as a fallback.
    private func openHostApp(_ url: URL) {
        // 1. Responder-chain `openURL:` (long-standing workaround that reaches UIApplication from an extension).
        let selector = sel_registerName("openURL:")
        var responder: UIResponder? = self
        while let current = responder {
            if current.responds(to: selector) {
                _ = current.perform(selector, with: url)
                return
            }
            responder = current.next
        }
        // 2. SwiftUI's default OpenURLAction works from extensions where `extensionContext.open` does not.
        let action = EnvironmentValues().openURL
        action(url)
        // 3. Last resort; share extensions usually get `false` here, but it is harmless.
        extensionContext?.open(url, completionHandler: nil)
    }
}
