import XCTest
@testable import WebToICSCore

final class AppSettingsTests: XCTestCase {
    private func makeSettings() -> (AppSettings, String) {
        let suite = "webtoics.tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (AppSettings(defaults: defaults), suite)
    }

    func testDefaultsAndOverrides() {
        let (settings, suite) = makeSettings()
        defer { settings.defaults.removePersistentDomain(forName: suite) }
        XCTAssertEqual(settings.openRouterModel, ModelCatalog.defaultModelID)
        XCTAssertTrue(settings.defaultTentative)
        XCTAssertEqual(settings.defaultDestination, .appleCalendar)
        XCTAssertEqual(settings.defaultTimeZoneID, "America/Los_Angeles")
        XCTAssertNil(settings.customPrompt)
        settings.openRouterModel = "x/y"
        settings.defaultTentative = false
        settings.defaultDestination = .googleCalendar
        settings.customPrompt = "   "
        XCTAssertEqual(settings.openRouterModel, "x/y")
        XCTAssertFalse(settings.defaultTentative)
        XCTAssertEqual(settings.defaultDestination, .googleCalendar)
        XCTAssertNil(settings.customPrompt)
        settings.customPrompt = "- rule"
        XCTAssertEqual(settings.stageSettings.customPrompt, "- rule")
    }

    func testFirecrawlAndGoogleCalendarLogic() {
        let (settings, suite) = makeSettings()
        defer { settings.defaults.removePersistentDomain(forName: suite) }
        XCTAssertFalse(settings.isFirecrawlEnabled(hasKey: false))
        XCTAssertTrue(settings.isFirecrawlEnabled(hasKey: true))
        settings.firecrawlEnabledOverride = false
        XCTAssertFalse(settings.isFirecrawlEnabled(hasKey: true))
        settings.firecrawlEnabledOverride = nil
        XCTAssertTrue(settings.isFirecrawlEnabled(hasKey: true))

        XCTAssertNil(settings.googleCalendarID(tentative: true))
        settings.googleConfirmedCalendarID = "primary"
        XCTAssertEqual(settings.googleCalendarID(tentative: true), "primary")
        settings.googleTentativeCalendarID = "maybe"
        XCTAssertEqual(settings.googleCalendarID(tentative: true), "maybe")
        XCTAssertEqual(settings.googleCalendarID(tentative: false), "primary")
    }

    func testModelCacheRoundTrip() {
        let (settings, suite) = makeSettings()
        defer { settings.defaults.removePersistentDomain(forName: suite) }
        XCTAssertNil(settings.modelCache)
        XCTAssertEqual(settings.modelOptions().count, ModelCatalog.priorityModels.count)
        let cache = ModelCatalogCache(fetchedAt: Fixtures.date("2026-01-01T00:00:00Z"), models: [ModelOption(id: "a/b", label: "AB")])
        settings.modelCache = cache
        XCTAssertEqual(settings.modelCache, cache)
        XCTAssertEqual(settings.modelOptions().map(\.id), ["a/b", ModelCatalog.defaultModelID])
        settings.modelCache = nil
        XCTAssertNil(settings.modelCache)
    }

    func testInMemorySecretStore() throws {
        let store = InMemorySecretStore([.openRouterAPIKey: "k"])
        XCTAssertEqual(store.snapshot().openRouterKey, "k")
        XCTAssertNil(store.snapshot().firecrawlKey)
        XCTAssertTrue(store.has(.openRouterAPIKey))
        XCTAssertFalse(store.has(.firecrawlAPIKey))
        try store.set(" ", for: .firecrawlAPIKey)
        XCTAssertFalse(store.has(.firecrawlAPIKey))
    }
}
