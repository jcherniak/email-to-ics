import Foundation

/// Write-to-temp-then-rename so the extension and the app never observe half-written files.
/// On Apple platforms the replace is wrapped in an `NSFileCoordinator` (no file presenters, per Apple's
/// guidance for extensions).
public enum AtomicFile {
    public static func write(_ data: Data, to url: URL) throws {
        let directory = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let temp = directory.appendingPathComponent(".\(url.lastPathComponent).tmp-\(UUID().uuidString)")
        try data.write(to: temp, options: [.atomic])
        #if canImport(Darwin)
        var coordinatorError: NSError?
        var replaceError: Error?
        NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: url, options: .forReplacing, error: &coordinatorError) { target in
            do {
                if FileManager.default.fileExists(atPath: target.path) {
                    _ = try FileManager.default.replaceItemAt(target, withItemAt: temp)
                } else {
                    try FileManager.default.moveItem(at: temp, to: target)
                }
            } catch {
                replaceError = error
            }
        }
        if let coordinatorError { throw coordinatorError }
        if let replaceError { throw replaceError }
        #else
        if FileManager.default.fileExists(atPath: url.path) {
            _ = try FileManager.default.replaceItemAt(url, withItemAt: temp)
        } else {
            try FileManager.default.moveItem(at: temp, to: url)
        }
        #endif
    }

    public static func write(_ string: String, to url: URL) throws {
        try write(Data(string.utf8), to: url)
    }
}
