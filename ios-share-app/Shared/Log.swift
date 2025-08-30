import Foundation
import os

enum Log {
    static let general = Logger(subsystem: "EmailToICSApp", category: "general")
    static let network = Logger(subsystem: "EmailToICSApp", category: "network")
    static let parsing = Logger(subsystem: "EmailToICSApp", category: "parsing")
    static let web = Logger(subsystem: "EmailToICSApp", category: "web")

    static func redactKey(_ s: String) -> String {
        guard !s.isEmpty else { return "(empty)" }
        let p = s.prefix(4)
        let q = s.suffix(4)
        return "\(p)••••\(q) (len:\(s.count))"
    }

    static func truncate(_ str: String, max: Int = 2000) -> String {
        guard str.count > max else { return str }
        let head = str.prefix(max)
        return String(head) + "… (truncated, total: \(str.count))"
    }
}

