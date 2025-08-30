import Foundation
import UserNotifications

enum NotificationManager {
    static let categoryProcessing = "PROCESSING_CATEGORY"
    static let actionOpenApp = "OPEN_APP"

    static func configure() {
        let center = UNUserNotificationCenter.current()
        let open = UNNotificationAction(identifier: actionOpenApp, title: "Open App", options: [.foreground])
        let processing = UNNotificationCategory(identifier: categoryProcessing, actions: [open], intentIdentifiers: [], options: [])
        center.setNotificationCategories([processing])
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, err in
            if let err { Log.general.error("Notifications: auth error: \(err.localizedDescription)") }
            Log.general.info("Notifications: authorization granted? \(granted)")
        }
    }

    private static func deliver(title: String, body: String, userInfo: [AnyHashable: Any] = [:], timeSensitive: Bool = true) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.categoryIdentifier = categoryProcessing
        content.userInfo = userInfo
        if #available(iOS 15.0, *) {
            content.interruptionLevel = timeSensitive ? .timeSensitive : .active
        }
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { err in
            if let err { Log.general.error("Notifications: add failed: \(err.localizedDescription)") }
        }
    }

    static func queued(itemID: UUID, url: String) {
        deliver(title: "Queued: Calendar extraction", body: url, userInfo: ["itemID": itemID.uuidString])
    }

    static func processing(itemID: UUID, url: String) {
        deliver(title: "Processing…", body: url, userInfo: ["itemID": itemID.uuidString])
    }

    static func needsReview(itemID: UUID) {
        deliver(title: "Review needed", body: "Open to review and send", userInfo: ["itemID": itemID.uuidString])
    }

    static func success(itemID: UUID) {
        deliver(title: "Email sent", body: "Your calendar event was emailed.", userInfo: ["itemID": itemID.uuidString], timeSensitive: false)
    }

    static func failure(itemID: UUID, message: String) {
        deliver(title: "Failed to process", body: message, userInfo: ["itemID": itemID.uuidString])
    }
}

