import Foundation
import XCTest
@testable import WebToICSCore

enum Fixtures {
    static func url(_ name: String) -> URL {
        if let url = Bundle.module.url(forResource: name, withExtension: nil, subdirectory: "Fixtures") { return url }
        let parts = name.split(separator: ".", maxSplits: 1).map(String.init)
        if parts.count == 2, let url = Bundle.module.url(forResource: parts[0], withExtension: parts[1], subdirectory: "Fixtures") { return url }
        fatalError("missing fixture \(name)")
    }

    static func data(_ name: String) -> Data { try! Data(contentsOf: url(name)) }
    static func string(_ name: String) -> String { String(decoding: data(name), as: UTF8.self) }

    static func presidioResult() -> ExtractionResult {
        try! JSONDecoder().decode(ExtractionResult.self, from: data("presidio-ai-output.expected.json"))
    }

    /// Wraps assistant text into an OpenRouter chat-completions reply.
    static func chatReply(content: String) -> Data {
        let obj: [String: Any] = ["choices": [["message": ["role": "assistant", "content": content]]]]
        return try! JSONSerialization.data(withJSONObject: obj)
    }

    static func date(_ iso: String) -> Date {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: iso)!
    }
}

func jsonObject(_ data: Data) -> [String: Any] {
    try! JSONSerialization.jsonObject(with: data) as! [String: Any]
}
