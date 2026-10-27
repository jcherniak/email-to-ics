import CryptoKit
import Foundation

/// OAuth 2.0 for an iOS client type: PKCE, no client secret, reversed-client-ID redirect.
public enum GoogleOAuth {
    public static let authorizationEndpoint = URL(string: "https://accounts.google.com/o/oauth2/v2/auth")!
    public static let tokenEndpoint = URL(string: "https://oauth2.googleapis.com/token")!
    public static let revokeEndpoint = URL(string: "https://oauth2.googleapis.com/revoke")!
    public static let scopes = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
        "openid",
        "email",
    ]

    public struct PKCE: Equatable, Sendable {
        public var verifier: String
        public var challenge: String

        public init(verifier: String) {
            self.verifier = verifier
            self.challenge = PKCE.challenge(for: verifier)
        }

        public static func generate() -> PKCE {
            var bytes = [UInt8](repeating: 0, count: 32)
            for i in bytes.indices { bytes[i] = UInt8.random(in: 0...255) }
            return PKCE(verifier: base64URL(Data(bytes)))
        }

        public static func challenge(for verifier: String) -> String {
            base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
        }
    }

    public static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// `1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`
    public static func reversedClientID(_ clientID: String) -> String {
        clientID.split(separator: ".").reversed().joined(separator: ".")
    }

    public static func redirectURI(clientID: String) -> String {
        "\(reversedClientID(clientID)):/oauthredirect"
    }

    public static func authorizationURL(clientID: String, redirectURI: String, codeChallenge: String, state: String) -> URL {
        var components = URLComponents(url: authorizationEndpoint, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
        ]
        return components.url!
    }

    static func formRequest(_ url: URL, fields: [(String, String)]) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        request.httpBody = fields.map { key, value in
            "\(key)=\(value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value)"
        }.joined(separator: "&").data(using: .utf8)
        return request
    }

    public static func tokenRequest(code: String, clientID: String, redirectURI: String, codeVerifier: String) -> URLRequest {
        formRequest(tokenEndpoint, fields: [
            ("client_id", clientID),
            ("code", code),
            ("code_verifier", codeVerifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirectURI),
        ])
    }

    public static func refreshRequest(refreshToken: String, clientID: String) -> URLRequest {
        formRequest(tokenEndpoint, fields: [
            ("client_id", clientID),
            ("refresh_token", refreshToken),
            ("grant_type", "refresh_token"),
        ])
    }

    public static func revokeRequest(token: String) -> URLRequest {
        formRequest(revokeEndpoint, fields: [("token", token)])
    }

    public struct TokenResponse: Decodable, Sendable {
        public var accessToken: String
        public var expiresIn: Double?
        public var refreshToken: String?
        public var idToken: String?
        public var scope: String?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token", expiresIn = "expires_in", refreshToken = "refresh_token", idToken = "id_token", scope
        }
    }

    /// What we keep in the Keychain (`google.tokens`).
    public struct StoredTokens: Codable, Equatable, Sendable {
        public var accessToken: String
        public var refreshToken: String?
        public var expiresAt: Date
        public var email: String?

        public init(accessToken: String, refreshToken: String?, expiresAt: Date, email: String?) {
            self.accessToken = accessToken
            self.refreshToken = refreshToken
            self.expiresAt = expiresAt
            self.email = email
        }

        public init(response: TokenResponse, previous: StoredTokens?, now: Date = Date()) {
            accessToken = response.accessToken
            refreshToken = response.refreshToken ?? previous?.refreshToken
            expiresAt = now.addingTimeInterval(response.expiresIn ?? 3600)
            email = response.idToken.flatMap(GoogleOAuth.emailFromIDToken) ?? previous?.email
        }

        public func isValid(now: Date = Date(), leeway: TimeInterval = 60) -> Bool {
            expiresAt.timeIntervalSince(now) > leeway
        }
    }

    public struct CallbackResult: Equatable, Sendable {
        public var code: String?
        public var state: String?
        public var error: String?
    }

    public static func parseCallback(_ url: URL) -> CallbackResult {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        func value(_ name: String) -> String? { items.first { $0.name == name }?.value }
        return CallbackResult(code: value("code"), state: value("state"), error: value("error"))
    }

    /// Reads the `email` claim out of an ID token without verifying it (display only).
    public static func emailFromIDToken(_ idToken: String) -> String? {
        let parts = idToken.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["email"] as? String
    }

    public static func parseTokenResponse(_ data: Data) throws -> TokenResponse {
        if let error = GoogleCalendarAPI.errorMessage(from: data) { throw GoogleAPIError.api(error) }
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
}

public enum GoogleAPIError: Error, LocalizedError, Equatable {
    case notSignedIn
    case missingClientID
    case api(String)
    case http(Int, String)
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .notSignedIn: return "Sign in to Google in Settings first."
        case .missingClientID: return "No Google OAuth client ID is configured (GOOGLE_IOS_CLIENT_ID in ios/Config/Secrets.xcconfig)."
        case .api(let message): return "Google: \(message)"
        case .http(let code, let body): return "Google HTTP \(code): \(body)"
        case .cancelled: return "Google sign-in was cancelled."
        }
    }
}

/// Calendar API v3 request builders and models.
public enum GoogleCalendarAPI {
    public static let baseURL = URL(string: "https://www.googleapis.com/calendar/v3")!

    public struct CalendarListEntry: Codable, Identifiable, Hashable, Sendable {
        public var id: String
        public var summary: String
        public var primary: Bool?
        public var accessRole: String?
        public var backgroundColor: String?

        public init(id: String, summary: String, primary: Bool? = nil, accessRole: String? = nil, backgroundColor: String? = nil) {
            self.id = id
            self.summary = summary
            self.primary = primary
            self.accessRole = accessRole
            self.backgroundColor = backgroundColor
        }

        public var isWritable: Bool { accessRole == "owner" || accessRole == "writer" }
    }

    public struct CalendarList: Decodable, Sendable {
        public var items: [CalendarListEntry]?
        public var nextPageToken: String?
    }

    public static func authorized(_ url: URL, accessToken: String, method: String = "GET") -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if method != "GET" { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        return request
    }

    public static func calendarListRequest(accessToken: String, pageToken: String? = nil) -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent("users/me/calendarList"), resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "minAccessRole", value: "writer"), URLQueryItem(name: "showHidden", value: "false")]
        if let pageToken { items.append(URLQueryItem(name: "pageToken", value: pageToken)) }
        components.queryItems = items
        return authorized(components.url!, accessToken: accessToken)
    }

    public static func parseCalendarList(_ data: Data) throws -> CalendarList {
        if let error = errorMessage(from: data) { throw GoogleAPIError.api(error) }
        return try JSONDecoder().decode(CalendarList.self, from: data)
    }

    public struct EventBody: Codable, Equatable, Sendable {
        public struct When: Codable, Equatable, Sendable {
            public var date: String?
            public var dateTime: String?
            public var timeZone: String?
        }
        public struct Source: Codable, Equatable, Sendable {
            public var url: String
            public var title: String
        }
        public var summary: String
        public var description: String?
        public var location: String?
        public var start: When
        public var end: When
        public var status: String
        public var transparency: String?
        public var source: Source?
    }

    public static func eventBody(for event: ExtractedEvent, tentative: Bool, defaultTimeZoneID: String = EventTiming.defaultTimeZoneID) throws -> EventBody {
        let timing = try EventTiming.resolve(event, defaultTimeZoneID: defaultTimeZoneID)
        let start: EventBody.When
        let end: EventBody.When
        if timing.isAllDay {
            start = EventBody.When(date: timing.startDateString(), dateTime: nil, timeZone: nil)
            end = EventBody.When(date: timing.endDateString(), dateTime: nil, timeZone: nil)
        } else {
            start = EventBody.When(date: nil, dateTime: timing.startRFC3339(), timeZone: timing.timeZone.identifier)
            end = EventBody.When(date: nil, dateTime: timing.endRFC3339(), timeZone: timing.timeZone.identifier)
        }
        let description = event.description.replacingOccurrences(of: "\\n", with: "\n")
        var source: EventBody.Source? = nil
        let url = event.url.trimmingCharacters(in: .whitespacesAndNewlines)
        if let parsed = URL(string: url), parsed.scheme?.hasPrefix("http") == true {
            source = EventBody.Source(url: url, title: event.summary)
        }
        return EventBody(summary: event.summary, description: description.isEmpty ? nil : description,
                         location: event.location.isEmpty ? nil : event.location, start: start, end: end,
                         status: tentative ? "tentative" : "confirmed", transparency: "opaque", source: source)
    }

    public static func insertEventRequest(calendarID: String, body: EventBody, accessToken: String) throws -> (URLRequest, Data) {
        let escaped = calendarID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/@"))) ?? calendarID
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.percentEncodedPath += "/calendars/\(escaped)/events"
        let url = components.url!
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(body)
        return (authorized(url, accessToken: accessToken, method: "POST"), data)
    }

    public struct InsertedEvent: Decodable, Sendable {
        public var id: String
        public var htmlLink: String?
        public var status: String?
    }

    public static func parseInserted(_ data: Data) throws -> InsertedEvent {
        if let error = errorMessage(from: data) { throw GoogleAPIError.api(error) }
        return try JSONDecoder().decode(InsertedEvent.self, from: data)
    }

    /// Calendar API errors are `{"error":{"code":..,"message":..}}`; OAuth token errors are
    /// `{"error":"invalid_grant","error_description":"..."}`. Both shapes are handled.
    struct ErrorEnvelope: Decodable {
        struct Inner: Decodable {
            var code: Int?
            var message: String?
        }
        var error: Inner?
        var errorCode: String?
        var errorDescription: String?
        enum CodingKeys: String, CodingKey { case error, errorDescription = "error_description" }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            if let inner = try? c.decodeIfPresent(Inner.self, forKey: .error) {
                error = inner
            } else {
                errorCode = try? c.decodeIfPresent(String.self, forKey: .error)
            }
            errorDescription = try c.decodeIfPresent(String.self, forKey: .errorDescription)
        }
    }

    public static func errorMessage(from data: Data) -> String? {
        guard let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data) else { return nil }
        if let inner = envelope.error { return inner.message ?? "error \(inner.code ?? 0)" }
        return envelope.errorDescription ?? envelope.errorCode
    }
}
