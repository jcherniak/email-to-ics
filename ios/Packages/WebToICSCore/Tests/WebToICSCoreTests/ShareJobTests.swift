import XCTest
@testable import WebToICSCore

final class ShareJobTests: XCTestCase {
    func testCodableRoundTripAndFlags() throws {
        let created = Fixtures.date("2026-05-01T12:00:00Z")
        var job = ShareJob(createdAt: created, batchID: UUID(),
                           source: JobSource(url: "https://a.test/x", title: "Page", contentKind: .dom, captureTier: .safariDOM),
                           options: JobOptions(instructions: "i", tentative: false, model: "m", destination: .icsFile),
                           state: JobState(updatedAt: created))
        XCTAssertEqual(job.displayTitle, "Page")
        XCTAssertTrue(job.isInProgress)
        XCTAssertFalse(job.isDone)
        job.firstSummary = "Opera - Doubt"
        XCTAssertEqual(job.displayTitle, "Opera - Doubt")
        job.state.stage = .ready
        job.state.status = .done
        XCTAssertTrue(job.isReady)
        XCTAssertTrue(job.isDone)
        XCTAssertFalse(job.isInProgress)
        let data = try JSONCoding.encoder.encode(job)
        let decoded = try JSONCoding.decoder.decode(ShareJob.self, from: data)
        XCTAssertEqual(decoded, job)
    }

    func testDisplayTitleFallsBackToHost() {
        let job = ShareJob(batchID: UUID(), source: JobSource(url: "https://tickets.example.org/e/1", contentKind: .urlOnly, captureTier: .firecrawl),
                           options: JobOptions())
        XCTAssertEqual(job.displayTitle, "tickets.example.org")
        XCTAssertTrue(CaptureTier.safariDOM.isCapturedInExtension)
        XCTAssertFalse(CaptureTier.firecrawl.isCapturedInExtension)
    }
}
