import Foundation
import Security
import os

enum Keychain {
    private static let service = "EmailToICS"
    // Resolve full access group from Info.plist (SharedKeychainAccessGroup = $(AppIdentifierPrefix)com.tls.email-to-ics.shared)
    private static func accessGroup() -> String? {
        if let group = Bundle.main.object(forInfoDictionaryKey: "SharedKeychainAccessGroup") as? String,
           !group.isEmpty {
            Log.general.debug("Keychain: using access group=\(group, privacy: .public)")
            return group
        }
        Log.general.debug("Keychain: no access group configured")
        return nil
    }

    static func set(_ value: String, for key: String) throws {
        guard let data = value.data(using: .utf8) else { return }
        Log.general.info("Keychain.set key=\(key, privacy: .public) value_len=\(value.count)")
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: kCFBooleanTrue as Any
        ]
        if let group = accessGroup() { query[kSecAttrAccessGroup as String] = group }

        var attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        if let group = accessGroup() { attributes[kSecAttrAccessGroup as String] = group }

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                Log.general.error("Keychain.set add failed: \(addStatus)")
                throw NSError(domain: NSOSStatusErrorDomain, code: Int(addStatus))
            }
            Log.general.info("Keychain.set add success for key=\(key, privacy: .public)")
        } else if status != errSecSuccess {
            Log.general.error("Keychain.set update failed: \(status)")
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        } else {
            Log.general.info("Keychain.set update success for key=\(key, privacy: .public)")
        }
    }

    static func get(_ key: String) -> String? {
        Log.general.debug("Keychain.get key=\(key, privacy: .public)")
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecAttrSynchronizable as String: kSecAttrSynchronizableAny
        ]
        if let group = accessGroup() { query[kSecAttrAccessGroup as String] = group }
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            Log.general.debug("Keychain.get miss for key=\(key, privacy: .public) status=\(status)")
            return nil
        }
        let value = String(data: data, encoding: .utf8)
        Log.general.debug("Keychain.get hit for key=\(key, privacy: .public) len=\(value?.count ?? 0)")
        return value
    }

    static func delete(_ key: String) {
        Log.general.info("Keychain.delete key=\(key, privacy: .public)")
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: kSecAttrSynchronizableAny
        ]
        if let group = accessGroup() { query[kSecAttrAccessGroup as String] = group }
        let status = SecItemDelete(query as CFDictionary)
        Log.general.debug("Keychain.delete status=\(status)")
    }
}
