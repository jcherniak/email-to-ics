import Foundation
import WebKit

/// Renders a URL in an offscreen `WKWebView` (kept in the view hierarchy so WebKit does not throttle it) and
/// runs the shared cleaning script. Used when the share sheet only received a URL and Firecrawl is off.
@MainActor
final class OffscreenWebViewCapturer: NSObject, WKNavigationDelegate {
    static let defaultTimeout: TimeInterval = 8

    let webView: WKWebView
    private var navigationContinuation: CheckedContinuation<Bool, Never>?

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.applicationNameForUserAgent = "Version/18.0 Mobile/15E148 Safari/604.1"
        configuration.suppressesIncrementalRendering = true
        if let script = Self.loadCleanerScript() {
            configuration.userContentController.addUserScript(
                WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844), configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.isUserInteractionEnabled = false
        webView.alpha = 0.01
        webView.accessibilityElementsHidden = true
    }

    /// The generated ShareJS.js bundle (Readability + PageCleaner + Safari shim) copied into the extension bundle.
    static func loadCleanerScript() -> String? {
        guard let url = Bundle.main.url(forResource: "ShareJS", withExtension: "js") else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }

    /// Attach to a host view so WebKit treats the web view as visible.
    func attach(to host: UIView) {
        guard webView.superview == nil else { return }
        webView.frame = CGRect(x: 0, y: 0, width: max(host.bounds.width, 320), height: max(host.bounds.height, 480))
        host.insertSubview(webView, at: 0)
    }

    func capture(url: URL, timeout: TimeInterval = OffscreenWebViewCapturer.defaultTimeout) async -> PageCapture? {
        let deadline = Date().addingTimeInterval(timeout)
        let loaded = await withTaskGroup(of: Bool.self) { group -> Bool in
            group.addTask { @MainActor in await self.load(url) }
            group.addTask { try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000)); return false }
            let first = await group.next() ?? false
            group.cancelAll()
            return first
        }
        guard loaded else {
            webView.stopLoading()
            return nil
        }
        // Wait for readyState == complete (bounded), then a short settle for late scripts.
        while Date() < deadline {
            let state = (try? await webView.evaluateJavaScript("document.readyState")) as? String
            if state == "complete" { break }
            try? await Task.sleep(nanoseconds: 150_000_000)
        }
        try? await Task.sleep(nanoseconds: 500_000_000)
        guard Date() < deadline.addingTimeInterval(2) else { return nil }
        do {
            let value = try await webView.evaluateJavaScript("(function(){ try { return WebToICS.clean(document, window); } catch (e) { return { error: String(e) }; } })()")
            guard let dictionary = value as? [String: Any] else { return nil }
            var capture = PageCapture(dictionary: dictionary)
            if capture == nil, Self.loadCleanerScript() == nil {
                // Script missing from the bundle: fall back to the raw HTML only.
                let html = (try? await webView.evaluateJavaScript("document.documentElement.outerHTML")) as? String ?? ""
                capture = PageCapture(dictionary: ["url": url.absoluteString, "html": html, "method": "html-only", "title": webView.title ?? ""])
            }
            return capture
        } catch {
            return nil
        }
    }

    private func load(_ url: URL) async -> Bool {
        await withCheckedContinuation { continuation in
            navigationContinuation = continuation
            var request = URLRequest(url: url)
            request.timeoutInterval = Self.defaultTimeout
            webView.load(request)
        }
    }

    private func finish(_ success: Bool) {
        navigationContinuation?.resume(returning: success)
        navigationContinuation = nil
    }

    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor in self.finish(true) }
    }

    nonisolated func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in self.finish(false) }
    }

    nonisolated func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in self.finish(false) }
    }

    nonisolated func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Stay on http(s); never let the page open other apps from the share sheet.
        if let scheme = navigationAction.request.url?.scheme?.lowercased(), scheme == "http" || scheme == "https" || scheme == "about" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }
}
