import Foundation
import Security

enum WidgetSharedStore {
  static let appGroupId = "group.com.ucost.YouthPaper"
  static let mealKey = "meal_widget_payload"
  static let timetableKey = "timetable_widget_payload"
  static let periodTimeSettingsKey = "period_time_settings"
  static let schoolIdKey = "widget_school_id"
  static let apiBaseUrlKey = "widget_api_base_url"

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: appGroupId)
  }

  static func write(key: String, value: String) {
    guard let defaults else {
      NSLog("[YouthPaperWidget] App Group UserDefaults nil — check group.com.ucost.YouthPaper entitlement")
      return
    }
    defaults.set(value, forKey: key)
    defaults.synchronize()
  }

  static func read(key: String) -> String? {
    defaults?.string(forKey: key)
  }
}

/// Refresh/Access 토큰은 App Group UserDefaults가 아닌 Keychain에 저장
enum WidgetAuthKeychain {
  private static let service = "com.ucost.YouthPaper.widget.auth"
  private static let account = "auth_mirror"

  static func write(json: String) {
    let data = Data(json.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
    var attrs = query
    attrs[kSecValueData as String] = data
    attrs[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
    SecItemAdd(attrs as CFDictionary, nil)
  }

  static func read() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func clear() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
  }
}
