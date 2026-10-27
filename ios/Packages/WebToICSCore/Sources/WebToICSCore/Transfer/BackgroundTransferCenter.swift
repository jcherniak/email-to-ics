import Foundation

#if canImport(Darwin)
/// Background `URLSession` plumbing shared by the share extension (starts tasks) and the app (receives results,
/// also when launched in the background by the system). One session per stage attempt; the identifier encodes
/// the job, stage and attempt so the app can route the result without any in-memory state.
public final class BackgroundTransferCenter: NSObject, TransferStarting, URLSessionDataDelegate, URLSessionDownloadDelegate, @unchecked Sendable {
    public static let shared = BackgroundTransferCenter()

    /// Installed by the app; receives every finished task. Must persist state before returning because the
    /// process may be suspended right after the system completion handler runs.
    public var onResult: (@Sendable (TransferResult) async -> Void)?
    public var containerIdentifier = AppIdentifiers.appGroup
    /// Directory for downloaded response bodies; defaults to `<container>/Transfers`.
    public var downloadsDirectory: URL?
    public var log: (@Sendable (String) -> Void)?

    private let lock = NSLock()
    private var sessions: [String: URLSession] = [:]
    private var buffers: [String: Data] = [:]
    private var downloads: [String: URL] = [:]
    private var completionHandlers: [String: () -> Void] = [:]
    private var pendingResults: [String: Int] = [:]
    private var eventsFinished: Set<String> = []

    // MARK: Starting (extension and app)

    public func start(_ request: StageRequest) throws {
        let identifier = request.identifier.rawValue
        let session = session(for: identifier)
        let task: URLSessionTask
        if request.isDownload {
            task = session.downloadTask(with: request.urlRequest)
        } else {
            guard let file = request.bodyFile else {
                throw NSError(domain: "WebToICS.Transfer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Upload without body file"])
            }
            task = session.uploadTask(with: request.urlRequest, fromFile: file)
        }
        task.taskDescription = identifier
        task.resume()
        log?("started \(identifier)")
    }

    // MARK: Reconnecting (app)

    /// Called from `application(_:handleEventsForBackgroundURLSession:completionHandler:)`.
    public func reconnect(identifier: String, completion: @escaping () -> Void) {
        lock.withLock { completionHandlers[identifier] = completion }
        _ = session(for: identifier)
        log?("reconnected \(identifier)")
    }

    /// Attaches to a session that may still have tasks (foreground rescan).
    public func reconnectIfNeeded(identifier: String) {
        _ = session(for: identifier)
    }

    /// Number of live tasks on a session (0 means the transfer finished or was lost).
    public func taskCount(identifier: String) async -> Int {
        await session(for: identifier).allTasks.count
    }

    private func session(for identifier: String) -> URLSession {
        lock.withLock { () -> URLSession in
            if let existing = sessions[identifier] { return existing }
            let config = URLSessionConfiguration.background(withIdentifier: identifier)
            config.sharedContainerIdentifier = containerIdentifier
            config.isDiscretionary = false
            config.sessionSendsLaunchEvents = true
            config.timeoutIntervalForRequest = 300
            config.timeoutIntervalForResource = 900
            config.allowsCellularAccess = true
            let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
            sessions[identifier] = session
            return session
        }
    }

    private func sessionIdentifier(of session: URLSession) -> String? {
        session.configuration.identifier
    }

    // MARK: URLSessionDataDelegate

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let key = dataTask.taskDescription ?? sessionIdentifier(of: session) else { return }
        lock.withLock { buffers[key, default: Data()].append(data) }
    }

    // MARK: URLSessionDownloadDelegate

    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let key = downloadTask.taskDescription ?? sessionIdentifier(of: session) else { return }
        let directory = downloadsDirectory
            ?? FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: containerIdentifier)?.appendingPathComponent("Transfers", isDirectory: true)
            ?? FileManager.default.temporaryDirectory
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent("\(key).download")
            try? FileManager.default.removeItem(at: destination)
            try FileManager.default.moveItem(at: location, to: destination)
            lock.withLock { downloads[key] = destination }
        } catch {
            log?("download move failed for \(key): \(error)")
        }
    }

    // MARK: URLSessionTaskDelegate

    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let key = task.taskDescription ?? sessionIdentifier(of: session),
              let identifier = SessionIdentifier(rawValue: key) else { return }
        let (body, file) = lock.withLock { (buffers.removeValue(forKey: key), downloads.removeValue(forKey: key)) }
        let status = (task.response as? HTTPURLResponse)?.statusCode
        let result = TransferResult(identifier: identifier, httpStatus: status, body: body, fileURL: file,
                                    error: error?.localizedDescription)
        log?("finished \(key) status=\(status.map(String.init) ?? "-") error=\(error?.localizedDescription ?? "-")")
        lock.withLock { pendingResults[key, default: 0] += 1 }
        let handler = onResult
        Task.detached { [weak self] in
            await handler?(result)
            self?.finishedHandling(key)
        }
    }

    public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        guard let key = sessionIdentifier(of: session) else { return }
        lock.withLock { _ = eventsFinished.insert(key) }
        completeIfReady(key)
    }

    public func urlSession(_ session: URLSession, didBecomeInvalidWithError error: Error?) {
        guard let key = sessionIdentifier(of: session) else { return }
        lock.withLock { sessions.removeValue(forKey: key) }
    }

    private func finishedHandling(_ key: String) {
        lock.withLock { pendingResults[key] = max(0, (pendingResults[key] ?? 1) - 1) }
        completeIfReady(key)
    }

    /// Runs the system completion handler once events are finished and every result has been persisted.
    private func completeIfReady(_ key: String) {
        let handler: (() -> Void)? = lock.withLock { () -> (() -> Void)? in
            guard eventsFinished.contains(key), (pendingResults[key] ?? 0) == 0 else { return nil }
            eventsFinished.remove(key)
            pendingResults.removeValue(forKey: key)
            let h = completionHandlers.removeValue(forKey: key)
            sessions[key]?.finishTasksAndInvalidate()
            return h ?? {}
        }
        guard let handler else { return }
        DispatchQueue.main.async { handler() }
    }
}
#endif
