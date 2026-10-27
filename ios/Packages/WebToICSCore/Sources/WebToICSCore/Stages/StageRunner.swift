import Foundation

/// Secrets needed by the stages, read once from the Keychain by the caller.
public struct SecretsSnapshot: Sendable {
    public var openRouterKey: String?
    public var firecrawlKey: String?

    public init(openRouterKey: String?, firecrawlKey: String?) {
        self.openRouterKey = openRouterKey
        self.firecrawlKey = firecrawlKey
    }
}

/// Settings the stages need (a value copy so the runner is usable from any process).
public struct StageSettings: Sendable {
    public var defaultTimeZoneID: String
    public var customPrompt: String?
    public var pageTextLimit: Int
    public var rawHTMLLimit: Int

    public init(defaultTimeZoneID: String = "America/Los_Angeles", customPrompt: String? = nil,
                pageTextLimit: Int = 200_000, rawHTMLLimit: Int = 1_000_000) {
        self.defaultTimeZoneID = defaultTimeZoneID
        self.customPrompt = customPrompt
        self.pageTextLimit = pageTextLimit
        self.rawHTMLLimit = rawHTMLLimit
    }
}

public enum StartOutcome: Equatable, Sendable {
    case startedTransfer(SessionIdentifier)
    case needsGeocode
    case ready
    case nothing
}

public enum HandleOutcome: Sendable {
    /// The stage finished and the next one was started (or the job is ready/needs geocoding).
    case advanced(StartOutcome)
    /// Extraction finished; the caller should geocode and then call `markGeocoded`.
    case needsGeocode(ExtractionResult)
    case failed(String)
    /// Result for an identifier that no longer matches the job (stale duplicate); nothing changed.
    case ignored
}

public enum StageRunnerError: Error, LocalizedError, Equatable {
    case missingOpenRouterKey
    case missingFirecrawlKey
    case missingPageText
    case missingURL

    public var errorDescription: String? {
        switch self {
        case .missingOpenRouterKey: return "Add your OpenRouter API key in Settings."
        case .missingFirecrawlKey: return "Firecrawl is enabled but no API key is configured."
        case .missingPageText: return "No page content was captured."
        case .missingURL: return "The shared item has no URL to fetch."
        }
    }
}

/// Drives a job through its stages. Used by the share extension (first stage) and by the app (every
/// following stage, on background wake or in the foreground).
public final class StageRunner: @unchecked Sendable {
    public let store: JobStore
    public var settings: StageSettings
    public var secrets: SecretsSnapshot
    public let transfer: TransferStarting
    public let factory: StageRequestFactory
    public let now: @Sendable () -> Date

    public init(store: JobStore, settings: StageSettings, secrets: SecretsSnapshot, transfer: TransferStarting,
                factory: StageRequestFactory = StageRequestFactory(), now: @escaping @Sendable () -> Date = { Date() }) {
        self.store = store
        self.settings = settings
        self.secrets = secrets
        self.transfer = transfer
        self.factory = factory
        self.now = now
    }

    // MARK: Starting stages

    /// Starts whatever the job needs next. Safe to call repeatedly; in-flight jobs return `.nothing`.
    @discardableResult
    public func startNextStage(_ id: UUID) throws -> StartOutcome {
        var job = try store.load(id)
        guard job.state.status == .pending else {
            switch job.state.stage {
            case .geocode where job.state.status != .dismissed: return .needsGeocode
            case .ready: return .ready
            default: return .nothing
            }
        }
        switch job.state.stage {
        case .capture:
            if job.source.captureTier.isCapturedInExtension {
                guard store.hasArtifact(job: id, name: JobArtifact.pageText) else {
                    try fail(id, StageRunnerError.missingPageText.localizedDescription)
                    return .nothing
                }
                job = try store.update(id) { $0.state = Self.advanced($0.state, completing: .capture, to: .extract) }
                return try startNextStage(id)
            }
            return try startCapture(job)
        case .extract:
            return try startExtract(job)
        case .geocode:
            return .needsGeocode
        case .ready:
            return .ready
        case .added:
            return .nothing
        }
    }

    private func startCapture(_ job: ShareJob) throws -> StartOutcome {
        guard let urlString = job.source.url, let url = URL(string: urlString) else {
            try fail(job.id, StageRunnerError.missingURL.localizedDescription)
            return .nothing
        }
        let identifier = SessionIdentifier(jobID: job.id, stage: .capture, attempt: job.state.attempt)
        let request: StageRequest
        switch job.source.captureTier {
        case .firecrawl:
            guard let key = secrets.firecrawlKey, !key.isEmpty else {
                try fail(job.id, StageRunnerError.missingFirecrawlKey.localizedDescription)
                return .nothing
            }
            let (urlRequest, body) = try factory.firecrawl(url: urlString, apiKey: key)
            let bodyFile = try store.writeArtifact(body, job: job.id, name: JobArtifact.request(stage: .capture, attempt: job.state.attempt))
            request = StageRequest(identifier: identifier, urlRequest: urlRequest, bodyFile: bodyFile, isDownload: false)
        case .directFetch:
            request = StageRequest(identifier: identifier, urlRequest: factory.directFetch(url: url), bodyFile: nil, isDownload: true)
        case .safariDOM, .webView, .textOnly:
            return try startNextStage(job.id)
        }
        return try launch(request, for: job.id)
    }

    private func startExtract(_ job: ShareJob) throws -> StartOutcome {
        guard let key = secrets.openRouterKey, !key.isEmpty else {
            try fail(job.id, StageRunnerError.missingOpenRouterKey.localizedDescription)
            return .nothing
        }
        let useRaw = job.state.retriedWithRawHTML
        let artifact = useRaw ? JobArtifact.rawHTML : JobArtifact.pageText
        guard var text = store.readArtifactString(job: job.id, name: artifact), !text.isEmpty else {
            try fail(job.id, StageRunnerError.missingPageText.localizedDescription)
            return .nothing
        }
        let limit = useRaw ? settings.rawHTMLLimit : settings.pageTextLimit
        if text.count > limit { text = String(text.prefix(limit)) }
        let extraction = ExtractionRequest(
            pageText: text, isRawHTML: useRaw, sourceURL: job.source.url, pageTitle: job.source.title,
            siteName: job.source.siteName, instructions: job.options.instructions, tentative: job.options.tentative,
            now: now(), defaultTimeZoneID: settings.defaultTimeZoneID, customPrompt: settings.customPrompt)
        let (urlRequest, body) = try factory.extract(extraction, model: job.options.model, apiKey: key)
        let identifier = SessionIdentifier(jobID: job.id, stage: .extract, attempt: job.state.attempt)
        let bodyFile = try store.writeArtifact(body, job: job.id, name: JobArtifact.request(stage: .extract, attempt: job.state.attempt))
        return try launch(StageRequest(identifier: identifier, urlRequest: urlRequest, bodyFile: bodyFile, isDownload: false), for: job.id)
    }

    private func launch(_ request: StageRequest, for id: UUID) throws -> StartOutcome {
        try store.update(id) {
            $0.state.status = .inFlight
            $0.state.sessionIdentifier = request.identifier.rawValue
            $0.state.lastError = nil
        }
        do {
            try transfer.start(request)
        } catch {
            try fail(id, "Could not start transfer: \(error.localizedDescription)")
            return .nothing
        }
        return .startedTransfer(request.identifier)
    }

    // MARK: Handling finished transfers

    public func handle(_ result: TransferResult) throws -> HandleOutcome {
        let id = result.identifier.jobID
        let job: ShareJob
        do {
            job = try store.load(id)
        } catch {
            return .ignored
        }
        guard job.state.sessionIdentifier == result.identifier.rawValue, job.state.status == .inFlight else {
            return .ignored
        }
        let data = result.responseData()
        if let data {
            let ext = result.identifier.stage == .capture && job.source.captureTier == .directFetch ? "html" : "json"
            _ = try? store.writeArtifact(data, job: id, name: JobArtifact.response(stage: result.identifier.stage, attempt: result.identifier.attempt, ext: ext))
        }
        if let error = result.error, data == nil {
            return try failOrRetry(job, error: ExtractionError.transport(error))
        }
        if let status = result.httpStatus, status >= 400 {
            let preview = data.map { String(decoding: $0.prefix(300), as: UTF8.self) } ?? ""
            return try failOrRetry(job, error: ExtractionError.http(status, preview))
        }
        guard let data else {
            return try failOrRetry(job, error: ExtractionError.transport(result.error ?? "Empty response"))
        }
        switch result.identifier.stage {
        case .capture:
            return try handleCapture(job, data: data)
        case .extract:
            return try handleExtract(job, data: data)
        case .geocode, .ready, .added:
            return .ignored
        }
    }

    private func handleCapture(_ job: ShareJob, data: Data) throws -> HandleOutcome {
        var pageText: String
        var rawHTML: String?
        var title: String? = job.source.title
        var method: String
        switch job.source.captureTier {
        case .firecrawl:
            let scraped: FirecrawlAPI.Scraped
            do {
                scraped = try FirecrawlAPI.parse(data)
            } catch {
                return try failOrRetry(job, error: ExtractionError.transport(error.localizedDescription))
            }
            pageText = scraped.markdown
            rawHTML = scraped.html
            if title == nil { title = scraped.title }
            method = "firecrawl"
        default:
            let html = String(decoding: data, as: UTF8.self)
            let cleaned = HTMLTextCleaner.clean(html: html, limit: settings.pageTextLimit)
            pageText = cleaned.text
            rawHTML = html
            if title == nil { title = cleaned.title }
            method = "directFetch"
        }
        if pageText.count > settings.pageTextLimit { pageText = String(pageText.prefix(settings.pageTextLimit)) }
        guard !pageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return try failOrRetry(job, error: ExtractionError.transport("The page had no readable content."))
        }
        _ = try store.writeArtifact(pageText, job: job.id, name: JobArtifact.pageText)
        if let rawHTML, !rawHTML.isEmpty {
            _ = try store.writeArtifact(String(rawHTML.prefix(settings.rawHTMLLimit)), job: job.id, name: JobArtifact.rawHTML)
        }
        try store.update(job.id) {
            $0.source.title = title
            $0.source.cleanMethod = method
            $0.state = Self.advanced($0.state, completing: .capture, to: .extract)
        }
        return .advanced(try startNextStage(job.id))
    }

    private func handleExtract(_ job: ShareJob, data: Data) throws -> HandleOutcome {
        let result: ExtractionResult
        do {
            result = try factory.extractor.parse(data)
        } catch let error as ExtractionError {
            return try failOrRetry(job, error: error)
        } catch {
            return try failOrRetry(job, error: ExtractionError.invalidJSON(error.localizedDescription))
        }
        let encoded = try JSONCoding.encoder.encode(result)
        _ = try store.writeArtifact(encoded, job: job.id, name: JobArtifact.result)
        try store.update(job.id) {
            $0.eventCount = result.eventData.count
            $0.firstSummary = result.eventData.first?.summary
            $0.state = Self.advanced($0.state, completing: .extract, to: .geocode)
        }
        return .needsGeocode(result)
    }

    /// Extraction failures get one more try with the raw HTML; everything else fails the job.
    private func failOrRetry(_ job: ShareJob, error: ExtractionError) throws -> HandleOutcome {
        if job.state.stage == .extract, !job.state.retriedWithRawHTML, error.isRetryableWithRawHTML,
           store.hasArtifact(job: job.id, name: JobArtifact.rawHTML) {
            try store.update(job.id) {
                $0.state.retriedWithRawHTML = true
                $0.state.attempt += 1
                $0.state.status = .pending
                $0.state.sessionIdentifier = nil
                $0.state.lastError = "Retrying with full page HTML after: \(error.localizedDescription)"
            }
            return .advanced(try startNextStage(job.id))
        }
        try fail(job.id, error.localizedDescription)
        return .failed(error.localizedDescription)
    }

    // MARK: Transitions

    public func markGeocoded(_ id: UUID, resolved: [ResolvedEvent]) throws {
        let data = try JSONCoding.encoder.encode(resolved)
        _ = try store.writeArtifact(data, job: id, name: JobArtifact.resolved)
        try store.update(id) {
            $0.state = Self.advanced($0.state, completing: .geocode, to: .ready)
            $0.state.status = .done
        }
        store.removeArtifact(job: id, name: JobArtifact.rawHTML)
    }

    /// Geocoding failed or was skipped: keep the AI locations and move on.
    public func markGeocodeSkipped(_ id: UUID, result: ExtractionResult, tentative: Bool) throws {
        let resolved = result.eventData.map { ResolvedEvent(event: $0, location: nil, tentative: tentative) }
        try markGeocoded(id, resolved: resolved)
    }

    public func loadResult(_ id: UUID) -> ExtractionResult? {
        store.readArtifact(job: id, name: JobArtifact.result).flatMap { try? JSONCoding.decoder.decode(ExtractionResult.self, from: $0) }
    }

    public func loadResolved(_ id: UUID) -> [ResolvedEvent]? {
        store.readArtifact(job: id, name: JobArtifact.resolved).flatMap { try? JSONCoding.decoder.decode([ResolvedEvent].self, from: $0) }
    }

    public func markAdded(_ id: UUID) throws {
        try store.update(id) {
            $0.state.stage = .added
            $0.state.status = .done
            if !$0.state.completedStages.contains(.ready) { $0.state.completedStages.append(.ready) }
        }
    }

    public func dismiss(_ id: UUID) throws {
        try store.update(id) { $0.state.status = .dismissed }
    }

    /// Re-run a failed job from its failed stage.
    @discardableResult
    public func retry(_ id: UUID) throws -> StartOutcome {
        let job = try store.load(id)
        guard job.state.status == .failed || job.state.status == .inFlight else { return try startNextStage(id) }
        try store.update(id) {
            $0.state.attempt += 1
            $0.state.status = .pending
            $0.state.sessionIdentifier = nil
            $0.state.lastError = nil
        }
        return try startNextStage(id)
    }

    /// Marks an in-flight job whose transfer vanished (no task, no response) as failed so it can be retried.
    public func markTransferLost(_ id: UUID) throws {
        try fail(id, "The background transfer was lost. Tap Retry.")
    }

    private func fail(_ id: UUID, _ message: String) throws {
        try store.update(id) {
            $0.state.status = .failed
            $0.state.lastError = message
        }
    }

    static func advanced(_ state: JobState, completing stage: JobStage, to next: JobStage) -> JobState {
        var s = state
        if !s.completedStages.contains(stage) { s.completedStages.append(stage) }
        s.stage = next
        s.status = .pending
        s.sessionIdentifier = nil
        s.lastError = nil
        return s
    }
}
