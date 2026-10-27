import Foundation

/// Inputs that vary per extraction when rendering the system prompt.
public struct PromptContext: Sendable {
    public var now: Date
    /// Time zone used to render "today's date" and the current year.
    public var calendarTimeZone: TimeZone
    /// IANA identifier the model should fall back to when a location gives no hint.
    public var defaultTimeZoneID: String
    public var tentative: Bool

    public init(now: Date = Date(), calendarTimeZone: TimeZone = .current,
                defaultTimeZoneID: String = "America/Los_Angeles", tentative: Bool = true) {
        self.now = now
        self.calendarTimeZone = calendarTimeZone
        self.defaultTimeZoneID = defaultTimeZoneID
        self.tentative = tentative
    }
}

/// Builds the chat messages for an extraction call. Message layout follows the PHP backend and the
/// Chrome extension: system prompt, optional instructions message, source-URL message, content message.
public enum PromptBuilder {
    public static let instructionsHeader = "*** EXTREMELY IMPORTANT INSTRUCTIONS ***"
    public static let sourceHeader = "*** SOURCE URL ***"
    /// Prefill used when the user shared a text selection (copied from the Chrome extension).
    public static let selectionInstructionsPrefix =
        "Focus on this section exclusively. Use surrounding HTML for context, but this is the event we want:\n\n"

    /// Renders the bundled template with the bundled policy and custom prompt.
    public static func systemPrompt(context: PromptContext, customPrompt: String? = nil) throws -> String {
        let template = try PromptResources.systemPromptTemplate()
        let policy = try PromptResources.sharedPolicy()
        let custom: String
        if let provided = customPrompt?.trimmingCharacters(in: .whitespacesAndNewlines), !provided.isEmpty {
            custom = provided
        } else {
            custom = try PromptResources.defaultCustomPrompt()
        }
        return render(template: template, policy: policy, customPrompt: custom, context: context)
    }

    /// Pure template rendering (testable without bundle access).
    public static func render(template: String, policy: String, customPrompt: String, context: PromptContext) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = context.calendarTimeZone
        let year = calendar.component(.year, from: context.now)
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = context.calendarTimeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd (EEEE)"
        let replacements: [String: String] = [
            "{{TODAY}}": formatter.string(from: context.now),
            "{{YEAR}}": String(year),
            "{{NEXT_YEAR}}": String(year + 1),
            "{{DEFAULT_TZ}}": context.defaultTimeZoneID,
            "{{TENTATIVE}}": context.tentative ? "1 (tentative)" : "0 (confirmed)",
            "{{POLICY}}": policy,
            "{{CUSTOM_PROMPT}}": customPrompt,
        ]
        var out = template
        for (key, value) in replacements {
            out = out.replacingOccurrences(of: key, with: value)
        }
        return out
    }

    /// The instructions message, or nil when the user gave none.
    public static func instructionsMessage(_ instructions: String?) -> String? {
        guard let text = instructions?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
        return "\(instructionsHeader)\n\(text)"
    }

    public static func sourceMessage(url: String?, title: String?, siteName: String?) -> String? {
        let cleaned = url.map { URLCleaner.strip($0) }?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let cleaned, !cleaned.isEmpty else { return nil }
        var lines = ["\(sourceHeader)", "The content was fetched from: \(cleaned)"]
        if let title = title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty {
            lines.append("Page title: \(title)")
        }
        if let siteName = siteName?.trimmingCharacters(in: .whitespacesAndNewlines), !siteName.isEmpty {
            lines.append("Site name: \(siteName)")
        }
        lines.append("You MUST include this URL in the 'url' field of every event, and add it to the bottom of both the plain text and HTML descriptions.")
        return lines.joined(separator: "\n")
    }

    public static func contentMessage(text: String, isRawHTML: Bool) -> String {
        if isRawHTML {
            return "Content to analyze (raw page HTML; the cleaned text was insufficient, so read the markup directly):\n\(text)"
        }
        return "Content to analyze:\n\(text)"
    }
}
