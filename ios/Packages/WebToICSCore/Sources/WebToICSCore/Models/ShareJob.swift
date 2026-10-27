import Foundation

/// Pipeline stage of a job. `capture → extract → geocode → ready → added`.
public enum JobStage: String, Codable, CaseIterable, Sendable {
    case capture, extract, geocode, ready, added

    public var displayName: String {
        switch self {
        case .capture: return "Capturing page"
        case .extract: return "Analyzing"
        case .geocode: return "Resolving location"
        case .ready: return "Ready for review"
        case .added: return "Added"
        }
    }
}

public enum StageStatus: String, Codable, Sendable {
    case pending, inFlight, done, failed, dismissed
}

/// What the share extension received.
public enum ContentKind: String, Codable, Sendable {
    case dom, text, urlOnly
}

/// How the page text was (or will be) obtained.
public enum CaptureTier: String, Codable, Sendable {
    /// Safari handed us the cleaned DOM text through the JS preprocessor.
    case safariDOM
    /// Rendered in an offscreen web view inside the share sheet.
    case webView
    /// Firecrawl scrape as a background upload stage.
    case firecrawl
    /// Plain HTTP GET as a background download stage, cleaned by `HTMLTextCleaner`.
    case directFetch
    /// Shared plain text, no page.
    case textOnly

    /// Tiers whose capture happens inside the share extension before the first upload.
    public var isCapturedInExtension: Bool {
        switch self {
        case .safariDOM, .webView, .textOnly: return true
        case .firecrawl, .directFetch: return false
        }
    }
}

public enum DestinationKind: String, Codable, CaseIterable, Sendable, Identifiable {
    case appleCalendar, googleCalendar, icsFile

    public var id: String { rawValue }
    public var displayName: String {
        switch self {
        case .appleCalendar: return "Apple Calendar"
        case .googleCalendar: return "Google Calendar"
        case .icsFile: return "ICS file"
        }
    }
}

public struct JobSource: Codable, Hashable, Sendable {
    public var url: String?
    public var title: String?
    public var siteName: String?
    public var selection: String?
    public var contentKind: ContentKind
    public var captureTier: CaptureTier
    /// "readability" | "heuristic" | "firecrawl" | "directFetch" | nil
    public var cleanMethod: String?
    public var truncated: Bool

    public init(url: String?, title: String? = nil, siteName: String? = nil, selection: String? = nil,
                contentKind: ContentKind, captureTier: CaptureTier, cleanMethod: String? = nil, truncated: Bool = false) {
        self.url = url
        self.title = title
        self.siteName = siteName
        self.selection = selection
        self.contentKind = contentKind
        self.captureTier = captureTier
        self.cleanMethod = cleanMethod
        self.truncated = truncated
    }
}

public struct JobOptions: Codable, Hashable, Sendable {
    public var instructions: String
    public var tentative: Bool
    public var model: String
    public var destination: DestinationKind

    public init(instructions: String = "", tentative: Bool = true, model: String = ModelCatalog.defaultModelID,
                destination: DestinationKind = .appleCalendar) {
        self.instructions = instructions
        self.tentative = tentative
        self.model = model
        self.destination = destination
    }
}

public struct JobState: Codable, Hashable, Sendable {
    public var stage: JobStage
    public var status: StageStatus
    public var attempt: Int
    public var sessionIdentifier: String?
    public var lastError: String?
    public var updatedAt: Date
    public var completedStages: [JobStage]
    /// Set once the extraction has been re-run with the raw page HTML.
    public var retriedWithRawHTML: Bool

    public init(stage: JobStage = .capture, status: StageStatus = .pending, attempt: Int = 1, sessionIdentifier: String? = nil,
                lastError: String? = nil, updatedAt: Date = Date(), completedStages: [JobStage] = [], retriedWithRawHTML: Bool = false) {
        self.stage = stage
        self.status = status
        self.attempt = attempt
        self.sessionIdentifier = sessionIdentifier
        self.lastError = lastError
        self.updatedAt = updatedAt
        self.completedStages = completedStages
        self.retriedWithRawHTML = retriedWithRawHTML
    }
}

public struct ShareJob: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let createdAt: Date
    public var batchID: UUID
    public var source: JobSource
    public var options: JobOptions
    public var state: JobState
    public var eventCount: Int?
    public var firstSummary: String?
    public var cleared: Bool

    public init(id: UUID = UUID(), createdAt: Date = Date(), batchID: UUID, source: JobSource, options: JobOptions,
                state: JobState = JobState(), eventCount: Int? = nil, firstSummary: String? = nil, cleared: Bool = false) {
        self.id = id
        self.createdAt = createdAt
        self.batchID = batchID
        self.source = source
        self.options = options
        self.state = state
        self.eventCount = eventCount
        self.firstSummary = firstSummary
        self.cleared = cleared
    }

    /// Title for lists: first extracted summary, else page title, else host.
    public var displayTitle: String {
        if let firstSummary, !firstSummary.isEmpty { return firstSummary }
        if let title = source.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
        if let url = source.url, let host = URL(string: url)?.host { return host }
        return "Shared page"
    }

    public var isFailed: Bool { state.status == .failed }
    public var isDismissed: Bool { state.status == .dismissed }
    public var isReady: Bool { state.stage == .ready && state.status != .dismissed }
    public var isAdded: Bool { state.stage == .added }
    /// Still moving through capture/extract/geocode.
    public var isInProgress: Bool {
        !isFailed && !isDismissed && (state.stage == .capture || state.stage == .extract || state.stage == .geocode)
    }
    /// Counts as "done" for the Live Activity (ready, added).
    public var isDone: Bool { isReady || isAdded }
    /// Nothing more will happen without user action.
    public var isSettled: Bool { isAdded || isDismissed }
}
