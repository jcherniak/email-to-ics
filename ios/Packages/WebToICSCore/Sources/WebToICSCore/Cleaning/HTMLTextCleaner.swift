import Foundation

/// Last-resort HTML to text conversion used when a page was fetched directly (no Safari DOM, no Firecrawl,
/// no web view). Drops chrome elements, turns block tags into line breaks, strips tags, decodes entities.
public enum HTMLTextCleaner {
    public static let maximumCharacters = 200_000

    public struct Result: Equatable, Sendable {
        public var text: String
        public var title: String?
        public var truncated: Bool
    }

    public static func clean(html: String, limit: Int = maximumCharacters) -> Result {
        var s = html
        let title = firstMatch(in: s, pattern: "<title[^>]*>(.*?)</title>")
            .map { decodeEntities(collapseWhitespace($0)) }
            .flatMap { $0.isEmpty ? nil : $0 }
        s = replace(in: s, pattern: "<!--.*?-->", with: " ")
        for tag in ["script", "style", "noscript", "svg", "iframe", "template", "nav", "footer", "header"] {
            s = replace(in: s, pattern: "<\(tag)\\b[^>]*>.*?</\(tag)\\s*>", with: " ")
        }
        s = replace(in: s, pattern: "<br\\s*/?>", with: "\n")
        s = replace(in: s, pattern: "</?(p|div|li|tr|h[1-6]|section|article|td|th|dt|dd|blockquote|pre|ul|ol|table|thead|tbody|main|aside|figure|figcaption)\\b[^>]*>", with: "\n")
        s = replace(in: s, pattern: "<[^>]+>", with: " ")
        s = decodeEntities(s)
        s = normalizeWhitespace(s)
        let truncated = s.count > limit
        if truncated { s = String(s.prefix(limit)) }
        return Result(text: s, title: title, truncated: truncated)
    }

    static func normalizeWhitespace(_ input: String) -> String {
        var s = input.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        s = replace(in: s, pattern: "[ \\t\\u00a0\\u2000-\\u200b]+", with: " ")
        s = replace(in: s, pattern: " *\\n *", with: "\n")
        s = replace(in: s, pattern: "\\n{3,}", with: "\n\n")
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func collapseWhitespace(_ input: String) -> String {
        replace(in: input, pattern: "\\s+", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static let namedEntities: [String: String] = [
        "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": "\u{00a0}",
        "ndash": "\u{2013}", "mdash": "\u{2014}", "hellip": "\u{2026}", "copy": "\u{00a9}", "reg": "\u{00ae}",
        "lsquo": "\u{2018}", "rsquo": "\u{2019}", "ldquo": "\u{201c}", "rdquo": "\u{201d}", "bull": "\u{2022}",
        "middot": "\u{00b7}", "times": "\u{00d7}", "deg": "\u{00b0}", "euro": "\u{20ac}", "pound": "\u{00a3}",
    ]

    public static func decodeEntities(_ input: String) -> String {
        guard input.contains("&") else { return input }
        let regex = try! NSRegularExpression(pattern: "&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);")
        let ns = input as NSString
        var out = ""
        var last = 0
        for m in regex.matches(in: input, range: NSRange(location: 0, length: ns.length)) {
            out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
            let body = ns.substring(with: m.range(at: 1))
            var replacement: String? = nil
            if body.hasPrefix("#x") || body.hasPrefix("#X") {
                if let v = UInt32(body.dropFirst(2), radix: 16), let scalar = Unicode.Scalar(v) { replacement = String(Character(scalar)) }
            } else if body.hasPrefix("#") {
                if let v = UInt32(body.dropFirst(1)), let scalar = Unicode.Scalar(v) { replacement = String(Character(scalar)) }
            } else {
                replacement = namedEntities[body.lowercased()]
            }
            out += replacement ?? ns.substring(with: m.range)
            last = m.range.location + m.range.length
        }
        out += ns.substring(from: last)
        return out
    }

    static func replace(in input: String, pattern: String, with template: String) -> String {
        let regex = try! NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators])
        return regex.stringByReplacingMatches(in: input, range: NSRange(location: 0, length: (input as NSString).length),
                                              withTemplate: template)
    }

    static func firstMatch(in input: String, pattern: String) -> String? {
        let regex = try! NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators])
        let ns = input as NSString
        guard let m = regex.firstMatch(in: input, range: NSRange(location: 0, length: ns.length)), m.numberOfRanges > 1 else {
            return nil
        }
        return ns.substring(with: m.range(at: 1))
    }
}
