import Foundation

/// Identifiers shared by the app, the share extension and the widget extension.
public enum AppIdentifiers {
    public static let bundleIDPrefix = "com.justin-c.web-to-ics"
    public static let appBundleID = bundleIDPrefix
    public static let shareExtensionBundleID = bundleIDPrefix + ".share"
    public static let widgetExtensionBundleID = bundleIDPrefix + ".widgets"
    /// App Group shared by all three targets. Also used as the Keychain access group.
    public static let appGroup = "group.com.justin-c.web-to-ics"
    /// Custom URL scheme the share extension uses to open the app.
    public static let urlScheme = "webtoics"
    /// Prefix for background `URLSession` identifiers (one session per job stage attempt).
    public static let backgroundSessionPrefix = bundleIDPrefix + ".job."

    public static func deepLink(_ path: String) -> URL {
        URL(string: "\(urlScheme)://\(path)")!
    }

    public static var batchDeepLink: URL { deepLink("batch") }

    public static func jobDeepLink(_ id: UUID) -> URL {
        deepLink("job/\(id.uuidString)")
    }
}
