import Foundation

struct PostmarkClient {
    let apiKey: String

    struct PostmarkError: Error { let message: String }

    func send(from: String, to: String, subject: String, body: String, icsData: Data) async throws {
        guard !apiKey.isEmpty else { throw PostmarkError(message: "Missing Postmark API key") }
        guard !from.isEmpty && !to.isEmpty else { throw PostmarkError(message: "Missing from/to emails") }

        // Build multipart/form-data with ICS attachment
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: URL(string: "https://api.postmarkapp.com/email")!)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var bodyData = Data()
        func add(_ name: String, _ value: String) {
            bodyData.append("--\(boundary)\r\n".data(using: .utf8)!)
            bodyData.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            bodyData.append("\(value)\r\n".data(using: .utf8)!)
        }
        func addFile(_ name: String, filename: String, mime: String, data: Data) {
            bodyData.append("--\(boundary)\r\n".data(using: .utf8)!)
            bodyData.append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
            bodyData.append("Content-Type: \(mime)\r\n\r\n".data(using: .utf8)!)
            bodyData.append(data)
            bodyData.append("\r\n".data(using: .utf8)!)
        }

        add("From", from)
        add("To", to)
        add("Subject", subject)
        add("TextBody", body)
        addFile("Attachments", filename: "event.ics", mime: "text/calendar", data: icsData)
        bodyData.append("--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = bodyData

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            let message = String(data: data, encoding: .utf8) ?? "HTTP \((resp as? HTTPURLResponse)?.statusCode ?? 0)"
            throw PostmarkError(message: message)
        }
    }
}

private extension Data { mutating func append(_ data: Data) { self.append(data) } }

