import CoreLocation
import EventKit
import EventKitUI
import SwiftUI
import WebToICSCore

/// One pending Apple Calendar edit sheet.
struct EventEditRequest: Identifiable {
    let id = UUID()
    let event: EKEvent
    let store: EKEventStore
    let completion: (EKEventEditViewAction) -> Void
}

/// `EKEventEditViewController` hosted in a SwiftUI sheet. Works without calendar permission (it runs out of process).
struct EventEditSheet: UIViewControllerRepresentable {
    let request: EventEditRequest

    func makeCoordinator() -> Coordinator { Coordinator(request: request) }

    func makeUIViewController(context: Context) -> EKEventEditViewController {
        let controller = EKEventEditViewController()
        controller.eventStore = request.store
        controller.event = request.event
        controller.editViewDelegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: EKEventEditViewController, context: Context) {}

    final class Coordinator: NSObject, EKEventEditViewDelegate {
        let request: EventEditRequest
        private var finished = false

        init(request: EventEditRequest) {
            self.request = request
        }

        func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
            guard !finished else { return }
            finished = true
            request.completion(action)
        }
    }
}

enum AppleCalendarEvents {
    /// Builds a prefilled EKEvent from a resolved event.
    static func makeEvent(_ resolved: ResolvedEvent, store: EKEventStore, defaultTimeZoneID: String) throws -> EKEvent {
        let timing = try EventTiming.resolve(resolved.event, defaultTimeZoneID: defaultTimeZoneID)
        let event = EKEvent(eventStore: store)
        event.title = resolved.event.summary
        event.startDate = timing.start
        event.isAllDay = timing.isAllDay
        // EventKit treats all-day end as inclusive of the last day; our end is exclusive.
        event.endDate = timing.isAllDay ? timing.end.addingTimeInterval(-1) : timing.end
        event.timeZone = timing.isAllDay ? nil : timing.timeZone
        let locationText = resolved.locationText
        if !locationText.isEmpty {
            event.location = locationText
            let structured = EKStructuredLocation(title: locationText)
            if let lat = resolved.location?.latitude, let lon = resolved.location?.longitude {
                structured.geoLocation = CLLocation(latitude: lat, longitude: lon)
            }
            event.structuredLocation = structured
        }
        let notes = resolved.event.description.replacingOccurrences(of: "\\n", with: "\n")
        event.notes = notes.isEmpty ? nil : notes
        if let url = URL(string: resolved.event.url), url.scheme?.hasPrefix("http") == true {
            event.url = url
        }
        event.availability = resolved.tentative ? .tentative : .busy
        event.calendar = store.defaultCalendarForNewEvents
        return event
    }

    /// Asks for write-only access once; the edit sheet works either way, so denial is not fatal.
    static func requestAccessIfNeeded(_ store: EKEventStore) async {
        guard EKEventStore.authorizationStatus(for: .event) == .notDetermined else { return }
        _ = try? await store.requestWriteOnlyAccessToEvents()
    }
}
