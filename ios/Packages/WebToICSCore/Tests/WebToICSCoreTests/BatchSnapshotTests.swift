import XCTest
@testable import WebToICSCore

final class BatchSnapshotTests: XCTestCase {
    private var order = 0
    private func job(_ batch: UUID, stage: JobStage, status: StageStatus, completed: [JobStage], retried: Bool = false, title: String) -> ShareJob {
        order += 1
        let created = Fixtures.date("2026-05-01T12:00:00Z").addingTimeInterval(Double(order))
        var j = ShareJob(createdAt: created, batch: batch, title: title)
        j.state = JobState(stage: stage, status: status, updatedAt: created, completedStages: completed, retriedWithRawHTML: retried)
        return j
    }

    func testWeightedProgress() {
        let batch = UUID()
        var jobs: [ShareJob] = []
        for i in 0..<3 { jobs.append(job(batch, stage: .ready, status: .done, completed: [.capture, .extract, .geocode], title: "Ready \(i)")) }
        jobs.append(job(batch, stage: .geocode, status: .pending, completed: [.capture, .extract], title: "Geocoding"))
        for i in 0..<5 { jobs.append(job(batch, stage: .extract, status: .inFlight, completed: [.capture], title: "Extracting \(i)")) }
        jobs.append(job(batch, stage: .extract, status: .failed, completed: [.capture], title: "Broken"))
        let snapshot = BatchSnapshot.make(jobs: jobs, batchID: batch)
        XCTAssertEqual(snapshot.total, 10)
        XCTAssertEqual(snapshot.completed, 3)
        XCTAssertEqual(snapshot.failed, 1)
        XCTAssertEqual(snapshot.inProgress, 6)
        // weights: 3 × 6.5 + 6 + 6 × 1 = 31.5 of 65
        XCTAssertEqual(snapshot.progress, 31.5 / 65, accuracy: 0.0001)
        XCTAssertEqual(snapshot.percent, 48)
        XCTAssertEqual(snapshot.headline, "3 of 10 done · 48%")
        XCTAssertEqual(snapshot.currentTitle, "Geocoding")
        XCTAssertEqual(snapshot.currentStage, "Resolving location")
        XCTAssertEqual(snapshot.recent.count, 6)
        XCTAssertFalse(snapshot.isFinished)
    }

    func testRetryAddsWeightAndFinishedDetection() {
        let batch = UUID()
        let retried = job(batch, stage: .extract, status: .inFlight, completed: [.capture], retried: true, title: "Retry")
        XCTAssertEqual(StageWeights.totalWeight(for: retried), 11.5)
        XCTAssertEqual(StageWeights.completedWeight(for: retried), 1)
        var done = retried
        done.state = JobState(stage: .added, status: .done, completedStages: [.capture, .extract, .geocode, .ready], retriedWithRawHTML: true)
        XCTAssertEqual(StageWeights.completedWeight(for: done), 11.5)
        let snapshot = BatchSnapshot.make(jobs: [done], batchID: batch)
        XCTAssertEqual(snapshot.progress, 1)
        XCTAssertTrue(snapshot.isFinished)
        XCTAssertEqual(BatchSnapshot.make(jobs: []), .empty)
    }

    func testDismissedAndClearedJobsAreExcluded() {
        let batch = UUID()
        var dismissed = job(batch, stage: .extract, status: .dismissed, completed: [], title: "Gone")
        dismissed.state.status = .dismissed
        var cleared = job(batch, stage: .ready, status: .done, completed: [.capture, .extract, .geocode], title: "Old")
        cleared.cleared = true
        let other = job(UUID(), stage: .ready, status: .done, completed: [.capture, .extract, .geocode], title: "Other batch")
        XCTAssertEqual(BatchSnapshot.make(jobs: [dismissed, cleared, other], batchID: batch), .empty)
        XCTAssertEqual(BatchSnapshot.make(jobs: [dismissed, cleared, other]).total, 1)
    }
}

private extension ShareJob {
    init(createdAt: Date, batch: UUID, title: String) {
        self.init(createdAt: createdAt, batchID: batch,
                  source: JobSource(url: nil, title: title, contentKind: .dom, captureTier: .safariDOM),
                  options: JobOptions())
    }
}
