import Foundation
import WebToICSCore

/// `webtoics://batch`, `webtoics://job/<uuid>`, `webtoics://settings`.
enum DeepLink: Equatable {
    case batch
    case job(UUID)
    case settings

    init?(url: URL) {
        guard url.scheme?.lowercased() == AppIdentifiers.urlScheme else { return nil }
        let host = url.host?.lowercased() ?? ""
        let path = url.path.split(separator: "/").map(String.init)
        switch host {
        case "batch", "": self = .batch
        case "settings": self = .settings
        case "job":
            guard let first = path.first, let id = UUID(uuidString: first) else { return nil }
            self = .job(id)
        default:
            return nil
        }
    }
}
