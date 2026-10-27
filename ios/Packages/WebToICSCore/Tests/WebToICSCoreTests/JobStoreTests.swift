import XCTest
@testable import WebToICSCore

final class JobStoreTests: XCTestCase {
    func testCreateLoadUpdateListDelete() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let a = h.makeJob()
        let b = h.makeJob(tier: .firecrawl, kind: .urlOnly, pageText: nil, rawHTML: nil)
        XCTAssertEqual(try h.store.load(a.id), a)
        XCTAssertEqual(try h.store.all(includeCleared: false).map(\.id), [a.id, b.id])

        let updated = try h.store.update(a.id) { $0.firstSummary = "Changed"; $0.cleared = true }
        XCTAssertEqual(updated.firstSummary, "Changed")
        XCTAssertGreaterThanOrEqual(updated.state.updatedAt, a.state.updatedAt)
        XCTAssertEqual(try h.store.all(includeCleared: false).map(\.id), [b.id])
        XCTAssertEqual(try h.store.all(includeCleared: true).count, 2)

        XCTAssertTrue(h.store.hasArtifact(job: a.id, name: JobArtifact.pageText))
        XCTAssertEqual(h.store.readArtifactString(job: a.id, name: JobArtifact.pageText), "Doubt. May 29, 2026 7:30 PM at Presidio Theatre.")
        h.store.removeArtifact(job: a.id, name: JobArtifact.pageText)
        XCTAssertFalse(h.store.hasArtifact(job: a.id, name: JobArtifact.pageText))

        try h.store.delete(a.id)
        XCTAssertThrowsError(try h.store.load(a.id)) { e in XCTAssertEqual(e as? JobStoreError, .notFound(a.id)) }
        XCTAssertFalse(FileManager.default.fileExists(atPath: h.store.jobDirectory(a.id).path))
    }

    func testAtomicWriteReplacesExistingFile() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("nested/file.txt")
        try AtomicFile.write("one", to: url)
        try AtomicFile.write("two", to: url)
        XCTAssertEqual(try String(contentsOf: url, encoding: .utf8), "two")
        let leftovers = try FileManager.default.contentsOfDirectory(atPath: dir.appendingPathComponent("nested").path)
        XCTAssertEqual(leftovers, ["file.txt"])
    }

    func testCorruptJobIsReported() throws {
        let h = JobHarness()
        defer { h.cleanup() }
        let job = h.makeJob()
        _ = try h.store.writeArtifact("{not json", job: job.id, name: JobArtifact.job)
        XCTAssertThrowsError(try h.store.load(job.id)) { e in XCTAssertEqual(e as? JobStoreError, .corrupt(job.id)) }
        XCTAssertEqual(try h.store.all(includeCleared: true).count, 0)
    }
}
