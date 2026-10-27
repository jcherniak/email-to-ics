import Foundation

/// File names inside `Jobs/<uuid>/`.
public enum JobArtifact {
    public static let job = "job.json"
    public static let pageText = "page.txt"
    public static let rawHTML = "raw.html"
    public static let result = "result.json"
    public static let resolved = "resolved.json"

    public static func request(stage: JobStage, attempt: Int) -> String { "\(stage.rawValue)-\(attempt).request.json" }
    public static func response(stage: JobStage, attempt: Int, ext: String = "json") -> String { "\(stage.rawValue)-\(attempt).response.\(ext)" }
}

public enum JobStoreError: Error, LocalizedError, Equatable {
    case notFound(UUID)
    case corrupt(UUID)

    public var errorDescription: String? {
        switch self {
        case .notFound(let id): return "Job \(id.uuidString) not found."
        case .corrupt(let id): return "Job \(id.uuidString) could not be read."
        }
    }
}

public protocol JobStore: Sendable {
    var containerURL: URL { get }
    func create(_ job: ShareJob) throws
    func load(_ id: UUID) throws -> ShareJob
    @discardableResult
    func update(_ id: UUID, _ mutate: (inout ShareJob) throws -> Void) throws -> ShareJob
    func all(includeCleared: Bool) throws -> [ShareJob]
    func delete(_ id: UUID) throws
    func jobDirectory(_ id: UUID) -> URL
    func writeArtifact(_ data: Data, job: UUID, name: String) throws -> URL
    func readArtifact(job: UUID, name: String) -> Data?
    func artifactURL(job: UUID, name: String) -> URL
    func removeArtifact(job: UUID, name: String)
}

public extension JobStore {
    func writeArtifact(_ string: String, job: UUID, name: String) throws -> URL {
        try writeArtifact(Data(string.utf8), job: job, name: name)
    }

    func readArtifactString(job: UUID, name: String) -> String? {
        readArtifact(job: job, name: name).map { String(decoding: $0, as: UTF8.self) }
    }

    func hasArtifact(job: UUID, name: String) -> Bool {
        FileManager.default.fileExists(atPath: artifactURL(job: job, name: name).path)
    }
}

/// App Group file layout: `<container>/Jobs/<uuid>/...`.
public final class FileJobStore: JobStore, @unchecked Sendable {
    public let containerURL: URL
    private let lock = NSLock()

    public init(containerURL: URL) {
        self.containerURL = containerURL
    }

    #if canImport(Darwin)
    /// Store rooted at the shared App Group container.
    public static func appGroup(_ identifier: String = AppIdentifiers.appGroup) -> FileJobStore? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) else { return nil }
        return FileJobStore(containerURL: url)
    }
    #endif

    public var jobsDirectory: URL { containerURL.appendingPathComponent("Jobs", isDirectory: true) }

    public func jobDirectory(_ id: UUID) -> URL {
        jobsDirectory.appendingPathComponent(id.uuidString, isDirectory: true)
    }

    public func artifactURL(job: UUID, name: String) -> URL {
        jobDirectory(job).appendingPathComponent(name)
    }

    public func create(_ job: ShareJob) throws {
        try lock.withLock {
            try FileManager.default.createDirectory(at: jobDirectory(job.id), withIntermediateDirectories: true)
            try writeJobLocked(job)
        }
    }

    public func load(_ id: UUID) throws -> ShareJob {
        try lock.withLock { try loadLocked(id) }
    }

    @discardableResult
    public func update(_ id: UUID, _ mutate: (inout ShareJob) throws -> Void) throws -> ShareJob {
        try lock.withLock {
            var job = try loadLocked(id)
            try mutate(&job)
            job.state.updatedAt = Date()
            try writeJobLocked(job)
            return job
        }
    }

    public func all(includeCleared: Bool = false) throws -> [ShareJob] {
        try lock.withLock {
            guard let entries = try? FileManager.default.contentsOfDirectory(at: jobsDirectory, includingPropertiesForKeys: nil) else {
                return []
            }
            var jobs: [ShareJob] = []
            for entry in entries {
                guard let id = UUID(uuidString: entry.lastPathComponent), let job = try? loadLocked(id) else { continue }
                if includeCleared || !job.cleared { jobs.append(job) }
            }
            return jobs.sorted { $0.createdAt < $1.createdAt }
        }
    }

    public func delete(_ id: UUID) throws {
        try lock.withLock {
            let dir = jobDirectory(id)
            if FileManager.default.fileExists(atPath: dir.path) {
                try FileManager.default.removeItem(at: dir)
            }
        }
    }

    public func writeArtifact(_ data: Data, job: UUID, name: String) throws -> URL {
        let url = artifactURL(job: job, name: name)
        try AtomicFile.write(data, to: url)
        return url
    }

    public func readArtifact(job: UUID, name: String) -> Data? {
        try? Data(contentsOf: artifactURL(job: job, name: name))
    }

    public func removeArtifact(job: UUID, name: String) {
        try? FileManager.default.removeItem(at: artifactURL(job: job, name: name))
    }

    private func loadLocked(_ id: UUID) throws -> ShareJob {
        let url = artifactURL(job: id, name: JobArtifact.job)
        guard let data = try? Data(contentsOf: url) else { throw JobStoreError.notFound(id) }
        do {
            return try JSONCoding.decoder.decode(ShareJob.self, from: data)
        } catch {
            throw JobStoreError.corrupt(id)
        }
    }

    private func writeJobLocked(_ job: ShareJob) throws {
        let data = try JSONCoding.encoder.encode(job)
        try AtomicFile.write(data, to: artifactURL(job: job.id, name: JobArtifact.job))
    }
}
