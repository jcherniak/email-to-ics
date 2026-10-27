import AuthenticationServices
import Foundation
import UIKit
import WebToICSCore

/// Google sign-in with ASWebAuthenticationSession (PKCE, iOS client type) and token storage in the Keychain.
@MainActor
final class GoogleAuthService: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleAuthService()

    private let secrets: SecretStore
    private let settings: AppSettings
    private var session: ASWebAuthenticationSession?

    init(secrets: SecretStore = AppEnvironment.shared.secrets, settings: AppSettings = AppEnvironment.shared.settings) {
        self.secrets = secrets
        self.settings = settings
    }

    var clientID: String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "GoogleIOSClientID") as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.hasPrefix("$(") ? nil : trimmed
    }

    var isConfigured: Bool { clientID != nil }

    func storedTokens() -> GoogleOAuth.StoredTokens? {
        guard let json = (try? secrets.get(.googleTokens)) ?? nil, let data = json.data(using: .utf8) else { return nil }
        return try? JSONCoding.decoder.decode(GoogleOAuth.StoredTokens.self, from: data)
    }

    var isSignedIn: Bool { storedTokens() != nil }
    var accountEmail: String? { storedTokens()?.email ?? settings.googleAccountEmail }

    private func store(_ tokens: GoogleOAuth.StoredTokens?) {
        if let tokens, let data = try? JSONCoding.encoder.encode(tokens) {
            try? secrets.set(String(decoding: data, as: UTF8.self), for: .googleTokens)
            settings.googleAccountEmail = tokens.email
        } else {
            try? secrets.set(nil, for: .googleTokens)
            settings.googleAccountEmail = nil
        }
    }

    func signIn() async throws -> GoogleOAuth.StoredTokens {
        guard let clientID else { throw GoogleAPIError.missingClientID }
        let pkce = GoogleOAuth.PKCE.generate()
        let state = UUID().uuidString
        let redirect = GoogleOAuth.redirectURI(clientID: clientID)
        let url = GoogleOAuth.authorizationURL(clientID: clientID, redirectURI: redirect, codeChallenge: pkce.challenge, state: state)
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callback: .customScheme(GoogleOAuth.reversedClientID(clientID))) { callback, error in
                if let callback {
                    continuation.resume(returning: callback)
                } else if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                    continuation.resume(throwing: GoogleAPIError.cancelled)
                } else {
                    continuation.resume(throwing: error ?? GoogleAPIError.cancelled)
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                continuation.resume(throwing: GoogleAPIError.cancelled)
            }
        }
        let result = GoogleOAuth.parseCallback(callbackURL)
        if let error = result.error { throw GoogleAPIError.api(error) }
        guard result.state == state, let code = result.code else { throw GoogleAPIError.api("Unexpected sign-in response.") }
        let request = GoogleOAuth.tokenRequest(code: code, clientID: clientID, redirectURI: redirect, codeVerifier: pkce.verifier)
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkHTTP(response, data: data)
        let tokens = GoogleOAuth.StoredTokens(response: try GoogleOAuth.parseTokenResponse(data), previous: nil)
        store(tokens)
        return tokens
    }

    func signOut() async {
        if let tokens = storedTokens() {
            _ = try? await URLSession.shared.data(for: GoogleOAuth.revokeRequest(token: tokens.refreshToken ?? tokens.accessToken))
        }
        store(nil)
        settings.googleConfirmedCalendarID = nil
        settings.googleConfirmedCalendarName = nil
        settings.googleTentativeCalendarID = nil
        settings.googleTentativeCalendarName = nil
    }

    /// Access token, refreshed when it expires within a minute.
    func validAccessToken(forceRefresh: Bool = false) async throws -> String {
        guard let tokens = storedTokens() else { throw GoogleAPIError.notSignedIn }
        if tokens.isValid() && !forceRefresh { return tokens.accessToken }
        guard let refreshToken = tokens.refreshToken, let clientID else {
            store(nil)
            throw GoogleAPIError.notSignedIn
        }
        let (data, response) = try await URLSession.shared.data(for: GoogleOAuth.refreshRequest(refreshToken: refreshToken, clientID: clientID))
        if let http = response as? HTTPURLResponse, http.statusCode == 400 || http.statusCode == 401 {
            store(nil)
            throw GoogleAPIError.notSignedIn
        }
        try Self.checkHTTP(response, data: data)
        let refreshed = GoogleOAuth.StoredTokens(response: try GoogleOAuth.parseTokenResponse(data), previous: tokens)
        store(refreshed)
        return refreshed.accessToken
    }

    static func checkHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let message = GoogleCalendarAPI.errorMessage(from: data) ?? String(decoding: data.prefix(300), as: UTF8.self)
            throw GoogleAPIError.http(http.statusCode, message)
        }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            return scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? scenes.first?.windows.first ?? ASPresentationAnchor()
        }
    }
}
