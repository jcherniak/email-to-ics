import Foundation
#if canImport(Security)
import Security
#endif

public enum SecretKey: String, CaseIterable, Sendable {
    case openRouterAPIKey = "openrouter.apiKey"
    case firecrawlAPIKey = "firecrawl.apiKey"
    case googleTokens = "google.tokens"
}

public protocol SecretStore: Sendable {
    func get(_ key: SecretKey) throws -> String?
    func set(_ value: String?, for key: SecretKey) throws
}

public extension SecretStore {
    func snapshot() -> SecretsSnapshot {
        SecretsSnapshot(openRouterKey: (try? get(.openRouterAPIKey)) ?? nil, firecrawlKey: (try? get(.firecrawlAPIKey)) ?? nil)
    }

    func has(_ key: SecretKey) -> Bool {
        guard let value = (try? get(key)) ?? nil else { return false }
        return !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

/// In-memory store for tests and previews.
public final class InMemorySecretStore: SecretStore, @unchecked Sendable {
    private var values: [SecretKey: String]
    private let lock = NSLock()

    public init(_ values: [SecretKey: String] = [:]) {
        self.values = values
    }

    public func get(_ key: SecretKey) throws -> String? {
        lock.withLock { values[key] }
    }

    public func set(_ value: String?, for key: SecretKey) throws {
        lock.withLock { values[key] = value }
    }
}

#if canImport(Security) && canImport(Darwin)
public struct KeychainError: Error, LocalizedError, Equatable {
    public let status: OSStatus
    public var errorDescription: String? { "Keychain error \(status)" }
}

/// Generic-password items shared through the App Group (usable as a keychain access group on iOS),
/// accessible after first unlock so background wakes can read them.
public final class KeychainStore: SecretStore, @unchecked Sendable {
    public let service: String
    public let accessGroup: String?

    public init(service: String = AppIdentifiers.bundleIDPrefix, accessGroup: String? = AppIdentifiers.appGroup) {
        self.service = service
        self.accessGroup = accessGroup
    }

    private func baseQuery(_ key: SecretKey, withGroup: Bool) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
        ]
        if withGroup, let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }

    public func get(_ key: SecretKey) throws -> String? {
        for withGroup in [true, false] where withGroup || accessGroup != nil {
            var query = baseQuery(key, withGroup: withGroup)
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            switch status {
            case errSecSuccess:
                guard let data = item as? Data else { return nil }
                return String(data: data, encoding: .utf8)
            case errSecItemNotFound:
                if !withGroup { return nil }
                continue
            case errSecMissingEntitlement where withGroup:
                continue
            default:
                throw KeychainError(status: status)
            }
        }
        return nil
    }

    public func set(_ value: String?, for key: SecretKey) throws {
        guard let value, !value.isEmpty else {
            for withGroup in [true, false] {
                let status = SecItemDelete(baseQuery(key, withGroup: withGroup) as CFDictionary)
                if status != errSecSuccess && status != errSecItemNotFound && status != errSecMissingEntitlement {
                    throw KeychainError(status: status)
                }
            }
            return
        }
        let data = Data(value.utf8)
        var lastStatus: OSStatus = errSecSuccess
        for withGroup in [true, false] {
            let query = baseQuery(key, withGroup: withGroup)
            let attributes: [String: Any] = [kSecValueData as String: data]
            var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if status == errSecItemNotFound {
                var add = query
                add[kSecValueData as String] = data
                add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
                status = SecItemAdd(add as CFDictionary, nil)
            }
            if status == errSecSuccess { return }
            lastStatus = status
            if status != errSecMissingEntitlement { break }
        }
        throw KeychainError(status: lastStatus)
    }
}
#endif
