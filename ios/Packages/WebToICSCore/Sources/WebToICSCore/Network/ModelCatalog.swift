import Foundation

public struct ModelOption: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var label: String
    public var isPriority: Bool

    public init(id: String, label: String, isPriority: Bool = false) {
        self.id = id
        self.label = label
        self.isPriority = isPriority
    }
}

/// Model from `GET /api/v1/models`.
public struct OpenRouterModel: Decodable, Sendable {
    public var id: String
    public var name: String?
}

public struct OpenRouterModelsResponse: Decodable {
    public var data: [OpenRouterModel]
}

/// Cached, merged list persisted in the App Group so the share extension's picker is instant.
public struct ModelCatalogCache: Codable, Sendable {
    public var fetchedAt: Date
    public var models: [ModelOption]

    public init(fetchedAt: Date, models: [ModelOption]) {
        self.fetchedAt = fetchedAt
        self.models = models
    }

    public func isFresh(ttl: TimeInterval = ModelCatalog.cacheTTL, now: Date = Date()) -> Bool {
        now.timeIntervalSince(fetchedAt) < ttl
    }
}

/// Priority aliases and merge logic copied from the Chrome extension (`popup.ts`).
public enum ModelCatalog {
    public static let defaultModelID = "~openai/gpt-mini-latest"
    public static let cacheTTL: TimeInterval = 15 * 60

    public static let priorityModels: [ModelOption] = [
        ModelOption(id: "~openai/gpt-mini-latest", label: "GPT Mini Latest", isPriority: true),
        ModelOption(id: "~openai/gpt-latest", label: "GPT Latest", isPriority: true),
        ModelOption(id: "~google/gemini-pro-latest", label: "Gemini Pro Latest", isPriority: true),
        ModelOption(id: "~google/gemini-flash-latest", label: "Gemini Flash Latest", isPriority: true),
        ModelOption(id: "~anthropic/claude-opus-latest", label: "Claude Opus Latest", isPriority: true),
        ModelOption(id: "~anthropic/claude-sonnet-latest", label: "Claude Sonnet Latest", isPriority: true),
        ModelOption(id: "~moonshotai/kimi-latest", label: "Kimi Latest", isPriority: true),
    ]

    /// Priority aliases first (always present, API label when available), then every other model sorted by name.
    public static func merge(apiModels: [OpenRouterModel]) -> [ModelOption] {
        var byID: [String: OpenRouterModel] = [:]
        for model in apiModels where byID[model.id] == nil {
            byID[model.id] = model
        }
        let priority = priorityModels.map { option -> ModelOption in
            var copy = option
            if let apiName = byID[option.id]?.name, !apiName.isEmpty {
                copy.label = apiName
            }
            return copy
        }
        let priorityIDs = Set(priorityModels.map(\.id))
        let others = byID.values
            .filter { !priorityIDs.contains($0.id) }
            .map { ModelOption(id: $0.id, label: ($0.name?.isEmpty == false ? $0.name! : $0.id), isPriority: false) }
            .sorted { $0.label.localizedCaseInsensitiveCompare($1.label) == .orderedAscending }
        return priority + others
    }

    public static func parseModels(_ data: Data) throws -> [OpenRouterModel] {
        try JSONDecoder().decode(OpenRouterModelsResponse.self, from: data).data
    }

    /// Ensures the chosen model appears in the list even if the API no longer returns it.
    public static func options(including modelID: String, from cached: [ModelOption]?) -> [ModelOption] {
        var list = cached ?? priorityModels
        if !list.contains(where: { $0.id == modelID }) {
            list.append(ModelOption(id: modelID, label: modelID, isPriority: false))
        }
        return list
    }
}
