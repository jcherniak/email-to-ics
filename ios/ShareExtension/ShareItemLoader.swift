import Foundation
import UniformTypeIdentifiers
import WebToICSCore

/// Output of the shared cleaning script (Safari preprocessor or the offscreen web view).
struct PageCapture: Equatable {
    var url: String
    var title: String
    var siteName: String
    var selection: String
    var text: String
    var truncated: Bool
    var html: String
    var htmlTruncated: Bool
    var method: String
    var error: String?

    init?(dictionary: [String: Any]) {
        func string(_ key: String) -> String { (dictionary[key] as? String) ?? "" }
        func bool(_ key: String) -> Bool {
            if let b = dictionary[key] as? Bool { return b }
            if let n = dictionary[key] as? NSNumber { return n.boolValue }
            return false
        }
        url = string("url")
        title = string("title")
        siteName = string("siteName")
        selection = string("selection")
        text = string("text")
        truncated = bool("truncated")
        html = string("html")
        htmlTruncated = bool("htmlTruncated")
        method = string("method")
        error = dictionary["error"] as? String
        if url.isEmpty && text.isEmpty && html.isEmpty { return nil }
    }

    var hasUsableText: Bool { text.trimmingCharacters(in: .whitespacesAndNewlines).count >= 200 }
}

/// What the host app handed to the extension, in priority order.
enum SharedInput: Equatable {
    /// Safari ran ShareJS.js; we already have cleaned text (and the raw HTML).
    case safariPage(PageCapture)
    /// A bare URL (Orion, Mail, Notes, ...).
    case url(URL, title: String?)
    /// Plain text, possibly with an associated URL.
    case text(String, url: URL?)

    var url: URL? {
        switch self {
        case .safariPage(let capture): return URL(string: capture.url)
        case .url(let url, _): return url
        case .text(_, let url): return url
        }
    }

    var title: String? {
        switch self {
        case .safariPage(let capture): return capture.title.isEmpty ? nil : capture.title
        case .url(_, let title): return title
        case .text: return nil
        }
    }

    var selection: String? {
        switch self {
        case .safariPage(let capture): return capture.selection.isEmpty ? nil : capture.selection
        case .text(let text, _): return text
        case .url: return nil
        }
    }
}

enum ShareItemLoaderError: Error, LocalizedError {
    case nothingShareable
    var errorDescription: String? { "Nothing shareable was found. Share a web page, a link or some text." }
}

/// Reads the extension context's attachments.
enum ShareItemLoader {
    static func load(from items: [NSExtensionItem]) async throws -> SharedInput {
        var foundURL: URL?
        var foundTitle: String?
        var foundText: String?

        for item in items {
            if foundTitle == nil, let text = item.attributedContentText?.string.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
                // Many apps put the page title here when sharing a URL.
                if !text.hasPrefix("http") { foundTitle = text }
            }
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
                    if let dictionary = await loadAny(provider, UTType.propertyList.identifier) as? [String: Any],
                       let results = dictionary[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any],
                       let capture = PageCapture(dictionary: results) {
                        return .safariPage(capture)
                    }
                }
            }
        }

        for item in items {
            for provider in item.attachments ?? [] {
                if foundURL == nil, provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    let value = await loadAny(provider, UTType.url.identifier)
                    if let url = value as? URL { foundURL = url }
                    else if let data = value as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) { foundURL = url }
                    else if let string = value as? String, let url = URL(string: string) { foundURL = url }
                }
                if foundText == nil, provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    let value = await loadAny(provider, UTType.plainText.identifier)
                    if let string = value as? String { foundText = string }
                    else if let data = value as? Data, let string = String(data: data, encoding: .utf8) { foundText = string }
                }
            }
        }

        if let url = foundURL, url.scheme?.hasPrefix("http") == true {
            if let text = foundText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty, text != url.absoluteString {
                return .text(text, url: url)
            }
            return .url(url, title: foundTitle)
        }
        if let text = foundText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
            if let url = URL(string: text), url.scheme?.hasPrefix("http") == true, !text.contains(" ") {
                return .url(url, title: nil)
            }
            return .text(text, url: nil)
        }
        throw ShareItemLoaderError.nothingShareable
    }

    /// `loadItem` returns `NSSecureCoding`; surface it as `Any` so callers can bridge to Swift types.
    private static func loadAny(_ provider: NSItemProvider, _ type: String) async -> Any? {
        await withCheckedContinuation { continuation in
            provider.loadItem(forTypeIdentifier: type, options: nil) { value, _ in
                continuation.resume(returning: value as Any?)
            }
        }
    }
}
