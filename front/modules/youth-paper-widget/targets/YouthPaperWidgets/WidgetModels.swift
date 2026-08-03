import Foundation

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

enum WidgetPayloadReader {
  static let appGroupId = "group.com.ucost.YouthPaper"
  static let mealKey = "meal_widget_payload"
  static let timetableKey = "timetable_widget_payload"
  static let staleMs: Double = 24 * 60 * 60 * 1000

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: appGroupId)
  }

  static func meal() -> MealWidgetPayload? {
    guard let raw = defaults?.string(forKey: mealKey),
          let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(MealWidgetPayload.self, from: data)
  }

  static func timetable() -> TimetableWidgetPayload? {
    guard let raw = defaults?.string(forKey: timetableKey),
          let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(TimetableWidgetPayload.self, from: data)
  }

  static func kstDayLabel(date: Date = Date()) -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    let weekday = cal.component(.weekday, from: date)
    let map = [1: "일", 2: "월", 3: "화", 4: "수", 5: "목", 6: "금", 7: "토"]
    return map[weekday] ?? "월"
  }

  static func isWeekend(date: Date = Date()) -> Bool {
    let label = kstDayLabel(date: date)
    return label == "토" || label == "일"
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
