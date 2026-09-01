import Foundation
import BackgroundTasks
import WidgetKit

/// `YouthPaperWidgetModule` OnCreate에서 register/scheduleAll 호출.
/// BGTaskScheduler는 프로세스당 task ID당 register 1회만 허용 — dev client 재로드 시 중복 방지.
public enum WidgetBackgroundScheduler {
  public static let mealTaskId = "com.ucost.YouthPaper.widget.meal.refresh"
  public static let timetableTaskId = "com.ucost.YouthPaper.widget.timetable.refresh"

  private static var didRegister = false
  private static let registerLock = NSLock()

  public static func register() {
    registerLock.lock()
    defer { registerLock.unlock() }
    guard !didRegister else { return }

    if #available(iOS 13.0, *) {
      BGTaskScheduler.shared.register(forTaskWithIdentifier: mealTaskId, using: nil) { task in
        guard let refresh = task as? BGAppRefreshTask else {
          task.setTaskCompleted(success: false)
          return
        }
        MealWidgetRefresh.run(task: refresh)
      }
      BGTaskScheduler.shared.register(forTaskWithIdentifier: timetableTaskId, using: nil) { task in
        guard let refresh = task as? BGAppRefreshTask else {
          task.setTaskCompleted(success: false)
          return
        }
        TimetableWidgetRefresh.run(task: refresh)
      }
      didRegister = true
    }
  }

  public static func scheduleAll() {
    scheduleMeal()
    scheduleTimetable()
  }

  /// 다음 KST 10/14/20 경계 근처로 best-effort 예약
  public static func scheduleMeal() {
    guard #available(iOS 13.0, *) else { return }
    let request = BGAppRefreshTaskRequest(identifier: mealTaskId)
    request.earliestBeginDate = nextMealBoundaryDate()
    try? BGTaskScheduler.shared.submit(request)
  }

  /// 자정 직후(00:00~01:00 KST) best-effort
  public static func scheduleTimetable() {
    guard #available(iOS 13.0, *) else { return }
    let request = BGAppRefreshTaskRequest(identifier: timetableTaskId)
    request.earliestBeginDate = nextMidnightWindowDate()
    try? BGTaskScheduler.shared.submit(request)
  }

  private static func kstCalendar() -> Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    return cal
  }

  private static func nextMealBoundaryDate(from date: Date = Date()) -> Date {
    let cal = kstCalendar()
    let hours = [10, 14, 20]
    let parts = cal.dateComponents([.year, .month, .day, .hour, .minute], from: date)
    for h in hours {
      var c = DateComponents()
      c.year = parts.year
      c.month = parts.month
      c.day = parts.day
      c.hour = h
      c.minute = 0
      if let candidate = cal.date(from: c), candidate > date {
        return candidate
      }
    }
    var tomorrow = DateComponents()
    tomorrow.year = parts.year
    tomorrow.month = parts.month
    tomorrow.day = (parts.day ?? 1) + 1
    tomorrow.hour = 10
    tomorrow.minute = 0
    return cal.date(from: tomorrow) ?? date.addingTimeInterval(6 * 3600)
  }

  private static func nextMidnightWindowDate(from date: Date = Date()) -> Date {
    let cal = kstCalendar()
    let parts = cal.dateComponents([.year, .month, .day], from: date)
    var c = DateComponents()
    c.year = parts.year
    c.month = parts.month
    c.day = (parts.day ?? 1) + 1
    c.hour = 0
    c.minute = 15
    return cal.date(from: c) ?? date.addingTimeInterval(24 * 3600)
  }
}

enum MealWidgetRefresh {
  static func run(task: BGAppRefreshTask) {
    WidgetBackgroundScheduler.scheduleMeal()
    let work = Task {
      defer { task.setTaskCompleted(success: true) }
      await refreshOnce()
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
    task.expirationHandler = { work.cancel() }
  }

  static func refreshOnce() async {
    guard let schoolId = WidgetSharedStore.read(key: WidgetSharedStore.schoolIdKey),
          !schoolId.isEmpty,
          let baseRaw = WidgetSharedStore.read(key: WidgetSharedStore.apiBaseUrlKey),
          !baseRaw.isEmpty
    else { return }

    let base = baseRaw.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    guard let url = URL(string: "\(base)/api/schools/\(schoolId)/meals/next?count=3") else { return }

    do {
      let (data, response) = try await URLSession.shared.data(from: url)
      guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return }
      guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let dataObj = json["data"] as? [String: Any]
      else { return }
      let meals = dataObj["meals"] as? [[String: Any]] ?? []
      let first = meals.first
      let nowIso = ISO8601DateFormatter().string(from: Date())
      // 앱/위젯 flat 스키마 + legacy `first` 호환
      var payload: [String: Any] = [
        "syncedAt": nowIso,
        "generatedAt": nowIso,
        "isVacation": false,
      ]
      if let first {
        payload["ymd"] = first["ymd"] as Any
        payload["mealType"] = first["mealType"] as Any
        payload["menus"] = first["menus"] as Any
        payload["first"] = first
      } else {
        payload["ymd"] = ""
        payload["mealType"] = NSNull()
        payload["menus"] = []
      }
      if let payloadData = try? JSONSerialization.data(withJSONObject: payload),
         let payloadStr = String(data: payloadData, encoding: .utf8) {
        WidgetSharedStore.write(key: WidgetSharedStore.mealKey, value: payloadStr)
      }
    } catch {
      // 재시도는 earliestBeginDate 재스케줄로 보완
    }
  }
}

enum TimetableWidgetRefresh {
  static let dayLabels = ["월", "화", "수", "목", "금"]

  static func run(task: BGAppRefreshTask) {
    WidgetBackgroundScheduler.scheduleTimetable()
    let work = Task {
      defer { task.setTaskCompleted(success: true) }
      await refreshOnce()
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
    task.expirationHandler = { work.cancel() }
  }

  static func refreshOnce() async {
    guard let mirrorRaw = WidgetAuthKeychain.read(),
          let mirrorData = mirrorRaw.data(using: .utf8),
          let mirror = try? JSONSerialization.jsonObject(with: mirrorData) as? [String: Any],
          let refreshToken = mirror["refreshToken"] as? String, !refreshToken.isEmpty,
          let deviceId = mirror["deviceId"] as? String, !deviceId.isEmpty,
          let baseRaw = WidgetSharedStore.read(key: WidgetSharedStore.apiBaseUrlKey), !baseRaw.isEmpty
    else { return }

    let base = baseRaw.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    guard let refreshUrl = URL(string: "\(base)/api/auth/refresh") else { return }
    var refreshReq = URLRequest(url: refreshUrl)
    refreshReq.httpMethod = "POST"
    refreshReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let body: [String: String] = ["refreshToken": refreshToken, "deviceId": deviceId]
    refreshReq.httpBody = try? JSONSerialization.data(withJSONObject: body)

    do {
      let (data, response) = try await URLSession.shared.data(for: refreshReq)
      guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return }
      guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
      let dataObj = (json["data"] as? [String: Any]) ?? json
      guard let access = dataObj["token"] as? String, !access.isEmpty else { return }
      let nextRefresh = (dataObj["refreshToken"] as? String) ?? refreshToken

      let updatedMirror: [String: Any] = [
        "accessToken": access,
        "refreshToken": nextRefresh,
        "deviceId": deviceId,
        "updatedAt": Int(Date().timeIntervalSince1970 * 1000),
      ]
      if let mirrorBytes = try? JSONSerialization.data(withJSONObject: updatedMirror),
         let mirrorStr = String(data: mirrorBytes, encoding: .utf8) {
        WidgetAuthKeychain.write(json: mirrorStr)
      }

      guard let ttUrl = URL(string: "\(base)/api/timetable") else { return }
      var ttReq = URLRequest(url: ttUrl)
      ttReq.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
      let (ttData, ttResp) = try await URLSession.shared.data(for: ttReq)
      guard let ttHttp = ttResp as? HTTPURLResponse, (200..<300).contains(ttHttp.statusCode) else { return }
      guard let ttJson = try JSONSerialization.jsonObject(with: ttData) as? [String: Any],
            let ttDataObj = ttJson["data"] as? [String: Any]
      else { return }
      let flat = (ttDataObj["timetable"] as? [String: Any]) ?? [:]
      let payload = Self.buildPayload(from: flat)
      if let payloadData = try? JSONSerialization.data(withJSONObject: payload),
         let payloadStr = String(data: payloadData, encoding: .utf8) {
        WidgetSharedStore.write(key: WidgetSharedStore.timetableKey, value: payloadStr)
      }
    } catch {
      // skip quietly
    }
  }

  static func buildPayload(from flat: [String: Any]) -> [String: Any] {
    var week: [[String: Any]] = []
    var hasAny = false
    for day in dayLabels {
      var byPeriod: [Int: String] = [:]
      for (key, value) in flat {
        guard let subject = value as? String else { continue }
        let trimmed = subject.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { continue }
        let parts = key.split(separator: "-")
        guard parts.count == 2, String(parts[0]) == day, let period = Int(parts[1]) else { continue }
        byPeriod[period] = trimmed
      }
      let periods = byPeriod.keys.sorted().map { p -> [String: Any] in
        ["period": p, "subject": byPeriod[p]!]
      }
      if !periods.isEmpty { hasAny = true }
      week.append(["dayLabel": day, "periods": periods])
    }
    let today = kstDayLabel()
    return [
      "generatedAt": ISO8601DateFormatter().string(from: Date()),
      "todayDayLabel": dayLabels.contains(today) ? today : NSNull(),
      "week": week,
      "empty": !hasAny,
    ]
  }

  private static func kstDayLabel() -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    let weekday = cal.component(.weekday, from: Date()) // 1=Sun
    let map = [1: "일", 2: "월", 3: "화", 4: "수", 5: "목", 6: "금", 7: "토"]
    return map[weekday] ?? "월"
  }
}
