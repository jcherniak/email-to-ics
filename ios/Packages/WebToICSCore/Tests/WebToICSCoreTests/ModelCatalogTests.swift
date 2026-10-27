import XCTest
@testable import WebToICSCore

final class ModelCatalogTests: XCTestCase {
    func testMergeKeepsPriorityFirstAndSortsOthers() throws {
        let json = """
        {"data":[{"id":"zeta/z","name":"Zeta"},{"id":"~openai/gpt-latest","name":"OpenAI: GPT Latest"},{"id":"alpha/a","name":"Alpha"},{"id":"alpha/a","name":"dup"},{"id":"noname/x"}]}
        """
        let models = try ModelCatalog.parseModels(Data(json.utf8))
        let merged = ModelCatalog.merge(apiModels: models)
        XCTAssertEqual(Array(merged.prefix(7).map(\.id)), ModelCatalog.priorityModels.map(\.id))
        XCTAssertEqual(merged[1].label, "OpenAI: GPT Latest")
        XCTAssertEqual(merged[0].label, "GPT Mini Latest")
        XCTAssertEqual(merged.dropFirst(7).map(\.id), ["alpha/a", "noname/x", "zeta/z"])
        XCTAssertEqual(merged.dropFirst(7).map(\.label), ["Alpha", "noname/x", "Zeta"])
        XCTAssertTrue(merged[0].isPriority)
        XCTAssertFalse(merged.last!.isPriority)
    }

    func testOptionsIncludeSelectedModel() {
        let options = ModelCatalog.options(including: "custom/model", from: nil)
        XCTAssertEqual(options.last?.id, "custom/model")
        XCTAssertEqual(options.count, ModelCatalog.priorityModels.count + 1)
        XCTAssertEqual(ModelCatalog.options(including: ModelCatalog.defaultModelID, from: nil).count, ModelCatalog.priorityModels.count)
    }

    func testCacheFreshness() {
        let cache = ModelCatalogCache(fetchedAt: Fixtures.date("2026-01-01T00:00:00Z"), models: [])
        XCTAssertTrue(cache.isFresh(now: Fixtures.date("2026-01-01T00:10:00Z")))
        XCTAssertFalse(cache.isFresh(now: Fixtures.date("2026-01-01T00:20:00Z")))
    }
}
