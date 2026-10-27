import Foundation

/// RFC 5545 content-line helpers: text escaping, 75-octet folding, CRLF.
public enum ICSWriter {
    public static let crlf = "\r\n"
    public static let maxLineOctets = 75

    /// Escapes `\`, `;`, `,` and newlines; drops other control characters. Literal `\n` sequences already in
    /// the text are first turned into real newlines so they are not double-escaped.
    public static func escapeText(_ value: String) -> String {
        var text = value.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        text = text.replacingOccurrences(of: "\\n", with: "\n")
        var out = ""
        out.reserveCapacity(text.count + 16)
        for scalar in text.unicodeScalars {
            switch scalar {
            case "\\": out += "\\\\"
            case ";": out += "\;"
            case ",": out += "\\,"
            case "\n": out += "\\n"
            default:
                if scalar.value < 0x20 || scalar.value == 0x7f { continue }
                out.unicodeScalars.append(scalar)
            }
        }
        return out
    }

    /// Removes control characters without escaping (for URIs and other non-TEXT values).
    public static func sanitizeValue(_ value: String) -> String {
        String(String.UnicodeScalarView(value.unicodeScalars.filter { $0.value >= 0x20 && $0.value != 0x7f }))
    }

    /// Folds one logical line into physical lines of at most 75 octets, continuation lines prefixed with a
    /// single space, never splitting a UTF-8 sequence. Returns the lines without terminators.
    public static func fold(_ line: String) -> [String] {
        let bytes = Array(line.utf8)
        guard bytes.count > maxLineOctets else { return [line] }
        var lines: [String] = []
        var index = 0
        var limit = maxLineOctets
        while index < bytes.count {
            var end = min(index + limit, bytes.count)
            if end < bytes.count {
                // Back up to a UTF-8 scalar boundary (a byte that is not a continuation byte 10xxxxxx).
                while end > index && (bytes[end] & 0xC0) == 0x80 { end -= 1 }
                if end == index { end = min(index + limit, bytes.count) }
            }
            let chunk = String(decoding: bytes[index..<end], as: UTF8.self)
            lines.append(lines.isEmpty ? chunk : " " + chunk)
            index = end
            limit = maxLineOctets - 1
        }
        return lines
    }

    /// Builds `NAME;PARAM=VALUE:value` and folds it.
    public static func contentLine(_ name: String, parameters: [(String, String)] = [], value: String) -> [String] {
        var line = name
        for (key, parameterValue) in parameters {
            line += ";\(key)=\(parameterValue)"
        }
        line += ":" + value
        return fold(line)
    }

    public static func join(_ lines: [String]) -> String {
        lines.joined(separator: crlf) + crlf
    }

    public static func formatOffset(_ seconds: Int) -> String {
        let sign = seconds < 0 ? "-" : "+"
        let total = abs(seconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        return String(format: "%@%02d%02d", sign, hours, minutes)
    }
}
