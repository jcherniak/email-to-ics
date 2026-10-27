import Foundation
import WebToICSCore

/// Calendar API calls made from the foreground app (list calendars, insert events) with one retry after a 401.
@MainActor
final class GoogleCalendarClient {
    static let shared = GoogleCalendarClient()
    private let auth: GoogleAuthService

    init(auth: GoogleAuthService = .shared) {
        self.auth = auth
    }

    func listWritableCalendars() async throws -> [GoogleCalendarAPI.CalendarListEntry] {
        var all: [GoogleCalendarAPI.CalendarListEntry] = []
        var pageToken: String? = nil
        repeat {
            let data = try await send { token in GoogleCalendarAPI.calendarListRequest(accessToken: token, pageToken: pageToken) }
            let list = try GoogleCalendarAPI.parseCalendarList(data)
            all += (list.items ?? []).filter(\.isWritable)
            pageToken = list.nextPageToken
        } while pageToken != nil
        return all.sorted { lhs, rhs in
            if lhs.primary == true { return true }
            if rhs.primary == true { return false }
            return lhs.summary.localizedCaseInsensitiveCompare(rhs.summary) == .orderedAscending
        }
    }

    func insert(_ event: ExtractedEvent, tentative: Bool, calendarID: String, defaultTimeZoneID: String) async throws -> GoogleCalendarAPI.InsertedEvent {
        let body = try GoogleCalendarAPI.eventBody(for: event, tentative: tentative, defaultTimeZoneID: defaultTimeZoneID)
        let data = try await send { token in
            let (request, payload) = try GoogleCalendarAPI.insertEventRequest(calendarID: calendarID, body: body, accessToken: token)
            var withBody = request
            withBody.httpBody = payload
            return withBody
        }
        return try GoogleCalendarAPI.parseInserted(data)
    }

    private func send(_ build: (String) throws -> URLRequest) async throws -> Data {
        var token = try await auth.validAccessToken()
        var (data, response) = try await URLSession.shared.data(for: try build(token))
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            token = try await auth.validAccessToken(forceRefresh: true)
            (data, response) = try await URLSession.shared.data(for: try build(token))
        }
        try GoogleAuthService.checkHTTP(response, data: data)
        return data
    }
}
