import Foundation
import WebToICSCore

/// Everything the share extension needs from the shared container and the Keychain.
struct ShareEnvironment {
    let store: FileJobStore
    let settings: AppSettings
    let secrets: SecretStore
    let transfer: TransferStarting

    static func live() -> ShareEnvironment? {
        guard let store = FileJobStore.appGroup() else { return nil }
        let settings = AppSettings.shared()
        if settings.debugShortResourceTimeout {
            BackgroundTransferCenter.shared.resourceTimeout = 60
        }
        return ShareEnvironment(store: store, settings: settings, secrets: KeychainStore(),
                                transfer: BackgroundTransferCenter.shared)
    }
}

enum ShareHandoffError: Error, LocalizedError {
    case noAppGroup
    case missingOpenRouterKey
    case noContent

    var errorDescription: String? {
        switch self {
        case .noAppGroup: return "The shared container is unavailable. Reinstall the app."
        case .missingOpenRouterKey: return "Add your OpenRouter API key in the Web to ICS app first."
        case .noContent: return "No page content could be captured."
        }
    }
}

struct HandoffResult {
    var job: ShareJob
    var decision: ActivityFlag.Decision
    var startOutcome: StartOutcome
}

/// Turns the shared input into a job on disk, starts its first background stage and decides whether the app
/// must be opened (first share of a batch) or the user can stay in the host app.
enum ShareHandoff {
    static func enqueue(input: SharedInput, webCapture: PageCapture?, options: JobOptions,
                        environment env: ShareEnvironment, now: Date = Date()) throws -> HandoffResult {
        let secrets = env.secrets.snapshot()
        guard let key = secrets.openRouterKey, !key.isEmpty else { throw ShareHandoffError.missingOpenRouterKey }
        let firecrawl = env.settings.isFirecrawlEnabled(hasKey: !(secrets.firecrawlKey ?? "").isEmpty)

        var source: JobSource
        var pageText: String?
        var rawHTML: String?

        switch input {
        case .safariPage(let capture):
            source = JobSource(url: capture.url.isEmpty ? nil : capture.url, title: capture.title, siteName: capture.siteName,
                               selection: capture.selection.isEmpty ? nil : capture.selection,
                               contentKind: .dom, captureTier: .safariDOM, cleanMethod: capture.method, truncated: capture.truncated)
            pageText = capture.text
            rawHTML = capture.html
            if !capture.hasUsableText, !capture.html.isEmpty {
                let cleaned = HTMLTextCleaner.clean(html: capture.html)
                if cleaned.text.count > pageText!.count { pageText = cleaned.text; source.cleanMethod = "heuristic-swift" }
            }
            if (pageText ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                guard let url = input.url else { throw ShareHandoffError.noContent }
                source = fallbackSource(url: url, title: source.title, firecrawl: firecrawl)
                pageText = nil
                rawHTML = nil
            }
        case .url(let url, let title):
            if let capture = webCapture, capture.hasUsableText {
                source = JobSource(url: url.absoluteString, title: capture.title.isEmpty ? title : capture.title, siteName: capture.siteName,
                                   contentKind: .urlOnly, captureTier: .webView, cleanMethod: capture.method, truncated: capture.truncated)
                pageText = capture.text
                rawHTML = capture.html
            } else {
                source = fallbackSource(url: url, title: title, firecrawl: firecrawl)
                if let capture = webCapture, !capture.html.isEmpty { rawHTML = capture.html }
            }
        case .text(let text, let url):
            source = JobSource(url: url?.absoluteString, title: nil, selection: text, contentKind: .text, captureTier: .textOnly, cleanMethod: "text")
            pageText = text
        }

        let flag = ActivityFlagStore.load(containerURL: env.store.containerURL)
        let decision = ActivityFlag.decide(existing: flag, now: now)
        let job = ShareJob(createdAt: now, batchID: decision.batchID, source: source, options: options)
        try env.store.create(job)
        if let pageText, !pageText.isEmpty {
            _ = try env.store.writeArtifact(pageText, job: job.id, name: JobArtifact.pageText)
        }
        if let rawHTML, !rawHTML.isEmpty {
            _ = try env.store.writeArtifact(rawHTML, job: job.id, name: JobArtifact.rawHTML)
        }
        if let newFlag = decision.flagToWrite {
            try ActivityFlagStore.save(newFlag, containerURL: env.store.containerURL)
        }

        let runner = StageRunner(store: env.store, settings: env.settings.stageSettings, secrets: secrets, transfer: env.transfer)
        let outcome = try runner.startNextStage(job.id)
        let stored = try env.store.load(job.id)
        return HandoffResult(job: stored, decision: decision, startOutcome: outcome)
    }

    /// Bare URL without usable captured text: Firecrawl when allowed, otherwise a direct fetch in the background.
    static func fallbackSource(url: URL, title: String?, firecrawl: Bool) -> JobSource {
        JobSource(url: url.absoluteString, title: title, contentKind: .urlOnly,
                  captureTier: firecrawl ? .firecrawl : .directFetch)
    }

    /// Whether a bare-URL share should render the page in the extension first (no Firecrawl path available).
    static func needsWebViewCapture(input: SharedInput, environment env: ShareEnvironment) -> Bool {
        guard case .url = input else { return false }
        let secrets = env.secrets.snapshot()
        return !env.settings.isFirecrawlEnabled(hasKey: !(secrets.firecrawlKey ?? "").isEmpty)
    }
}
