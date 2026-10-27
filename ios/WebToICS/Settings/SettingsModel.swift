import Foundation
import Observation
import WebToICSCore

/// Backing state for the Settings screen; writes through to AppSettings and the Keychain.
@MainActor
@Observable
final class SettingsModel {
    private let settings = AppEnvironment.shared.settings
    private let secrets = AppEnvironment.shared.secrets

    var openRouterKey: String = ""
    var firecrawlKey: String = ""
    var model: String = ModelCatalog.defaultModelID
    var modelOptions: [ModelOption] = ModelCatalog.priorityModels
    var defaultTentative = true
    var defaultDestination: DestinationKind = .appleCalendar
    var firecrawlEnabled = true
    var defaultTimeZoneID = "America/Los_Angeles"
    var customPrompt = ""
    var debugShortResourceTimeout = false
    var isRefreshingModels = false
    var modelsError: String?
    var modelsUpdatedAt: Date?

    // Google
    var googleConfigured = false
    var googleEmail: String?
    var googleCalendars: [GoogleCalendarAPI.CalendarListEntry] = []
    var googleConfirmedCalendarID: String?
    var googleTentativeCalendarID: String?
    var googleBusy = false
    var googleError: String?

    init() {
        load()
    }

    func load() {
        openRouterKey = ((try? secrets.get(.openRouterAPIKey)) ?? nil) ?? ""
        firecrawlKey = ((try? secrets.get(.firecrawlAPIKey)) ?? nil) ?? ""
        model = settings.openRouterModel
        modelOptions = settings.modelOptions()
        modelsUpdatedAt = settings.modelCache?.fetchedAt
        defaultTentative = settings.defaultTentative
        defaultDestination = settings.defaultDestination
        firecrawlEnabled = settings.firecrawlEnabledOverride ?? true
        defaultTimeZoneID = settings.defaultTimeZoneID
        customPrompt = settings.customPrompt ?? ""
        debugShortResourceTimeout = settings.debugShortResourceTimeout
        googleConfigured = GoogleAuthService.shared.isConfigured
        googleEmail = GoogleAuthService.shared.isSignedIn ? GoogleAuthService.shared.accountEmail : nil
        googleConfirmedCalendarID = settings.googleConfirmedCalendarID
        googleTentativeCalendarID = settings.googleTentativeCalendarID
        if let confirmedName = settings.googleConfirmedCalendarName, let id = googleConfirmedCalendarID {
            googleCalendars = [GoogleCalendarAPI.CalendarListEntry(id: id, summary: confirmedName, accessRole: "writer")]
        }
        if let tentativeName = settings.googleTentativeCalendarName, let id = googleTentativeCalendarID, !googleCalendars.contains(where: { $0.id == id }) {
            googleCalendars.append(GoogleCalendarAPI.CalendarListEntry(id: id, summary: tentativeName, accessRole: "writer"))
        }
    }

    // MARK: Persistence

    func saveOpenRouterKey() {
        try? secrets.set(openRouterKey.trimmingCharacters(in: .whitespacesAndNewlines), for: .openRouterAPIKey)
    }

    func saveFirecrawlKey() {
        try? secrets.set(firecrawlKey.trimmingCharacters(in: .whitespacesAndNewlines), for: .firecrawlAPIKey)
    }

    func saveModel() { settings.openRouterModel = model }
    func saveDefaults() {
        settings.defaultTentative = defaultTentative
        settings.defaultDestination = defaultDestination
        settings.firecrawlEnabledOverride = firecrawlEnabled
        settings.defaultTimeZoneID = defaultTimeZoneID
        settings.customPrompt = customPrompt
        settings.debugShortResourceTimeout = debugShortResourceTimeout
    }

    var hasOpenRouterKey: Bool { !openRouterKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    var hasFirecrawlKey: Bool { !firecrawlKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    // MARK: Models

    func refreshModels() async {
        guard !isRefreshingModels else { return }
        isRefreshingModels = true
        modelsError = nil
        defer { isRefreshingModels = false }
        do {
            let key = openRouterKey.trimmingCharacters(in: .whitespacesAndNewlines)
            let (data, response) = try await URLSession.shared.data(for: OpenRouterAPI.modelsRequest(apiKey: key.isEmpty ? nil : key))
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                throw ExtractionError.http(http.statusCode, String(decoding: data.prefix(200), as: UTF8.self))
            }
            let merged = ModelCatalog.merge(apiModels: try ModelCatalog.parseModels(data))
            let cache = ModelCatalogCache(fetchedAt: Date(), models: merged)
            settings.modelCache = cache
            modelOptions = ModelCatalog.options(including: model, from: merged)
            modelsUpdatedAt = cache.fetchedAt
        } catch {
            modelsError = error.localizedDescription
        }
    }

    // MARK: Google

    func googleSignIn() async {
        googleBusy = true
        googleError = nil
        defer { googleBusy = false }
        do {
            let tokens = try await GoogleAuthService.shared.signIn()
            googleEmail = tokens.email ?? "Google account"
            await loadGoogleCalendars()
        } catch GoogleAPIError.cancelled {
            // user backed out
        } catch {
            googleError = error.localizedDescription
        }
    }

    func googleSignOut() async {
        googleBusy = true
        defer { googleBusy = false }
        await GoogleAuthService.shared.signOut()
        googleEmail = nil
        googleCalendars = []
        googleConfirmedCalendarID = nil
        googleTentativeCalendarID = nil
    }

    func loadGoogleCalendars() async {
        guard GoogleAuthService.shared.isSignedIn else { return }
        googleBusy = true
        googleError = nil
        defer { googleBusy = false }
        do {
            let calendars = try await GoogleCalendarClient.shared.listWritableCalendars()
            googleCalendars = calendars
            if googleConfirmedCalendarID == nil, let primary = calendars.first(where: { $0.primary == true }) ?? calendars.first {
                googleConfirmedCalendarID = primary.id
            }
            if googleTentativeCalendarID == nil { googleTentativeCalendarID = googleConfirmedCalendarID }
            saveGoogleCalendars()
        } catch {
            googleError = error.localizedDescription
            if case GoogleAPIError.notSignedIn = error { googleEmail = nil }
        }
    }

    func saveGoogleCalendars() {
        settings.googleConfirmedCalendarID = googleConfirmedCalendarID
        settings.googleConfirmedCalendarName = googleCalendars.first { $0.id == googleConfirmedCalendarID }?.summary
        settings.googleTentativeCalendarID = googleTentativeCalendarID
        settings.googleTentativeCalendarName = googleCalendars.first { $0.id == googleTentativeCalendarID }?.summary
    }
}
