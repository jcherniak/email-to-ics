import Foundation

/// Removes tracking query parameters (same list as the Chrome extension's `stripTrackingParameters`).
public enum URLCleaner {
    public static let trackingParameters: Set<String> = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "utm_id", "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
        "fbclid", "gclid", "dclid", "msclkid",
        "mc_cid", "mc_eid",
        "_ga", "_gid", "_gac",
        "ref", "referer", "referrer",
    ]

    public static func strip(_ url: String) -> String {
        guard var components = URLComponents(string: url), let items = components.queryItems, !items.isEmpty else {
            return url
        }
        let kept = items.filter { !trackingParameters.contains($0.name.lowercased()) }
        guard kept.count != items.count else { return url }
        components.queryItems = kept.isEmpty ? nil : kept
        return components.string ?? url
    }

    public static func strip(_ url: URL) -> URL {
        URL(string: strip(url.absoluteString)) ?? url
    }
}
