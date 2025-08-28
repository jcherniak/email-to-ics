import Foundation

enum ICSBuilder {
    static func build(events: [ExtractedEvent], organizerEmail: String?, tentative: Bool) -> Data {
        var lines: [String] = []
        func add(_ l: String) { lines.append(fold(l)) }

        add("BEGIN:VCALENDAR")
        add("VERSION:2.0")
        add("PRODID:-//EmailToICS iOS//EN")

        for e in events {
            add("BEGIN:VEVENT")
            let uid = UUID().uuidString + "@email-to-ics-ios"
            add("UID:\(uid)")
            add("SUMMARY:\(escape(e.summary))")
            if !e.location.isEmpty { add("LOCATION:\(escape(e.location))") }
            if let org = organizerEmail, !org.isEmpty { add("ORGANIZER:mailto:\(org)") }
            add("STATUS:\(tentative ? "TENTATIVE" : "CONFIRMED")")

            // DTSTART / DTEND
            if let st = e.start_time, !st.isEmpty {
                add("DTSTART;TZID=\(escape(e.timezone)):\(e.start_date.replacingOccurrences(of: "-", with: ""))T\(st.replacingOccurrences(of: ":", with: ""))00")
            } else {
                add("DTSTART;VALUE=DATE:\(e.start_date.replacingOccurrences(of: "-", with: ""))")
            }
            if let ed = e.end_date, !ed.isEmpty {
                if let et = e.end_time, !et.isEmpty {
                    add("DTEND;TZID=\(escape(e.timezone)):\(ed.replacingOccurrences(of: "-", with: ""))T\(et.replacingOccurrences(of: ":", with: ""))00")
                } else {
                    add("DTEND;VALUE=DATE:\(ed.replacingOccurrences(of: "-", with: ""))")
                }
            }

            var desc = e.description
            if !e.url.isEmpty {
                desc += "\n\nSource: \(e.url)"
                add("URL;VALUE=URI:\(escape(e.url))")
            }
            add("DESCRIPTION:\(escape(desc))")
            add("END:VEVENT")
        }

        add("END:VCALENDAR")
        let ics = lines.joined(separator: "\r\n") + "\r\n"
        return Data(ics.utf8)
    }

    private static func escape(_ s: String) -> String {
        s
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: ";", with: "\\;")
            .replacingOccurrences(of: ",", with: "\\,")
            .replacingOccurrences(of: "\n", with: "\\n")
    }

    private static func fold(_ line: String) -> String {
        // RFC5545: lines folded at 75 octets. Simple UTF-8 safe best-effort.
        let limit = 75
        if line.count <= limit { return line }
        var out: [String] = []
        var start = line.startIndex
        while start < line.endIndex {
            let end = line.index(start, offsetBy: limit, limitedBy: line.endIndex) ?? line.endIndex
            out.append(String(line[start..<end]))
            start = end
        }
        return out.enumerated().map { idx, chunk in idx == 0 ? chunk : " " + chunk }.joined(separator: "\r\n")
    }
}

