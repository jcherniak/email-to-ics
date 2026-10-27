import XCTest
@testable import WebToICSCore

final class ActivityFlagTests: XCTestCase {
    let now = Fixtures.date("2026-05-01T12:00:00Z")

    func testDecisions() {
        let fresh = ActivityFlag.decide(existing: nil, now: now)
        XCTAssertTrue(fresh.shouldOpenApp)
        XCTAssertNotNil(fresh.flagToWrite)
        XCTAssertNil(fresh.flagToWrite?.activityID)

        let waiting = ActivityFlag(batchID: fresh.batchID, activityID: nil, startedAt: now, lastUpdated: now)
        let second = ActivityFlag.decide(existing: waiting, now: now.addingTimeInterval(5))
        XCTAssertEqual(second.batchID, fresh.batchID)
        XCTAssertTrue(second.shouldOpenApp, "app has not started the activity yet, so open it again")
        XCTAssertNil(second.flagToWrite)

        let live = ActivityFlag(batchID: fresh.batchID, activityID: "act-1", startedAt: now, lastUpdated: now)
        let third = ActivityFlag.decide(existing: live, now: now.addingTimeInterval(60))
        XCTAssertEqual(third.batchID, fresh.batchID)
        XCTAssertFalse(third.shouldOpenApp)

        let stale = ActivityFlag.decide(existing: live, now: now.addingTimeInterval(7 * 3600))
        XCTAssertNotEqual(stale.batchID, fresh.batchID)
        XCTAssertTrue(stale.shouldOpenApp)

        let disabled = ActivityFlag(batchID: UUID(), activityID: nil, startedAt: now, lastUpdated: now, disabled: true)
        let fourth = ActivityFlag.decide(existing: disabled, now: now)
        XCTAssertFalse(fourth.shouldOpenApp)
        XCTAssertEqual(fourth.batchID, disabled.batchID)
        let staleDisabled = ActivityFlag.decide(existing: disabled, now: now.addingTimeInterval(8 * 3600))
        XCTAssertFalse(staleDisabled.shouldOpenApp)
        XCTAssertEqual(staleDisabled.flagToWrite?.disabled, true)
    }

    func testStoreRoundTrip() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: dir) }
        XCTAssertNil(ActivityFlagStore.load(containerURL: dir))
        let flag = ActivityFlag(batchID: UUID(), activityID: "a", startedAt: now, lastUpdated: now)
        try ActivityFlagStore.save(flag, containerURL: dir)
        XCTAssertEqual(ActivityFlagStore.load(containerURL: dir), flag)
        ActivityFlagStore.clear(containerURL: dir)
        XCTAssertNil(ActivityFlagStore.load(containerURL: dir))
    }
}
