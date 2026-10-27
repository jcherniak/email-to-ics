import Contacts
import CoreLocation
import Foundation
import MapKit
import WebToICSCore

/// MapKit local search with a CLGeocoder fallback. Output mirrors the backend's combiner:
/// `<place name>, <street, city, state zip>` without the country for US addresses.
final class MapKitLocationResolver: LocationResolver, @unchecked Sendable {
    func resolve(query: String) async -> ResolvedLocation? {
        if let item = await localSearch(query) {
            return item
        }
        return await geocode(query)
    }

    private func localSearch(_ query: String) async -> ResolvedLocation? {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = [.pointOfInterest, .address]
        let search = MKLocalSearch(request: request)
        guard let response = try? await search.start(), let item = response.mapItems.first else { return nil }
        let placemark = item.placemark
        let coordinate = placemark.coordinate
        let name = item.name?.trimmingCharacters(in: .whitespacesAndNewlines)
        let address = Self.formatAddress(
            subThoroughfare: placemark.subThoroughfare, thoroughfare: placemark.thoroughfare,
            locality: placemark.locality, administrativeArea: placemark.administrativeArea,
            postalCode: placemark.postalCode, country: placemark.country, isoCountryCode: placemark.isoCountryCode)
        return ResolvedLocation(displayName: name, formattedAddress: address,
                                latitude: coordinate.latitude, longitude: coordinate.longitude, provider: "mapkit")
    }

    private func geocode(_ query: String) async -> ResolvedLocation? {
        guard let placemark = try? await CLGeocoder().geocodeAddressString(query).first else { return nil }
        let address = Self.formatAddress(
            subThoroughfare: placemark.subThoroughfare, thoroughfare: placemark.thoroughfare,
            locality: placemark.locality, administrativeArea: placemark.administrativeArea,
            postalCode: placemark.postalCode, country: placemark.country, isoCountryCode: placemark.isoCountryCode)
        let name = placemark.areasOfInterest?.first ?? placemark.name
        return ResolvedLocation(displayName: name, formattedAddress: address,
                                latitude: placemark.location?.coordinate.latitude,
                                longitude: placemark.location?.coordinate.longitude, provider: "clgeocoder")
    }

    static func formatAddress(subThoroughfare: String?, thoroughfare: String?, locality: String?, administrativeArea: String?,
                              postalCode: String?, country: String?, isoCountryCode: String?) -> String? {
        let street = [subThoroughfare, thoroughfare].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        let region = [administrativeArea, postalCode].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        var parts = [street, locality ?? "", region].filter { !$0.isEmpty }
        if let iso = isoCountryCode, iso.uppercased() != "US", let country, !country.isEmpty {
            parts.append(country)
        }
        let joined = parts.joined(separator: ", ")
        return joined.isEmpty ? nil : joined
    }
}
