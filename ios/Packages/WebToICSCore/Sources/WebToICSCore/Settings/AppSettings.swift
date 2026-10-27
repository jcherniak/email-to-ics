import Foundation

/// User preferences shared between the app and the share extension through the App Group `UserDefaults`.
public final class AppSettings: @unchecked Sendable {
    public enum Key: String, CaseIterable {
        case openRouterModel
        case defaultTentative
        case defaultDestination
        case firecrawlEnabled
        case googleConfirmedCalendarID
        case googleConfirmedCalendarName
        case googleTentativeCalendarID
        case googleTentativeCalendarName
        case googleAccountEmail
        case defaultTimeZoneID
        case customPrompt
        case modelCache
        case debugShortResourceTimeout
        case onboardingSeen
    }

    public let defaults: UserDefaults

    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    /// App Group defaults; falls back to standard defaults when the group is unavailable (unit tests).
    public static func shared(appGroup: String = AppIdentifiers.appGroup) -> AppSettings {
        AppSettings(defaults: UserDefaults(suiteName: appGroup) ?? .standard)
    }

    public var openRouterModel: String {
        get { string(.openRouterModel) ?? ModelCatalog.defaultModelID }
        set { set(newValue, .openRouterModel) }
    }

    public var defaultTentative: Bool {
        get { bool(.defaultTentative, default: true) }
        set { set(newValue, .defaultTentative) }
    }

    public var defaultDestination: DestinationKind {
        get { string(.defaultDestination).flatMap(DestinationKind.init(rawValue:)) ?? .appleCalendar }
        set { set(newValue.rawValue, .defaultDestination) }
    }

    /// Stored preference; `isFirecrawlEnabled(hasKey:)` applies the "on when a key exists" default.
    public var firecrawlEnabledOverride: Bool? {
        get { defaults.object(forKey: Key.firecrawlEnabled.rawValue) as? Bool }
        set { set(newValue, .firecrawlEnabled) }
    }

    public func isFirecrawlEnabled(hasKey: Bool) -> Bool {
        guard hasKey else { return false }
        return firecrawlEnabledOverride ?? true
    }

    public var googleConfirmedCalendarID: String? {
        get { string(.googleConfirmedCalendarID) }
        set { set(newValue, .googleConfirmedCalendarID) }
    }

    public var googleConfirmedCalendarName: String? {
        get { string(.googleConfirmedCalendarName) }
        set { set(newValue, .googleConfirmedCalendarName) }
    }

    public var googleTentativeCalendarID: String? {
        get { string(.googleTentativeCalendarID) }
        set { set(newValue, .googleTentativeCalendarID) }
    }

    public var googleTentativeCalendarName: String? {
        get { string(.googleTentativeCalendarName) }
        set { set(newValue, .googleTentativeCalendarName) }
    }

    public var googleAccountEmail: String? {
        get { string(.googleAccountEmail) }
        set { set(newValue, .googleAccountEmail) }
    }

    public func googleCalendarID(tentative: Bool) -> String? {
        tentative ? (googleTentativeCalendarID ?? googleConfirmedCalendarID) : (googleConfirmedCalendarID ?? googleTentativeCalendarID)
    }

    public var defaultTimeZoneID: String {
        get { string(.defaultTimeZoneID) ?? "America/Los_Angeles" }
        set { set(newValue, .defaultTimeZoneID) }
    }

    /// Empty means "use the bundled Chrome default".
    public var customPrompt: String? {
        get { string(.customPrompt).flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 } }
        set { set(newValue, .customPrompt) }
    }

    public var modelCache: ModelCatalogCache? {
        get { defaults.data(forKey: Key.modelCache.rawValue).flatMap { try? JSONCoding.decoder.decode(ModelCatalogCache.self, from: $0) } }
        set { set(newValue.flatMap { try? JSONCoding.encoder.encode($0) }, .modelCache) }
    }

    /// Debug aid for the airplane-mode test: lowers the background resource timeout to 60 s.
    public var debugShortResourceTimeout: Bool {
        get { bool(.debugShortResourceTimeout, default: false) }
        set { set(newValue, .debugShortResourceTimeout) }
    }

    public var onboardingSeen: Bool {
        get { bool(.onboardingSeen, default: false) }
        set { set(newValue, .onboardingSeen) }
    }

    public var stageSettings: StageSettings {
        StageSettings(defaultTimeZoneID: defaultTimeZoneID, customPrompt: customPrompt)
    }

    public func modelOptions() -> [ModelOption] {
        ModelCatalog.options(including: openRouterModel, from: modelCache?.models)
    }

    // MARK: Helpers

    private func string(_ key: Key) -> String? { defaults.string(forKey: key.rawValue) }

    private func bool(_ key: Key, default fallback: Bool) -> Bool {
        (defaults.object(forKey: key.rawValue) as? Bool) ?? fallback
    }

    private func set(_ value: Any?, _ key: Key) {
        if let value { defaults.set(value, forKey: key.rawValue) } else { defaults.removeObject(forKey: key.rawValue) }
    }
}
