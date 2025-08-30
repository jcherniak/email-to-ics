import Foundation
import os

struct PostmarkClient {
    let apiKey: String

    struct PostmarkError: Error { let message: String }

    func send(from: String, to: String, subject: String, body: String, icsData: Data) async throws {
        Log.network.info("Postmark: send from=\(from, privacy: .public) to=\(to, privacy: .public) subj=\(subject, privacy: .public) ics_bytes=\(icsData.count)")
        guard !apiKey.isEmpty else {
            Log.network.error("Postmark: missing API key")
            throw PostmarkError(message: "Missing Postmark API key")
        }
        guard !from.isEmpty && !to.isEmpty else {
            Log.network.error("Postmark: missing from/to emails")
            throw PostmarkError(message: "Missing from/to emails")
        }

        // JSON API with base64 attachment per Postmark spec
        let endpoint = URL(string: "https://api.postmarkapp.com/email")!
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue(apiKey, forHTTPHeaderField: "X-Postmark-Server-Token")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let attachment: [String: Any] = [
            "Name": "event.ics",
            "Content": icsData.base64EncodedString(),
            "ContentType": "text/calendar; charset=utf-8"
        ]
        let payload: [String: Any] = [
            "From": from,
            "To": to,
            "Subject": subject,
            "TextBody": body,
            "Attachments": [attachment]
        ]
        let json = try JSONSerialization.data(withJSONObject: payload)
        req.httpBody = json
        Log.network.debug("Postmark: JSON length=\(json.count) bytes (~\(json.count/1024) KB)")

        let t0 = Date()
        let (data, resp) = try await URLSession.shared.data(for: req)
        let dt = Date().timeIntervalSince(t0)
        guard let http = resp as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            let message = String(data: data, encoding: .utf8) ?? "HTTP \((resp as? HTTPURLResponse)?.statusCode ?? 0)"
            Log.network.error("Postmark: HTTP error \((resp as? HTTPURLResponse)?.statusCode ?? -1) in \(String(format: "%.2f", dt))s body=\(Log.truncate(message))")
            throw PostmarkError(message: message)
        }
        Log.network.info("Postmark: status=\(http.statusCode) in \(String(format: "%.2f", dt))s")
    }
}

// Remove shadowing append to avoid recursion; use stdlib Data.append
