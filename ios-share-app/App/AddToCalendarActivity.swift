import Foundation
#if canImport(UIKit)
import UIKit
import EventKit
import EventKitUI

final class AddToCalendarActivity: UIActivity, EKEventEditViewDelegate {
    private let event: ExtractedEvent
    private let store = EKEventStore()

    init(event: ExtractedEvent) {
        self.event = event
        super.init()
    }

    override class var activityCategory: UIActivity.Category { .action }
    override var activityType: UIActivity.ActivityType? { UIActivity.ActivityType("com.tls.email-to-ics.add-to-calendar") }
    override var activityTitle: String? { "Add to Calendar" }
    override var activityImage: UIImage? {
        if #available(iOS 13.0, *) { return UIImage(systemName: "calendar.badge.plus") }
        return nil
    }

    override func canPerform(withActivityItems activityItems: [Any]) -> Bool { true }
    override func prepare(withActivityItems activityItems: [Any]) { }

    override func perform() {
        Task { @MainActor in
            do {
                try await requestAccess()
                let ek = try makeEKEvent(from: event)
                presentEditor(for: ek)
            } catch {
                self.activityDidFinish(false)
            }
        }
    }

    private func requestAccess() async throws {
        if #available(iOS 17, *) {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                store.requestFullAccessToEvents { granted, err in
                    if let err { cont.resume(throwing: err) }
                    else if !granted { cont.resume(throwing: NSError(domain: "Calendar", code: 1)) }
                    else { cont.resume() }
                }
            }
        } else {
            let ok = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
                store.requestAccess(to: .event) { granted, err in
                    if let err { cont.resume(throwing: err) } else { cont.resume(returning: granted) }
                }
            }
            if !ok { throw NSError(domain: "Calendar", code: 1) }
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

    private func presentEditor(for event: EKEvent) {
        let editVC = EKEventEditViewController()
        editVC.eventStore = store
        editVC.event = event
        editVC.editViewDelegate = self
        if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
           let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
            root.present(editVC, animated: true)
        }
    }

    func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true) { [weak self] in
            self?.activityDidFinish(action == .saved)
        }
    }
}
#endif
