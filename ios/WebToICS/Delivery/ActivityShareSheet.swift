import SwiftUI
import UIKit

/// One pending ICS share sheet.
struct ICSShareRequest: Identifiable {
    let id = UUID()
    let fileURL: URL
    let completion: (Bool) -> Void
}

/// `UIActivityViewController` hosted in a SwiftUI sheet (so iPad needs no popover anchor).
struct ActivityShareSheet: UIViewControllerRepresentable {
    let request: ICSShareRequest

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: [request.fileURL], applicationActivities: nil)
        controller.completionWithItemsHandler = { _, completed, _, _ in
            request.completion(completed)
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

enum ICSFiles {
    /// Writes the calendar to a temp file whose name is the first event's title.
    static func write(_ ics: String, suggestedTitle: String?) throws -> URL {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("WebToICS", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var name = (suggestedTitle ?? "Event").trimmingCharacters(in: .whitespacesAndNewlines)
        let invalid = CharacterSet(charactersIn: "/\\:?%*|\"<>").union(.newlines).union(.controlCharacters)
        name = String(name.unicodeScalars.filter { !invalid.contains($0) }.map(Character.init))
        if name.isEmpty { name = "Event" }
        let url = directory.appendingPathComponent(String(name.prefix(80)) + ".ics")
        try ics.data(using: .utf8)!.write(to: url, options: [.atomic])
        return url
    }
}
