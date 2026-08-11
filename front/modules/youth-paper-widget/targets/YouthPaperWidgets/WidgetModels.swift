import Foundation
import SwiftUI

struct MealNextItem: Codable {
  let ymd: String?
  let mealCode: String?
  let mealType: String?
  let menus: [String]?
  let calories: String?
}

struct MealWidgetPayload: Codable {
  let generatedAt: String?
  let first: MealNextItem?
}

struct TimetablePeriodLite: Codable {
  let period: Int
  let subject: String
}

struct TimetableDayLite: Codable {
  let dayLabel: String
  let periods: [TimetablePeriodLite]
}

struct TimetableWidgetPayload: Codable {
  let generatedAt: String?
  let todayDayLabel: String?
  let week: [TimetableDayLite]?
  let empty: Bool?
}

struct PeriodTimeConfigPayload: Codable {
  let periodNumber: Int
  let startTime: String
  let endTime: String
}

struct PeriodTimeSettingsPayload: Codable {
  let periods: [PeriodTimeConfigPayload]?
  let updatedAt: String?
}

struct MergedPeriod: Identifiable, Hashable {
  var id: Int { number }
  let number: Int
  let startTime: Date?
  let endTime: Date?
  let subjectName: String
  let subjectColorHex: String?

  var hasSchedule: Bool { startTime != nil && endTime != nil }
}

enum WidgetPayloadReader {
  static let appGroupId = "group.com.ucost.YouthPaper"
  static let mealKey = "meal_widget_payload"
  static let timetableKey = "timetable_widget_payload"
  static let periodTimeSettingsKey = "period_time_settings"
  static let staleMs: Double = 24 * 60 * 60 * 1000

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: appGroupId)
  }

  static func meal() -> MealWidgetPayload? {
    decode(mealKey)
  }

  static func timetable() -> TimetableWidgetPayload? {
    decode(timetableKey)
  }

  static func periodTimeSettings() -> PeriodTimeSettingsPayload? {
    decode(periodTimeSettingsKey)
  }

  private static func decode<T: Decodable>(_ key: String) -> T? {
    guard let raw = defaults?.string(forKey: key),
          let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
  }

  static var kstCalendar: Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    return cal
  }

  static func kstDayLabel(date: Date = Date()) -> String {
    let weekday = kstCalendar.component(.weekday, from: date)
    let map = [1: "일", 2: "월", 3: "화", 4: "수", 5: "목", 6: "금", 7: "토"]
    return map[weekday] ?? "월"
  }

  static func isWeekend(date: Date = Date()) -> Bool {
    let label = kstDayLabel(date: date)
    return label == "토" || label == "일"
  }

  static func startOfDay(_ date: Date) -> Date {
    kstCalendar.startOfDay(for: date)
  }

  static func dateBySetting(hhmm: String, on day: Date) -> Date? {
    let parts = hhmm.split(separator: ":")
    guard parts.count == 2,
          let h = Int(parts[0]),
          let m = Int(parts[1])
    else { return nil }
    return kstCalendar.date(bySettingHour: h, minute: m, second: 0, of: day)
  }

  static func mealTypeLabel(_ type: String?) -> String {
    switch type {
    case "breakfast": return "조식"
    case "lunch": return "중식"
    case "dinner": return "석식"
    default: return "급식"
    }
  }

  static func formatYmd(_ ymd: String?) -> String {
    guard let ymd, ymd.count == 8 else { return "" }
    let m = Int(ymd.prefix(6).suffix(2)) ?? 0
    let d = Int(ymd.suffix(2)) ?? 0
    return "\(m)/\(d)"
  }

  static func formatDayLabel(_ date: Date) -> String {
    let comps = kstCalendar.dateComponents([.month, .day], from: date)
    let weekday = kstDayLabel(date: date)
    return "\(comps.month ?? 0)월 \(comps.day ?? 0)일 (\(weekday))"
  }

  static func formatTimeRange(_ start: Date, _ end: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "ko_KR")
    f.timeZone = TimeZone(identifier: "Asia/Seoul")
    f.dateFormat = "HH:mm"
    return "\(f.string(from: start))~\(f.string(from: end))"
  }

  static func isTimetableStale(_ payload: TimetableWidgetPayload?) -> Bool {
    guard let iso = payload?.generatedAt else { return false }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var date = formatter.date(from: iso)
    if date == nil {
      formatter.formatOptions = [.withInternetDateTime]
      date = formatter.date(from: iso)
    }
    guard let generated = date else { return false }
    return Date().timeIntervalSince(generated) * 1000 > staleMs
  }
}

extension Color {
  init(hex: String, opacity: Double = 1) {
    var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if cleaned.hasPrefix("#") { cleaned.removeFirst() }
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    let r, g, b: Double
    switch cleaned.count {
    case 6:
      r = Double((value & 0xFF0000) >> 16) / 255
      g = Double((value & 0x00FF00) >> 8) / 255
      b = Double(value & 0x0000FF) / 255
    default:
      r = 39 / 255; g = 42 / 255; b = 38 / 255
    }
    self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
  }
}
