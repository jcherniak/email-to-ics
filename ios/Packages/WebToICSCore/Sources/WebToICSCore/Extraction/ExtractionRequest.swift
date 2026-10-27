import Foundation

/// Everything needed to ask a model for events from one page.
public struct ExtractionRequest: Equatable, Sendable {
    public var pageText: String
    /// True when `pageText` is the raw HTML fallback rather than cleaned text.
    public var isRawHTML: Bool
    public var sourceURL: String?
    public var pageTitle: String?
    public var siteName: String?
    public var instructions: String
    public var tentative: Bool
    public var now: Date
    public var defaultTimeZoneID: String
    public var customPrompt: String?

    public init(pageText: String, isRawHTML: Bool = false, sourceURL: String? = nil, pageTitle: String? = nil,
                siteName: String? = nil, instructions: String = "", tentative: Bool = true, now: Date = Date(),
                defaultTimeZoneID: String = "America/Los_Angeles", customPrompt: String? = nil) {
        self.pageText = pageText
        self.isRawHTML = isRawHTML
        self.sourceURL = sourceURL
        self.pageTitle = pageTitle
        self.siteName = siteName
        self.instructions = instructions
        self.tentative = tentative
        self.now = now
        self.defaultTimeZoneID = defaultTimeZoneID
        self.customPrompt = customPrompt
    }
}
