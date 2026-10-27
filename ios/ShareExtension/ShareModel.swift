import Foundation
import Observation
import WebToICSCore

@MainActor
@Observable
final class ShareModel {
    enum Phase: Equatable {
        case loading
        case ready
        case capturing
        case submitting
        case queued(openApp: Bool)
        case failed(String)
    }

    var phase: Phase = .loading
    var input: SharedInput?
    var instructions = ""
    var tentative = true
    var model = ModelCatalog.defaultModelID
    var destination: DestinationKind = .appleCalendar
    var modelOptions: [ModelOption] = ModelCatalog.priorityModels
    var captureStatus: String?
    var captureResult: PageCapture?
    var hasOpenRouterKey = true
    var googleConfigured = false

    private let environment: ShareEnvironment?
    private var captureTask: Task<PageCapture?, Never>?

    init(environment: ShareEnvironment?) {
        self.environment = environment
        if let environment {
            tentative = environment.settings.defaultTentative
            model = environment.settings.openRouterModel
            destination = environment.settings.defaultDestination
            modelOptions = environment.settings.modelOptions()
            hasOpenRouterKey = environment.secrets.has(.openRouterAPIKey)
            googleConfigured = environment.settings.googleConfirmedCalendarID != nil || environment.settings.googleTentativeCalendarID != nil
        }
    }

    var pageTitle: String {
        if let title = input?.title, !title.isEmpty { return title }
        return input?.url?.host ?? "Shared item"
    }

    var pageSubtitle: String? {
        guard let url = input?.url else { return nil }
        return URLCleaner.strip(url).absoluteString
    }

    var options: JobOptions {
        JobOptions(instructions: instructions, tentative: tentative, model: model, destination: destination)
    }

    var canSubmit: Bool {
        switch phase {
        case .ready, .capturing: return hasOpenRouterKey && environment != nil
        default: return false
        }
    }

    func load(items: [NSExtensionItem]) async {
        guard environment != nil else {
            phase = .failed(ShareHandoffError.noAppGroup.localizedDescription)
            return
        }
        do {
            let loaded = try await ShareItemLoader.load(from: items)
            input = loaded
            if let selection = loaded.selection, case .safariPage = loaded, instructions.isEmpty {
                instructions = PromptBuilder.selectionInstructionsPrefix + selection
            }
            phase = hasOpenRouterKey ? .ready : .failed(ShareHandoffError.missingOpenRouterKey.localizedDescription)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    /// Bare URL without Firecrawl: start rendering right away so Go rarely has to wait.
    func startPrefetchIfNeeded(using capturer: OffscreenWebViewCapturer) {
        guard let environment, let input, captureTask == nil, case .url(let url, _) = input,
              ShareHandoff.needsWebViewCapture(input: input, environment: environment) else { return }
        captureStatus = "Loading page…"
        captureTask = Task { [weak self] in
            let capture = await capturer.capture(url: url)
            await MainActor.run {
                self?.captureResult = capture
                self?.captureStatus = capture?.hasUsableText == true ? "Page captured" : "Page could not be rendered; will fetch in the background"
            }
            return capture
        }
    }

    func submit() async -> ActivityFlag.Decision? {
        guard let environment, let input, canSubmit else { return nil }
        if let task = captureTask, captureResult == nil {
            phase = .capturing
            captureResult = await task.value
        }
        phase = .submitting
        do {
            let result = try ShareHandoff.enqueue(input: input, webCapture: captureResult, options: options, environment: environment)
            if result.job.isFailed {
                phase = .failed(result.job.state.lastError ?? "The job could not be started.")
                return nil
            }
            phase = .queued(openApp: result.decision.shouldOpenApp)
            return result.decision
        } catch {
            phase = .failed(error.localizedDescription)
            return nil
        }
    }

    func cancelCapture() {
        captureTask?.cancel()
    }
}
