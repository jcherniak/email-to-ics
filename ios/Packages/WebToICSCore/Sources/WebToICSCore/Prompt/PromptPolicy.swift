import Foundation

/// Access to the text resources bundled with the Core package.
public enum PromptResources {
    public enum ResourceError: Error, LocalizedError {
        case missing(String)
        public var errorDescription: String? {
            switch self {
            case .missing(let name): return "Bundled resource \(name) is missing."
            }
        }
    }

    static func text(named name: String, extension ext: String) throws -> String {
        guard let url = Bundle.module.url(forResource: name, withExtension: ext, subdirectory: "Resources")
                ?? Bundle.module.url(forResource: name, withExtension: ext) else {
            throw ResourceError.missing("\(name).\(ext)")
        }
        return try String(contentsOf: url, encoding: .utf8)
    }

    /// `prompt/system_prompt_policy.xml`, byte-identical copy (checked by ios/scripts/check-policy-sync.sh).
    public static func sharedPolicy() throws -> String {
        try text(named: "system_prompt_policy", extension: "xml").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Chrome extension `custom-prompt.default.txt`, the default user-preferences block.
    public static func defaultCustomPrompt() throws -> String {
        try text(named: "custom-prompt.default", extension: "txt").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The iOS system prompt template (shortcut prompt adapted to JSON output).
    public static func systemPromptTemplate() throws -> String {
        try text(named: "ios_system_prompt", extension: "txt")
    }
}
