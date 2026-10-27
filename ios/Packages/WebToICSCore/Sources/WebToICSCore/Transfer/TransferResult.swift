import Foundation

/// A network request to run as a background `URLSession` task.
public struct StageRequest: Sendable {
    public var identifier: SessionIdentifier
    public var urlRequest: URLRequest
    /// Upload body on disk (required for background upload tasks). nil for download (GET) tasks.
    public var bodyFile: URL?
    public var isDownload: Bool

    public init(identifier: SessionIdentifier, urlRequest: URLRequest, bodyFile: URL?, isDownload: Bool) {
        self.identifier = identifier
        self.urlRequest = urlRequest
        self.bodyFile = bodyFile
        self.isDownload = isDownload
    }
}

/// Outcome of a finished background task, delivered to `StageRunner.handle`.
public struct TransferResult: Sendable {
    public var identifier: SessionIdentifier
    public var httpStatus: Int?
    public var body: Data?
    /// For download tasks: where the response body was moved to.
    public var fileURL: URL?
    public var error: String?

    public init(identifier: SessionIdentifier, httpStatus: Int? = nil, body: Data? = nil, fileURL: URL? = nil, error: String? = nil) {
        self.identifier = identifier
        self.httpStatus = httpStatus
        self.body = body
        self.fileURL = fileURL
        self.error = error
    }

    /// Response body from memory or from the downloaded file.
    public func responseData() -> Data? {
        if let body, !body.isEmpty { return body }
        if let fileURL { return try? Data(contentsOf: fileURL) }
        return nil
    }
}

/// Starts background transfers. Implemented by `BackgroundTransferCenter` (app + extension) and by fakes in tests.
public protocol TransferStarting: Sendable {
    func start(_ request: StageRequest) throws
}
