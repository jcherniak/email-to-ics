import Foundation
import os

enum QueueStatus: String, Codable {
    case pending
    case processing
    case failed
}

struct QueueItem: Codable, Identifiable, Equatable {
    let id: UUID
    var payload: SharedPayload
    // Snapshot of toggles and instructions at enqueue time
    var tentative: Bool
    var multiday: Bool
    var reviewFirst: Bool
    var instructions: String
    // Optional overrides (may be empty to use current app settings)
    var defaultModel: String
    var fromEmail: String
    var toTentativeEmail: String
    var toConfirmedEmail: String

    var status: QueueStatus
    var errorMessage: String?
    var createdAt: Date
    var updatedAt: Date
}

enum QueueStore {
    private static var url: URL { AppGroup.containerURL().appendingPathComponent("queue.json") }

    static func load() -> [QueueItem] {
        do {
            let data = try Data(contentsOf: url)
            let list = try JSONDecoder().decode([QueueItem].self, from: data)
            Log.general.info("Queue: loaded count=\(list.count)")
            return list
        } catch {
            Log.general.info("Queue: starting empty (\(error.localizedDescription))")
            return []
        }
    }

    static func save(_ items: [QueueItem]) {
        do {
            let data = try JSONEncoder().encode(items)
            try data.write(to: url, options: .atomic)
            Log.general.info("Queue: saved count=\(items.count) bytes=\(data.count)")
        } catch {
            Log.general.error("Queue: save failed: \(error.localizedDescription)")
        }
    }

    static func append(_ item: QueueItem) {
        var items = load()
        items.append(item)
        save(items)
    }

    static func update(_ transform: (inout [QueueItem]) -> Void) {
        var items = load()
        transform(&items)
        save(items)
    }
}

