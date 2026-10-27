import Foundation
import XCTest
@testable import WebToICSCore

final class FakeTransfer: TransferStarting, @unchecked Sendable {
    private let lock = NSLock()
    private(set) var requests: [StageRequest] = []
    var failNext = false

    func start(_ request: StageRequest) throws {
        try lock.withLock {
            if failNext {
                failNext = false
                throw NSError(domain: "fake", code: 1, userInfo: [NSLocalizedDescriptionKey: "no network"])
            }
            requests.append(request)
        }
    }

    var last: StageRequest? { lock.withLock { requests.last } }

    func body(of request: StageRequest) -> [String: Any] {
        jsonObject(try! Data(contentsOf: request.bodyFile!))
    }

    func messages(of request: StageRequest) -> [[String: String]] {
        body(of: request)["messages"] as! [[String: String]]
    }
}

struct JobHarness {
    /// Monotonic whole-second timestamps so stored (ISO-8601, second precision) jobs compare equal and sort stably.
    private static var counter = 0
    static func nextTimestamp() -> Date {
        counter += 1
        return Date(timeIntervalSince1970: floor(Date().timeIntervalSince1970) + Double(counter))
    }

    let directory: URL
    let store: FileJobStore
    let transfer = FakeTransfer()
    let runner: StageRunner

    init(openRouterKey: String? = "sk-test", firecrawlKey: String? = nil) {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent("webtoics-tests-\(UUID().uuidString)")
        try! FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        store = FileJobStore(containerURL: directory)
        runner = StageRunner(store: store,
                             settings: StageSettings(defaultTimeZoneID: "America/Los_Angeles"),
                             secrets: SecretsSnapshot(openRouterKey: openRouterKey, firecrawlKey: firecrawlKey),
                             transfer: transfer,
                             now: { Fixtures.date("2026-05-01T12:00:00Z") })
    }

    func cleanup() { try? FileManager.default.removeItem(at: directory) }

    @discardableResult
    func makeJob(tier: CaptureTier = .safariDOM, kind: ContentKind = .dom, url: String? = "https://venue.test/show",
                 pageText: String? = "Doubt. May 29, 2026 7:30 PM at Presidio Theatre.",
                 rawHTML: String? = "<html><body><h1>Doubt</h1><p>May 29, 2026 7:30 PM</p></body></html>",
                 options: JobOptions = JobOptions(instructions: "", tentative: true, model: "~openai/gpt-mini-latest", destination: .appleCalendar),
                 batchID: UUID = UUID()) -> ShareJob {
        let created = JobHarness.nextTimestamp()
        let job = ShareJob(createdAt: created, batchID: batchID,
                           source: JobSource(url: url, title: "Doubt | Presidio Theatre", contentKind: kind, captureTier: tier),
                           options: options, state: JobState(updatedAt: created))
        try! store.create(job)
        if let pageText { _ = try! store.writeArtifact(pageText, job: job.id, name: JobArtifact.pageText) }
        if let rawHTML { _ = try! store.writeArtifact(rawHTML, job: job.id, name: JobArtifact.rawHTML) }
        return job
    }

    func reply(_ content: String, for request: StageRequest, status: Int = 200) -> TransferResult {
        TransferResult(identifier: request.identifier, httpStatus: status, body: Fixtures.chatReply(content: content))
    }
}
