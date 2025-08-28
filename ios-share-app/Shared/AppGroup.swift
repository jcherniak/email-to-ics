import Foundation

enum AppGroup {
    // Replace with your real App Group ID
    static let identifier = "group.com.example.emailtoics"

    static func containerURL() -> URL {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) else {
            fatalError("App Group container not found. Update AppGroup.identifier and enable capability.")
        }
        return url
    }

    static var sharedPayloadURL: URL {
        containerURL().appendingPathComponent("shared-payload.json")
    }
}

