import XCTest
@testable import WebToICSCore

final class StageRunnerTests: XCTestCase {
    func testSafariJobFlowsToReady() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()

        let outcome = try h.runner.startNextStage(job.id)
        let identifier = SessionIdentifier(jobID: job.id, stage: .extract, attempt: 1)
        XCTAssertEqual(outcome, .startedTransfer(identifier))
        let request = try XCTUnwrap(h.transfer.last)
        XCTAssertFalse(request.isDownload)
        XCTAssertEqual(request.urlRequest.url, OpenRouterAPI.chatCompletionsURL)
        XCTAssertEqual(request.urlRequest.value(forHTTPHeaderField: "Authorization"), "Bearer sk-test")
        let messages = h.transfer.messages(of: request)
        XCTAssertEqual(messages.map { $0["role"]! }, ["system", "user", "user"])
        XCTAssertEqual(messages.last?["content"], "Content to analyze:\nDoubt. May 29, 2026 7:30 PM at Presidio Theatre.")
        XCTAssertTrue(messages[1]["content"]!.contains("https://venue.test/show"))
        XCTAssertTrue(h.store.hasArtifact(job: job.id, name: JobArtifact.request(stage: .extract, attempt: 1)))

        var stored = try h.store.load(job.id)
        XCTAssertEqual(stored.state.stage, .extract)
        XCTAssertEqual(stored.state.status, .inFlight)
        XCTAssertEqual(stored.state.sessionIdentifier, identifier.rawValue)
        XCTAssertEqual(stored.state.completedStages, [.capture])
        XCTAssertEqual(try h.runner.startNextStage(job.id), .nothing, "in-flight jobs are left alone")

        let handled = try h.runner.handle(h.reply(Fixtures.string("presidio-ai-output.expected.json"), for: request))
        guard case .needsGeocode(let result) = handled else { return XCTFail("expected needsGeocode, got \(handled)") }
        XCTAssertEqual(result.eventData.count, 3)
        stored = try h.store.load(job.id)
        XCTAssertEqual(stored.state.stage, .geocode)
        XCTAssertEqual(stored.state.status, .pending)
        XCTAssertEqual(stored.eventCount, 3)
        XCTAssertEqual(stored.firstSummary, "Opera Parallele - Doubt")
        XCTAssertEqual(stored.displayTitle, "Opera Parallele - Doubt")
        XCTAssertNotNil(h.runner.loadResult(job.id))
        XCTAssertTrue(h.store.hasArtifact(job: job.id, name: JobArtifact.response(stage: .extract, attempt: 1)))
        XCTAssertEqual(try h.runner.startNextStage(job.id), .needsGeocode)

        let resolved = result.eventData.map { ResolvedEvent(event: $0, location: ResolvedLocation(displayName: "Presidio Theatre", formattedAddress: "99 Moraga Ave, San Francisco, CA 94129", provider: "test"), tentative: true) }
        try h.runner.markGeocoded(job.id, resolved: resolved)
        stored = try h.store.load(job.id)
        XCTAssertTrue(stored.isReady)
        XCTAssertEqual(stored.state.completedStages, [.capture, .extract, .geocode])
        XCTAssertEqual(h.runner.loadResolved(job.id)?.count, 3)
        XCTAssertFalse(h.store.hasArtifact(job: job.id, name: JobArtifact.rawHTML), "raw HTML is dropped once ready")
        XCTAssertEqual(try h.runner.startNextStage(job.id), .ready)

        try h.runner.markAdded(job.id)
        XCTAssertTrue(try h.store.load(job.id).isAdded)
        XCTAssertEqual(BatchSnapshot.make(jobs: try h.store.all(includeCleared: false)).progress, 1)
    }

    func testExtractionFailureRetriesWithRawHTMLThenFails() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        try h.runner.startNextStage(job.id)
        let first = try XCTUnwrap(h.transfer.last)

        let failure = "{\"success\":false,\"errorMessage\":\"Content didn't contain dates or times\",\"eventData\":[],\"emailSubject\":\"\",\"locationLookup\":\"\"}"
        let handled = try h.runner.handle(h.reply(failure, for: first))
        guard case .advanced(let next) = handled else { return XCTFail("expected a retry, got \(handled)") }
        XCTAssertEqual(next, .startedTransfer(SessionIdentifier(jobID: job.id, stage: .extract, attempt: 2)))
        XCTAssertEqual(h.transfer.requests.count, 2)
        let second = try XCTUnwrap(h.transfer.last)
        let content = h.transfer.messages(of: second).last!["content"]!
        XCTAssertTrue(content.contains("raw page HTML"))
        XCTAssertTrue(content.contains("<h1>Doubt</h1>"))
        var stored = try h.store.load(job.id)
        XCTAssertTrue(stored.state.retriedWithRawHTML)
        XCTAssertEqual(stored.state.attempt, 2)
        XCTAssertEqual(stored.state.status, .inFlight)
        XCTAssertEqual(StageWeights.totalWeight(for: stored), 11.5)

        XCTAssertEqual(try h.runner.handle(h.reply(failure, for: first)).isIgnored, true, "stale first-attempt result is ignored")

        let final = try h.runner.handle(h.reply(failure, for: second))
        guard case .failed(let message) = final else { return XCTFail("expected failure, got \(final)") }
        XCTAssertTrue(message.contains("dates"))
        stored = try h.store.load(job.id)
        XCTAssertTrue(stored.isFailed)
        XCTAssertEqual(stored.state.lastError, message)

        XCTAssertEqual(try h.runner.retry(job.id), .startedTransfer(SessionIdentifier(jobID: job.id, stage: .extract, attempt: 3)))
        XCTAssertEqual(try h.store.load(job.id).state.status, .inFlight)
    }

    func testFailureWithoutRawHTMLFailsImmediately() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob(rawHTML: nil)
        try h.runner.startNextStage(job.id)
        let request = try XCTUnwrap(h.transfer.last)
        let handled = try h.runner.handle(h.reply("{oops", for: request))
        guard case .failed = handled else { return XCTFail("expected failed, got \(handled)") }
        XCTAssertEqual(h.transfer.requests.count, 1)
    }

    func testHTTPStatusHandling() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        try h.runner.startNextStage(job.id)
        let request = try XCTUnwrap(h.transfer.last)
        let server = TransferResult(identifier: request.identifier, httpStatus: 503, body: Data("busy".utf8))
        guard case .advanced = try h.runner.handle(server) else { return XCTFail("503 should retry with raw HTML") }
        let second = try XCTUnwrap(h.transfer.last)
        let unauthorized = TransferResult(identifier: second.identifier, httpStatus: 401, body: Data("{\"error\":{\"message\":\"bad key\"}}".utf8))
        guard case .failed(let message) = try h.runner.handle(unauthorized) else { return XCTFail("401 must fail") }
        XCTAssertTrue(message.hasPrefix("HTTP 401"))
    }

    func testTransportErrorFailsJob() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        try h.runner.startNextStage(job.id)
        let request = try XCTUnwrap(h.transfer.last)
        let lost = TransferResult(identifier: request.identifier, httpStatus: nil, body: nil, error: "The request timed out.")
        guard case .failed(let message) = try h.runner.handle(lost) else { return XCTFail("expected failed") }
        XCTAssertEqual(message, "The request timed out.")
        XCTAssertEqual(h.transfer.requests.count, 1, "transport errors do not trigger the raw-HTML retry")
    }

    func testFirecrawlCaptureThenExtract() throws {
        let h = JobHarness(firecrawlKey: "fc-key")
        defer { h.cleanup() }
        let job = h.makeJob(tier: .firecrawl, kind: .urlOnly, pageText: nil, rawHTML: nil)
        let started = try h.runner.startNextStage(job.id)
        XCTAssertEqual(started, .startedTransfer(SessionIdentifier(jobID: job.id, stage: .capture, attempt: 1)))
        let capture = try XCTUnwrap(h.transfer.last)
        XCTAssertEqual(capture.urlRequest.url, FirecrawlAPI.scrapeURL)
        XCTAssertFalse(capture.isDownload)
        XCTAssertEqual(h.transfer.body(of: capture)["url"] as? String, "https://venue.test/show")

        let scrape = "{\"success\":true,\"data\":{\"markdown\":\"# Doubt\\n\\nMay 29, 2026 7:30 PM\",\"html\":\"<h1>Doubt</h1>\",\"metadata\":{\"title\":\"Doubt\"}}}"
        let handled = try h.runner.handle(TransferResult(identifier: capture.identifier, httpStatus: 200, body: Data(scrape.utf8)))
        guard case .advanced(let next) = handled else { return XCTFail("expected advance, got \(handled)") }
        XCTAssertEqual(next, .startedTransfer(SessionIdentifier(jobID: job.id, stage: .extract, attempt: 1)))
        XCTAssertEqual(h.store.readArtifactString(job: job.id, name: JobArtifact.pageText), "# Doubt\n\nMay 29, 2026 7:30 PM")
        XCTAssertEqual(h.store.readArtifactString(job: job.id, name: JobArtifact.rawHTML), "<h1>Doubt</h1>")
        let stored = try h.store.load(job.id)
        XCTAssertEqual(stored.source.cleanMethod, "firecrawl")
        XCTAssertEqual(stored.state.completedStages, [.capture])
        XCTAssertEqual(stored.state.stage, .extract)
        let content = h.transfer.messages(of: try XCTUnwrap(h.transfer.last)).last!["content"]!
        XCTAssertTrue(content.contains("# Doubt"))
    }

    func testFirecrawlWithoutKeyFails() throws {
        let h = JobHarness(firecrawlKey: nil)
        defer { h.cleanup() }
        let job = h.makeJob(tier: .firecrawl, kind: .urlOnly, pageText: nil, rawHTML: nil)
        XCTAssertEqual(try h.runner.startNextStage(job.id), .nothing)
        let stored = try h.store.load(job.id)
        XCTAssertTrue(stored.isFailed)
        XCTAssertEqual(stored.state.lastError, StageRunnerError.missingFirecrawlKey.localizedDescription)
    }

    func testDirectFetchCapture() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob(tier: .directFetch, kind: .urlOnly, pageText: nil, rawHTML: nil)
        try h.runner.startNextStage(job.id)
        let capture = try XCTUnwrap(h.transfer.last)
        XCTAssertTrue(capture.isDownload)
        XCTAssertNil(capture.bodyFile)
        XCTAssertEqual(capture.urlRequest.httpMethod, "GET")
        XCTAssertEqual(capture.urlRequest.url?.absoluteString, "https://venue.test/show")

        let dir = h.directory.appendingPathComponent("dl")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let file = dir.appendingPathComponent("page.download")
        try "<html><head><title>Doubt</title></head><body><nav>x</nav><main><p>May 29, 2026 7:30 PM</p></main></body></html>".write(to: file, atomically: true, encoding: .utf8)
        let handled = try h.runner.handle(TransferResult(identifier: capture.identifier, httpStatus: 200, body: nil, fileURL: file))
        guard case .advanced(.startedTransfer(let next)) = handled else { return XCTFail("expected extract to start, got \(handled)") }
        XCTAssertEqual(next.stage, .extract)
        XCTAssertEqual(h.store.readArtifactString(job: job.id, name: JobArtifact.pageText)?.contains("May 29, 2026 7:30 PM"), true)
        XCTAssertEqual(h.store.readArtifactString(job: job.id, name: JobArtifact.pageText)?.contains("<nav>"), false)
        XCTAssertTrue(h.store.hasArtifact(job: job.id, name: JobArtifact.rawHTML))
        XCTAssertEqual(try h.store.load(job.id).source.cleanMethod, "directFetch")
    }

    func testMissingOpenRouterKeyFailsBeforeUpload() throws {
        let h = JobHarness(openRouterKey: nil)
        defer { h.cleanup() }
        let job = h.makeJob()
        XCTAssertEqual(try h.runner.startNextStage(job.id), .nothing)
        let stored = try h.store.load(job.id)
        XCTAssertTrue(stored.isFailed)
        XCTAssertEqual(stored.state.lastError, StageRunnerError.missingOpenRouterKey.localizedDescription)
        XCTAssertTrue(h.transfer.requests.isEmpty)
    }

    func testTransferStartFailureMarksFailed() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        h.transfer.failNext = true
        XCTAssertEqual(try h.runner.startNextStage(job.id), .nothing)
        XCTAssertTrue(try h.store.load(job.id).isFailed)
        XCTAssertEqual(try h.runner.retry(job.id), .startedTransfer(SessionIdentifier(jobID: job.id, stage: .extract, attempt: 2)))
    }

    func testDismissAndSkipGeocode() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        try h.runner.startNextStage(job.id)
        let request = try XCTUnwrap(h.transfer.last)
        guard case .needsGeocode(let result) = try h.runner.handle(h.reply(Fixtures.string("presidio-ai-output.expected.json"), for: request)) else {
            return XCTFail("expected needsGeocode")
        }
        try h.runner.markGeocodeSkipped(job.id, result: result, tentative: false)
        let resolved = try XCTUnwrap(h.runner.loadResolved(job.id))
        XCTAssertEqual(resolved.count, 3)
        XCTAssertNil(resolved[0].location)
        XCTAssertFalse(resolved[0].tentative)
        XCTAssertEqual(resolved[0].locationText, "Presidio Theatre, 99 Moraga Ave, San Francisco, CA")
        try h.runner.dismiss(job.id)
        XCTAssertTrue(try h.store.load(job.id).isDismissed)
        XCTAssertEqual(BatchSnapshot.make(jobs: try h.store.all(includeCleared: false)), .empty)
    }

    func testUnknownJobIsIgnored() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let result = TransferResult(identifier: SessionIdentifier(jobID: UUID(), stage: .extract, attempt: 1), httpStatus: 200, body: Data())
        XCTAssertTrue(try h.runner.handle(result).isIgnored)
    }
}

private extension HandleOutcome {
    var isIgnored: Bool {
        if case .ignored = self { return true }
        return false
    }
}
