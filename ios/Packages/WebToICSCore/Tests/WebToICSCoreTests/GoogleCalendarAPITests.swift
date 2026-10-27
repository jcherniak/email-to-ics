import XCTest
@testable import WebToICSCore

final class GoogleCalendarAPITests: XCTestCase {
    func testPKCEMatchesRFC7636Vector() {
        let pkce = GoogleOAuth.PKCE(verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        XCTAssertEqual(pkce.challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        let generated = GoogleOAuth.PKCE.generate()
        XCTAssertEqual(generated.verifier.count, 43)
        XCTAssertFalse(generated.verifier.contains("="))
    }

    func testReversedClientIDAndAuthorizationURL() throws {
        let clientID = "1234-abc.apps.googleusercontent.com"
        XCTAssertEqual(GoogleOAuth.reversedClientID(clientID), "com.googleusercontent.apps.1234-abc")
        XCTAssertEqual(GoogleOAuth.redirectURI(clientID: clientID), "com.googleusercontent.apps.1234-abc:/oauthredirect")
        let url = GoogleOAuth.authorizationURL(clientID: clientID, redirectURI: GoogleOAuth.redirectURI(clientID: clientID), codeChallenge: "c", state: "s")
        let items = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems)
        func value(_ n: String) -> String? { items.first { $0.name == n }?.value }
        XCTAssertEqual(url.host, "accounts.google.com")
        XCTAssertEqual(value("client_id"), clientID)
        XCTAssertEqual(value("code_challenge_method"), "S256")
        XCTAssertEqual(value("response_type"), "code")
        XCTAssertEqual(value("access_type"), "offline")
        XCTAssertTrue(value("scope")!.contains("calendar.events"))
        XCTAssertTrue(value("scope")!.contains("calendar.readonly"))
    }

    func testTokenAndRefreshRequests() throws {
        let request = GoogleOAuth.tokenRequest(code: "co de", clientID: "id", redirectURI: "com.x:/oauthredirect", codeVerifier: "v")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/x-www-form-urlencoded")
        let body = String(decoding: try XCTUnwrap(request.httpBody), as: UTF8.self)
        XCTAssertEqual(body, "client_id=id&code=co%20de&code_verifier=v&grant_type=authorization_code&redirect_uri=com.x%3A%2Foauthredirect")
        let refresh = String(decoding: try XCTUnwrap(GoogleOAuth.refreshRequest(refreshToken: "r", clientID: "id").httpBody), as: UTF8.self)
        XCTAssertEqual(refresh, "client_id=id&refresh_token=r&grant_type=refresh_token")
    }

    func testTokenResponseAndStoredTokens() throws {
        // header.payload.signature with payload {"email":"me@example.com"}
        let payload = GoogleOAuth.base64URL(Data("{\"email\":\"me@example.com\"}".utf8))
        let json = "{\"access_token\":\"a\",\"expires_in\":3599,\"refresh_token\":\"r\",\"id_token\":\"h.\(payload).s\",\"token_type\":\"Bearer\"}"
        let response = try GoogleOAuth.parseTokenResponse(Data(json.utf8))
        let now = Fixtures.date("2026-05-01T12:00:00Z")
        let stored = GoogleOAuth.StoredTokens(response: response, previous: nil, now: now)
        XCTAssertEqual(stored.email, "me@example.com")
        XCTAssertEqual(stored.refreshToken, "r")
        XCTAssertTrue(stored.isValid(now: now))
        XCTAssertFalse(stored.isValid(now: now.addingTimeInterval(3598)))
        let refreshed = GoogleOAuth.StoredTokens(response: try GoogleOAuth.parseTokenResponse(Data("{\"access_token\":\"b\",\"expires_in\":100}".utf8)), previous: stored, now: now)
        XCTAssertEqual(refreshed.refreshToken, "r", "refresh keeps the previous refresh token")
        XCTAssertEqual(refreshed.email, "me@example.com")
        XCTAssertThrowsError(try GoogleOAuth.parseTokenResponse(Data("{\"error\":\"invalid_grant\",\"error_description\":\"Bad Request\"}".utf8))) { e in
            XCTAssertEqual(e as? GoogleAPIError, .api("Bad Request"))
        }
        let callback = GoogleOAuth.parseCallback(URL(string: "com.x:/oauthredirect?code=abc&state=s")!)
        XCTAssertEqual(callback, GoogleOAuth.CallbackResult(code: "abc", state: "s", error: nil))
    }

    func testEventBodies() throws {
        let timed = Fixtures.presidioResult().eventData[0]
        let body = try GoogleCalendarAPI.eventBody(for: timed, tentative: true)
        XCTAssertEqual(body.start.dateTime, "2026-05-29T19:30:00-07:00")
        XCTAssertEqual(body.start.timeZone, "America/Los_Angeles")
        XCTAssertEqual(body.end.dateTime, "2026-05-29T22:30:00-07:00")
        XCTAssertNil(body.start.date)
        XCTAssertEqual(body.status, "tentative")
        XCTAssertEqual(body.source?.url, timed.url)
        XCTAssertEqual(body.location, "Presidio Theatre, 99 Moraga Ave, San Francisco, CA")

        let allDay = ExtractedEvent(summary: "Festival", dtstart: "2026-09-12", dtend: "2026-09-14", timezone: "America/Chicago", isAllDay: true)
        let allDayBody = try GoogleCalendarAPI.eventBody(for: allDay, tentative: false)
        XCTAssertEqual(allDayBody.start.date, "2026-09-12")
        XCTAssertEqual(allDayBody.end.date, "2026-09-15")
        XCTAssertNil(allDayBody.start.dateTime)
        XCTAssertEqual(allDayBody.status, "confirmed")
        XCTAssertNil(allDayBody.source)

        let (request, data) = try GoogleCalendarAPI.insertEventRequest(calendarID: "abc@group.calendar.google.com", body: body, accessToken: "tok")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer tok")
        XCTAssertEqual(request.url?.absoluteString, "https://www.googleapis.com/calendar/v3/calendars/abc%40group.calendar.google.com/events")
        let json = jsonObject(data)
        XCTAssertEqual(json["summary"] as? String, "Opera Parallele - Doubt")
        XCTAssertEqual((json["start"] as? [String: Any])?["dateTime"] as? String, "2026-05-29T19:30:00-07:00")
    }

    func testCalendarListAndErrors() throws {
        let request = GoogleCalendarAPI.calendarListRequest(accessToken: "t", pageToken: "p2")
        XCTAssertTrue(request.url!.absoluteString.hasPrefix("https://www.googleapis.com/calendar/v3/users/me/calendarList?"))
        XCTAssertTrue(request.url!.absoluteString.contains("minAccessRole=writer"))
        XCTAssertTrue(request.url!.absoluteString.contains("pageToken=p2"))
        let list = try GoogleCalendarAPI.parseCalendarList(Data("{\"items\":[{\"id\":\"primary\",\"summary\":\"Me\",\"primary\":true,\"accessRole\":\"owner\"},{\"id\":\"x\",\"summary\":\"Shared\",\"accessRole\":\"reader\"}]}".utf8))
        XCTAssertEqual(list.items?.count, 2)
        XCTAssertTrue(list.items![0].isWritable)
        XCTAssertFalse(list.items![1].isWritable)
        XCTAssertEqual(GoogleCalendarAPI.errorMessage(from: Data("{\"error\":{\"code\":401,\"message\":\"Invalid Credentials\"}}".utf8)), "Invalid Credentials")
        XCTAssertNil(GoogleCalendarAPI.errorMessage(from: Data("{\"id\":\"1\"}".utf8)))
        let inserted = try GoogleCalendarAPI.parseInserted(Data("{\"id\":\"ev1\",\"htmlLink\":\"https://calendar.google.com/x\",\"status\":\"tentative\"}".utf8))
        XCTAssertEqual(inserted.id, "ev1")
    }
}
