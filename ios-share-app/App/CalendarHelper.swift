import Foundation
#if canImport(UIKit)
import UIKit
import EventKit
import EventKitUI

final class CalendarHelper: NSObject, EKEventEditViewDelegate {
    static let shared = CalendarHelper()
    private let store = EKEventStore()
    private var presentedController: EKEventEditViewController?

    func addToCalendar(from extracted: ExtractedEvent, completion: @escaping (Result<Void, Error>) -> Void) {
        Task { @MainActor in
            do {
                try await requestAccess()
                let event = try makeEKEvent(from: extracted)
                presentEditor(for: event, completion: completion)
            } catch {
                completion(.failure(error))
            }
        }
    }

    private func requestAccess() async throws {
        if #available(iOS 17, *) {
            let granted = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
                store.requestFullAccessToEvents { granted, err in
                    if let err { cont.resume(throwing: err) } else { cont.resume(returning: granted) }
                }
            }
            if !granted { throw NSError(domain: "Calendar", code: 2, userInfo: [NSLocalizedDescriptionKey: "Calendar access not authorized"]) }
            return
        } else {
            let status = EKEventStore.authorizationStatus(for: .event)
            switch status {
            case .authorized:
                return
            case .notDetermined:
                let ok = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
                    store.requestAccess(to: .event) { granted, err in
                        if let err { cont.resume(throwing: err) }
                        else { cont.resume(returning: granted) }
                    }
                }
                if !ok { throw NSError(domain: "Calendar", code: 1, userInfo: [NSLocalizedDescriptionKey: "Calendar access denied"]) }
            default:
                throw NSError(domain: "Calendar", code: 2, userInfo: [NSLocalizedDescriptionKey: "Calendar access not authorized"])
            }
        }
    }

    private func makeEKEvent(from e: ExtractedEvent) throws -> EKEvent {
        let event = EKEvent(eventStore: store)
        event.title = e.summary
        event.location = e.location.isEmpty ? nil : e.location
        event.notes = e.description
        if let tz = TimeZone(identifier: e.timezone) { event.timeZone = tz }

        let cal = Calendar(identifier: .gregorian)
        func date(from ymd: String, time: String?) -> Date? {
            let comps = ymd.split(separator: "-")
            guard comps.count == 3, let y = Int(comps[0]), let m = Int(comps[1]), let d = Int(comps[2]) else { return nil }
            if let t = time, !t.isEmpty, t.contains(":") {
                let ts = t.split(separator: ":")
                let hh = Int(ts.first ?? "0") ?? 0
                let mm = Int(ts.dropFirst().first ?? "0") ?? 0
                var dc = DateComponents()
                dc.year = y; dc.month = m; dc.day = d; dc.hour = hh; dc.minute = mm
                return cal.date(from: dc)
            } else {
                var dc = DateComponents()
                dc.year = y; dc.month = m; dc.day = d
                return cal.date(from: dc)
            }
        }

        let start = date(from: e.start_date, time: e.start_time)
        var end: Date? = nil
        if let ed = e.end_date {
            end = date(from: ed, time: e.end_time)
        }

        if let s = start {
            event.startDate = s
            if let end = end {
                event.endDate = end
            } else {
                // Default to 1 hour duration if time-based; if all-day, same day
                if e.start_time == nil {
                    event.isAllDay = true
                    event.endDate = s
                } else {
                    event.endDate = s.addingTimeInterval(3600)
                }
            }
        }

        if let url = URL(string: e.url) { event.url = url }
        return event
    }

    private var completionHandler: ((Result<Void, Error>) -> Void)?
    private func presentEditor(for event: EKEvent, completion: @escaping (Result<Void, Error>) -> Void) {
        completionHandler = completion
        let editVC = EKEventEditViewController()
        editVC.eventStore = store
        editVC.event = event
        editVC.editViewDelegate = self
        presentedController = editVC

        if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
           let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
            root.present(editVC, animated: true)
        }
    }

    func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        defer {
            controller.dismiss(animated: true)
            presentedController = nil
        }
        switch action {
        case .saved:
            Log.general.info("Calendar: event saved; opening Calendar app view")
            if let date = controller.event?.startDate, let url = URL(string: "calshow:\(date.timeIntervalSinceReferenceDate)") {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
            completionHandler?(.success(()))
        case .canceled:
            completionHandler?(.failure(NSError(domain: "Calendar", code: 3, userInfo: [NSLocalizedDescriptionKey: "User canceled"])) )
        case .deleted:
            completionHandler?(.failure(NSError(domain: "Calendar", code: 4, userInfo: [NSLocalizedDescriptionKey: "Event deleted"])) )
        @unknown default:
            completionHandler?(.failure(NSError(domain: "Calendar", code: 5, userInfo: [NSLocalizedDescriptionKey: "Unknown result"])) )
        }
        completionHandler = nil
    }
}
#endif

#if canImport(AppKit)
import AppKit
import EventKit

final class MacCalendarHelper {
    static let shared = MacCalendarHelper()
    private let store = EKEventStore()

    func addToCalendar(from extracted: ExtractedEvent, completion: @escaping (Result<Void, Error>) -> Void) {
        Task {
            do {
                try await requestAccess()
                let event = try makeEKEvent(from: extracted)
                if event.calendar == nil { event.calendar = store.defaultCalendarForNewEvents }
                try store.save(event, span: .thisEvent, commit: true)
                Log.general.info("Mac Calendar: event saved; opening Calendar")
                if let date = event.startDate, let url = URL(string: "calshow:\(date.timeIntervalSinceReferenceDate)") {
                    NSWorkspace.shared.open(url)
                }
                completion(.success(()))
            } catch {
                completion(.failure(error))
            }
        }
    }

    private func requestAccess() async throws {
        if #available(macOS 14, *) {
            let granted = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
                store.requestFullAccessToEvents { granted, err in
                    if let err { cont.resume(throwing: err) } else { cont.resume(returning: granted) }
                }
            }
            if !granted { throw NSError(domain: "Calendar", code: 2, userInfo: [NSLocalizedDescriptionKey: "Calendar access not authorized"]) }
        } else {
            var ok = false
            var errOut: Error?
            store.requestAccess(to: .event) { granted, err in
                ok = granted; errOut = err
            }
            if let errOut { throw errOut }
            if !ok { throw NSError(domain: "Calendar", code: 2, userInfo: [NSLocalizedDescriptionKey: "Calendar access not authorized"]) }
        }
    }

    private func makeEKEvent(from e: ExtractedEvent) throws -> EKEvent {
        let ev = EKEvent(eventStore: store)
        ev.title = e.summary
        ev.location = e.location.isEmpty ? nil : e.location
        ev.notes = e.description
        if let tz = TimeZone(identifier: e.timezone) { ev.timeZone = tz }
        let cal = Calendar(identifier: .gregorian)
        func date(from ymd: String, time: String?) -> Date? {
            let comps = ymd.split(separator: "-")
            guard comps.count == 3, let y = Int(comps[0]), let m = Int(comps[1]), let d = Int(comps[2]) else { return nil }
            if let t = time, !t.isEmpty, t.contains(":") {
                let ts = t.split(separator: ":")
                let hh = Int(ts.first ?? "0") ?? 0
                let mm = Int(ts.dropFirst().first ?? "0") ?? 0
                var dc = DateComponents(); dc.year = y; dc.month = m; dc.day = d; dc.hour = hh; dc.minute = mm
                return cal.date(from: dc)
            } else {
                var dc = DateComponents(); dc.year = y; dc.month = m; dc.day = d
                return cal.date(from: dc)
            }
        }
        if let s = date(from: e.start_date, time: e.start_time) {
            ev.startDate = s
            if let ed = e.end_date, let end = date(from: ed, time: e.end_time) {
                ev.endDate = end
            } else {
                if e.start_time == nil { ev.isAllDay = true; ev.endDate = s } else { ev.endDate = s.addingTimeInterval(3600) }
            }
        }
        if let url = URL(string: e.url) { ev.url = url }
        return ev
    }
}
#endif
