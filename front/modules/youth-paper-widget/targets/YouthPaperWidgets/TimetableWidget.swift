import WidgetKit
import SwiftUI

private let widgetPad: CGFloat = 0
private let textPrimary = Color(hex: "272A26")
private let textSecondary = Color(hex: "272A26", opacity: 0.5)
private let inactiveBase = Color(hex: "272A26")
/// `TIMETABLE_SUBJECT_COLORS` (styles/colors.js)
private let subjectPaletteHex: [String] = [
  "FFBCBC", // 레드
  "FFEEA8", // 옐로우
  "AEEEB9", // 그린
  "A1ECE2", // 틸
  "B5BEFB", // 바이올렛
  "E3C8FE", // 퍼플
  "D5B88F", // 브라운
  "B9C0CB", // 슬레이트
  "F2EDE4", // 아이보리 (공란 흰색과 구분)
  "FFCB91", // 오렌지
  "F28FC9", // 핑크
  "7EC8F0", // 하늘
  "7C8EF2", // 인디고
]

/// 공란과 헷갈리는 연한 과목색
private let subjectPaleHex = "F2EDE4"

/// 4x2 — 흰 배경에서 잘 안 보이는 연한색 제외
private var subjectPaletteNoWhite: [String] {
  subjectPaletteHex.filter { $0 != subjectPaleHex }
}

private func isSubjectPaleHex(_ hex: String?) -> Bool {
  guard var cleaned = hex?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() else {
    return false
  }
  if cleaned.hasPrefix("#") { cleaned.removeFirst() }
  return cleaned == subjectPaleHex || cleaned == "FFFFFF"
}

private func normalizeSubject(_ value: String) -> String {
  value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
}

private func subjectColorIndex(_ subject: String, paletteSize: Int) -> Int {
  let key = normalizeSubject(subject)
  guard !key.isEmpty, paletteSize > 0 else { return 0 }
  var hash = 0
  for scalar in key.unicodeScalars {
    hash = (hash * 31 + Int(scalar.value)) % 2_147_483_647
  }
  return abs(hash) % paletteSize
}

private func buildSubjectColorMap(week: [TimetableDayLite], excludeWhite: Bool = false) -> [String: String] {
  let palette = excludeWhite ? subjectPaletteNoWhite : subjectPaletteHex
  var map: [String: String] = [:]
  var used = Set<Int>()
  // 인앱 TimetableScreen: Object.values 첫 등장 순 (정렬하지 않음). 월→금·교시 오름차순으로 맞춤.
  let dayOrder = ["월", "화", "수", "목", "금"]
  let byDay = Dictionary(uniqueKeysWithValues: week.map { ($0.dayLabel, $0) })
  var subjects: [String] = []
  var seen = Set<String>()
  for day in dayOrder {
    let periods = (byDay[day]?.periods ?? []).sorted { $0.period < $1.period }
    for p in periods {
      let key = normalizeSubject(p.subject)
      guard !key.isEmpty, !seen.contains(key) else { continue }
      seen.insert(key)
      subjects.append(key)
    }
  }

  for subject in subjects {
    let base = subjectColorIndex(subject, paletteSize: palette.count)
    var idx = base
    for step in 0..<palette.count {
      idx = (base + step) % palette.count
      if !used.contains(idx) { break }
    }
    used.insert(idx)
    map[subject] = palette[idx]
  }
  return map
}

private func colorHexForSubject(_ subject: String, map: [String: String], excludeWhite: Bool = false) -> String? {
  let key = normalizeSubject(subject)
  guard !key.isEmpty else { return nil }
  if let hit = map[key] { return hit }
  let palette = excludeWhite ? subjectPaletteNoWhite : subjectPaletteHex
  guard !palette.isEmpty else { return nil }
  return palette[subjectColorIndex(key, paletteSize: palette.count)]
}

/// 파스텔 과목색을 텍스트용으로 어둡게 (factor↑ = 더 밝음)
private func darkenedSubjectColor(hex: String, factor: Double = 0.62) -> Color {
  var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
  if cleaned.hasPrefix("#") { cleaned.removeFirst() }
  var value: UInt64 = 0
  Scanner(string: cleaned).scanHexInt64(&value)
  guard cleaned.count == 6 else { return textPrimary }
  let r = Double((value & 0xFF0000) >> 16) / 255 * factor
  let g = Double((value & 0x00FF00) >> 8) / 255 * factor
  let b = Double(value & 0x0000FF) / 255 * factor
  return Color(.sRGB, red: min(r, 1), green: min(g, 1), blue: min(b, 1), opacity: 1)
}

/// 파스텔 과목색을 점용으로 채도↑·명도↓
private func subjectDotColor(hex: String) -> Color {
  var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
  if cleaned.hasPrefix("#") { cleaned.removeFirst() }
  var value: UInt64 = 0
  Scanner(string: cleaned).scanHexInt64(&value)
  guard cleaned.count == 6 else { return Color(hex: "C5C5C0") }
  let r = Double((value & 0xFF0000) >> 16) / 255
  let g = Double((value & 0x00FF00) >> 8) / 255
  let b = Double(value & 0x0000FF) / 255
  let maxC = max(r, max(g, b))
  let minC = min(r, min(g, b))
  var h = 0.0
  var s = 0.0
  let v = maxC
  let d = maxC - minC
  if d > 0.0001 {
    s = d / maxC
    if maxC == r {
      h = (g - b) / d + (g < b ? 6 : 0)
    } else if maxC == g {
      h = (b - r) / d + 2
    } else {
      h = (r - g) / d + 4
    }
    h /= 6
  }
  s = min(0.82, s * 1.55 + 0.22)
  let newV = min(0.78, max(0.48, v * 0.62))
  return Color(hue: h, saturation: s, brightness: newV)
}

// MARK: - Entry

enum TimetableWidgetStatus: Equatable {
  case needsPeriodSettings
  case needsTimetableData
  /// 주말·공휴일·과목 없는 평일 등 — 당일 과목이 전혀 없음
  case noClass
  case beforeSchool
  case inClass(period: Int)
  case breakTime(lastPeriod: Int)
  case afterSchool
}

/// Large 주간 격자용 셀 (과목 없으면 nil)
struct WeekdayPeriodCell: Hashable {
  let subjectName: String
  let subjectColorHex: String?
}

struct WeekdayPeriods: Hashable {
  let weekday: String
  /// 인덱스 = 교시 번호 - 1
  let periods: [WeekdayPeriodCell?]
}

struct TimetableEntry: TimelineEntry {
  let date: Date
  let dayLabel: String
  let statusText: String
  let statusTimeRange: String?
  let currentSubject: String
  let currentColorHex: String?
  let allPeriods: [MergedPeriod]
  let activePeriodNumber: Int?
  let status: TimetableWidgetStatus
  let isActiveAppearance: Bool
  /// Large(주간)용 — Medium 타임라인과 동일 엔트리에 함께 실음
  let weeklyPeriods: [WeekdayPeriods]
}

private let weekdayLabels = ["월", "화", "수", "목", "금"]

/// RN `TimetableScreen` termTitle과 동일
private func termTitle(from date: Date) -> String {
  let calendar = WidgetPayloadReader.kstCalendar
  let year = calendar.component(.year, from: date)
  let month = calendar.component(.month, from: date)
  let semester = (month >= 2 && month <= 7) ? "1학기" : "2학기"
  return "\(year)년 \(semester)"
}

// MARK: - Merge / Timeline helpers

enum TimetableTimelineBuilder {
  static func mergePeriods(for day: Date) -> (
    periods: [MergedPeriod],
    hasPeriodSettings: Bool,
    hasTimetablePayload: Bool,
    dayHasSubjects: Bool
  ) {
    let settings = WidgetPayloadReader.periodTimeSettings()
    let configs = (settings?.periods ?? []).sorted { $0.periodNumber < $1.periodNumber }
    let hasPeriodSettings = !configs.isEmpty

    let payload = WidgetPayloadReader.timetable()
    let hasTimetablePayload = payload != nil && payload?.empty != true
    let isWeekend = WidgetPayloadReader.isWeekend(date: day)
    let dayData: TimetableDayLite?
    if isWeekend {
      // 주말: 마지막 동기화 평일(todayDayLabel) fallback 금지
      dayData = nil
    } else {
      let dayLabel = WidgetPayloadReader.kstDayLabel(date: day)
      dayData =
        payload?.week?.first(where: { $0.dayLabel == dayLabel })
        ?? payload?.week?.first(where: { $0.dayLabel == payload?.todayDayLabel })
    }
    let subjectsByPeriod = Dictionary(
      uniqueKeysWithValues: (dayData?.periods ?? []).map { ($0.period, $0.subject) },
    )
    let colorMap = buildSubjectColorMap(week: payload?.week ?? [], excludeWhite: true)
    let dayHasSubjects = subjectsByPeriod.values.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

    guard hasPeriodSettings else {
      return ([], false, hasTimetablePayload, dayHasSubjects)
    }

    let lastSubjectPeriod = subjectsByPeriod.keys.max() ?? 0
    // 하단 리스트·당일 표시: 교시 시간 설정과 무관, 그날 마지막 교시까지만
    guard lastSubjectPeriod >= 1 else {
      return ([], true, hasTimetablePayload, dayHasSubjects)
    }
    let configByNumber = Dictionary(uniqueKeysWithValues: configs.map { ($0.periodNumber, $0) })

    var merged: [MergedPeriod] = []
    for n in 1...lastSubjectPeriod {
      let subject = subjectsByPeriod[n] ?? ""
      let cfg = configByNumber[n]
      let start = cfg.flatMap { WidgetPayloadReader.dateBySetting(hhmm: $0.startTime, on: day) }
      let end = cfg.flatMap { WidgetPayloadReader.dateBySetting(hhmm: $0.endTime, on: day) }
      let validTimes: (Date, Date)? = {
        guard let start, let end, end > start else { return nil }
        return (start, end)
      }()
      merged.append(
        MergedPeriod(
          number: n,
          startTime: validTimes?.0,
          endTime: validTimes?.1,
          subjectName: subject,
          subjectColorHex: colorHexForSubject(subject, map: colorMap, excludeWhite: true),
        ),
      )
    }
    return (merged, true, hasTimetablePayload, dayHasSubjects)
  }

  /// App Group 주간 시간표 + 교시 설정 개수로 Large용 격자 데이터 구성
  static func buildWeeklyPeriods() -> [WeekdayPeriods] {
    let settings = WidgetPayloadReader.periodTimeSettings()
    let configs = (settings?.periods ?? []).sorted { $0.periodNumber < $1.periodNumber }
    let payload = WidgetPayloadReader.timetable()
    let week = payload?.week ?? []
    let colorMap = buildSubjectColorMap(week: week, excludeWhite: false)

    let fromSettings = configs.map(\.periodNumber).max() ?? 0
    let fromWeek = week.flatMap { $0.periods.map(\.period) }.max() ?? 0
    // 행 수: 교시 시간 설정 우선, 없으면 시간표 최대 교시
    let maxN = fromSettings > 0 ? fromSettings : fromWeek
    guard maxN >= 1 else {
      return weekdayLabels.map { WeekdayPeriods(weekday: $0, periods: []) }
    }

    return weekdayLabels.map { day in
      let dayData = week.first(where: { $0.dayLabel == day })
      let byPeriod = Dictionary(
        uniqueKeysWithValues: (dayData?.periods ?? []).map { ($0.period, $0.subject) },
      )
      var cells: [WeekdayPeriodCell?] = []
      cells.reserveCapacity(maxN)
      for n in 1...maxN {
        let raw = byPeriod[n] ?? ""
        let subject = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if subject.isEmpty {
          cells.append(nil)
        } else {
          cells.append(
            WeekdayPeriodCell(
              subjectName: subject,
              subjectColorHex: colorHexForSubject(subject, map: colorMap),
            ),
          )
        }
      }
      return WeekdayPeriods(weekday: day, periods: cells)
    }
  }

  static func makeEntry(at date: Date, day: Date, periods: [MergedPeriod], status: TimetableWidgetStatus)
    -> TimetableEntry
  {
    let dayLabel = WidgetPayloadReader.formatDayLabel(day)
    let weekly = buildWeeklyPeriods()
    switch status {
    case .needsPeriodSettings:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "설정 필요",
        statusTimeRange: nil,
        currentSubject: "시간표 설정이 필요해요",
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    case .needsTimetableData:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "확인 필요",
        statusTimeRange: nil,
        currentSubject: "시간표를 확인해 주세요",
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    case .noClass:
      let weekend = WidgetPayloadReader.isWeekend(date: day)
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: weekend ? "주말이에요" : "수업 없음",
        statusTimeRange: nil,
        currentSubject: weekend ? "주말이에요" : "오늘은 수업이 없습니다",
        currentColorHex: nil,
        allPeriods: [],
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    case .beforeSchool:
      let first = periods.first(where: { !$0.subjectName.isEmpty }) ?? periods.first
      let subject: String = {
        if let first, !first.subjectName.isEmpty { return first.subjectName }
        if let n = first?.number { return "\(n)교시" }
        return "1교시"
      }()
      let range: String? = {
        guard let start = first?.startTime, let end = first?.endTime else { return nil }
        return WidgetPayloadReader.formatTimeRange(start, end)
      }()
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "수업시작 전",
        statusTimeRange: range,
        currentSubject: subject,
        currentColorHex: first?.subjectColorHex,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    case .afterSchool:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "하교",
        statusTimeRange: nil,
        currentSubject: "오늘 수업이 끝났습니다",
        currentColorHex: nil,
        allPeriods: [],
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    case .inClass(let n):
      let p = periods.first(where: { $0.number == n })
      let subject = (p?.subjectName.isEmpty == false) ? (p?.subjectName ?? "") : "\(n)교시"
      let range: String? = {
        guard let start = p?.startTime, let end = p?.endTime else { return nil }
        return WidgetPayloadReader.formatTimeRange(start, end)
      }()
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "\(n)교시",
        statusTimeRange: range,
        currentSubject: subject,
        currentColorHex: p?.subjectColorHex,
        allPeriods: periods,
        activePeriodNumber: n,
        status: status,
        isActiveAppearance: true,
        weeklyPeriods: weekly,
      )
    case .breakTime(let n):
      let p = periods.first(where: { $0.number == n })
      let subject = (p?.subjectName.isEmpty == false) ? (p?.subjectName ?? "") : "\(n)교시"
      let range: String? = {
        guard let start = p?.startTime, let end = p?.endTime else { return nil }
        return WidgetPayloadReader.formatTimeRange(start, end)
      }()
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "\(n)교시",
        statusTimeRange: range,
        currentSubject: subject,
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
        weeklyPeriods: weekly,
      )
    }
  }

  static func status(
    at date: Date,
    periods: [MergedPeriod],
    dayHasSubjects: Bool,
    hasTimetable: Bool,
    hasPeriodSettings: Bool,
  ) -> TimetableWidgetStatus {
    if !hasPeriodSettings { return .needsPeriodSettings }
    if !hasTimetable { return .needsTimetableData }
    // 주말·과목 없는 평일 모두 — 당일 00:00~23:59 동일
    if !dayHasSubjects { return .noClass }

    let scheduled = periods.filter(\.hasSchedule)
    guard let first = scheduled.first,
          let last = scheduled.last,
          let firstStart = first.startTime,
          let lastEnd = last.endTime
    else { return .beforeSchool }
    // 00:00 ~ 첫 교시 시작 전
    if date < firstStart { return .beforeSchool }
    // 마지막 교시 종료 후 ~ 23:59 (다음날 00:00 전)
    if date >= lastEnd { return .afterSchool }
    for (idx, p) in scheduled.enumerated() {
      guard let start = p.startTime, let end = p.endTime else { continue }
      if date >= start && date < end {
        return .inClass(period: p.number)
      }
      if idx < scheduled.count - 1 {
        let next = scheduled[idx + 1]
        if let nextStart = next.startTime, date >= end && date < nextStart {
          return .breakTime(lastPeriod: p.number)
        }
      }
    }
    return .afterSchool
  }

  static func buildTimeline() -> Timeline<TimetableEntry> {
    let cal = WidgetPayloadReader.kstCalendar
    let now = Date()
    // KST 자정 기준 날짜 경계
    let today = WidgetPayloadReader.startOfDay(now)
    let tomorrow = cal.date(byAdding: .day, value: 1, to: today) ?? today.addingTimeInterval(86400)

    var entries: [TimetableEntry] = []
    entries.append(contentsOf: entriesForDay(today, includeStartOfDay: true))
    entries.append(contentsOf: entriesForDay(tomorrow, includeStartOfDay: true))

    // 현재 시각 기준 엔트리 보장
    let todayMerge = mergePeriods(for: today)
    let st = status(
      at: now,
      periods: todayMerge.periods,
      dayHasSubjects: todayMerge.dayHasSubjects,
      hasTimetable: todayMerge.hasTimetablePayload,
      hasPeriodSettings: todayMerge.hasPeriodSettings,
    )
    entries.append(
      makeEntry(at: now, day: today, periods: todayMerge.periods, status: st),
    )

    let unique = Dictionary(grouping: entries, by: { $0.date.timeIntervalSince1970 })
      .compactMap { _, group in group.last }
      .sorted { $0.date < $1.date }

    // 모레 00:00에 리로드 — 자정 전환으로 다음날 시간표 반영
    let reloadAfter = cal.date(byAdding: .day, value: 1, to: tomorrow) ?? tomorrow.addingTimeInterval(86400)
    return Timeline(entries: unique, policy: .after(reloadAfter))
  }

  private static func entriesForDay(_ day: Date, includeStartOfDay: Bool) -> [TimetableEntry] {
    let merged = mergePeriods(for: day)
    var out: [TimetableEntry] = []

    if !merged.hasPeriodSettings {
      if includeStartOfDay {
        out.append(makeEntry(at: day, day: day, periods: [], status: .needsPeriodSettings))
      }
      return out
    }

    if !merged.hasTimetablePayload {
      if includeStartOfDay {
        out.append(
          makeEntry(at: day, day: day, periods: merged.periods, status: .needsTimetableData),
        )
      }
      return out
    }

    // 과목 없는 날(주말 포함): 자정 한 번만 — 다음날 00:00 엔트리가 이어받음
    if !merged.dayHasSubjects {
      if includeStartOfDay {
        out.append(makeEntry(at: day, day: day, periods: merged.periods, status: .noClass))
      }
      return out
    }

    let periods = merged.periods
    let scheduled = periods.filter(\.hasSchedule)
    // 당일 00:00 = 등교 전 시작
    if includeStartOfDay {
      out.append(makeEntry(at: day, day: day, periods: periods, status: .beforeSchool))
    }
    for (idx, p) in scheduled.enumerated() {
      guard let start = p.startTime, let end = p.endTime else { continue }
      out.append(makeEntry(at: start, day: day, periods: periods, status: .inClass(period: p.number)))
      if idx < scheduled.count - 1 {
        out.append(
          makeEntry(at: end, day: day, periods: periods, status: .breakTime(lastPeriod: p.number)),
        )
      } else {
        // 마지막 교시 종료 ~ 당일 끝(다음날 00:00 전)
        out.append(makeEntry(at: end, day: day, periods: periods, status: .afterSchool))
      }
    }
    return out
  }
}

// MARK: - Provider

struct TimetableProvider: TimelineProvider {
  func placeholder(in context: Context) -> TimetableEntry {
    TimetableTimelineBuilder.makeEntry(
      at: Date(),
      day: WidgetPayloadReader.startOfDay(Date()),
      periods: [],
      status: .beforeSchool,
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (TimetableEntry) -> Void) {
    let now = Date()
    let today = WidgetPayloadReader.startOfDay(now)
    let merged = TimetableTimelineBuilder.mergePeriods(for: today)
    if !merged.hasPeriodSettings {
      completion(
        TimetableTimelineBuilder.makeEntry(
          at: now, day: today, periods: [], status: .needsPeriodSettings,
        ),
      )
      return
    }
    let st = TimetableTimelineBuilder.status(
      at: now,
      periods: merged.periods,
      dayHasSubjects: merged.dayHasSubjects,
      hasTimetable: merged.hasTimetablePayload,
      hasPeriodSettings: merged.hasPeriodSettings,
    )
    completion(
      TimetableTimelineBuilder.makeEntry(at: now, day: today, periods: merged.periods, status: st),
    )
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TimetableEntry>) -> Void) {
    completion(TimetableTimelineBuilder.buildTimeline())
  }
}

// MARK: - Views

struct TimetableWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: TimetableEntry

  var body: some View {
    let link = URL(string: "youthpaper://mypage")!
    Link(destination: link) {
      ZStack {
        Color.white
        if family == .systemLarge {
          largeView
        } else {
          mediumView
        }
      }
    }
  }

  private var isMessageOnlyMedium: Bool {
    entry.status == .noClass || entry.status == .afterSchool
  }

  private var mediumView: some View {
    Group {
      if isMessageOnlyMedium {
        mediumMessageOnlyView
      } else {
        mediumStandardView
      }
    }
    .padding(widgetPad)
  }

  /// 과목 없는 날·하교: 배지·하단 리스트 없이 날짜 + 본문 중앙
  private var mediumMessageOnlyView: some View {
    VStack(spacing: 0) {
      HStack {
        Spacer(minLength: 0)
        Text(entry.dayLabel)
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(textPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }

      Spacer(minLength: 0)
      Text(entry.currentSubject)
        .font(.system(size: 12, weight: .regular))
        .foregroundColor(Color(hex: "272A26", opacity: 0.5))
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity)
      Spacer(minLength: 0)
    }
  }

  private var mediumStandardView: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 8) {
        statusBadge
        Spacer(minLength: 4)
        Text(entry.dayLabel)
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(textPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }

      Spacer(minLength: 0)

      Text(entry.currentSubject)
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(textPrimary)
        .lineLimit(1)
        .truncationMode(.tail)
        .padding(.leading, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)

      Spacer(minLength: 0)

      if !entry.allPeriods.isEmpty {
        VStack(spacing: 0) {
          Rectangle()
            .fill(inactiveBase.opacity(0.08))
            .frame(height: 1)
            .padding(.bottom, 4)
          HStack(spacing: 0) {
            ForEach(displayTodayPeriods) { period in
              periodColumn(period)
                .frame(maxWidth: .infinity)
            }
          }
        }
      }
    }
  }

  private var displayTodayPeriods: [MergedPeriod] {
    // 당일 마지막 교시까지 전부 표시 (패딩·상한 자르기 없음)
    entry.allPeriods
  }

  private var statusBadge: some View {
    HStack(spacing: 5) {
      Circle()
        .fill(
          entry.isActiveAppearance && entry.currentColorHex != nil
            ? subjectDotColor(hex: entry.currentColorHex!)
            : Color(hex: "C5C5C0"),
        )
        .frame(width: 8, height: 8)
      Text(badgeLabel)
        .font(.system(size: 11, weight: .medium))
        .foregroundColor(textPrimary)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
  }

  private var badgeLabel: String {
    if let range = entry.statusTimeRange {
      return "\(entry.statusText) (\(range))"
    }
    return entry.statusText
  }

  private func periodColumn(_ period: MergedPeriod) -> some View {
    let isActive = entry.activePeriodNumber == period.number
    let hex = period.subjectColorHex
    let bg: Color = {
      if isActive, let hex { return Color(hex: hex, opacity: 0.2) }
      return Color.clear
    }()
    let label = period.subjectName.trimmingCharacters(in: .whitespacesAndNewlines)
    let display = label.isEmpty ? "-" : label

    return VStack(alignment: .center, spacing: 0) {
      Text("\(period.number)교시")
        .font(.system(size: 9, weight: .regular))
        .foregroundColor(isActive ? Color(hex: "6F9163") : Color(hex: "888780"))
      Circle()
        .fill(isActive ? (hex.map { subjectDotColor(hex: $0) } ?? Color(hex: "C5C5C0")) : Color(hex: "C5C5C0"))
        .frame(width: 7, height: 7)
        .padding(.top, 5)
        .padding(.bottom, 5)
      Text(display)
        .font(.system(size: 10, weight: .regular))
        .foregroundColor(textPrimary)
        .lineLimit(1)
        .truncationMode(.tail)
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 3)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(bg))
  }

  /// Large: 주간(월~금) 정적 격자 — Medium의 진행/쉬는시간 상태와 무관
  private var largeView: some View {
    let weekly = entry.weeklyPeriods
    let rowCount = weekly.map(\.periods.count).max() ?? 0
    let displayRows: Int = {
      if rowCount < 1 { return 0 }
      return min(max(rowCount, 6), 8)
    }()
    let hasMore = rowCount > 8
    let hasAnySubject = weekly.contains { day in
      day.periods.contains { $0 != nil }
    }

    return VStack(alignment: .leading, spacing: 8) {
      largeHeader

      if !hasAnySubject || rowCount < 1 {
        Spacer(minLength: 0)
        Text(
          entry.status == .needsPeriodSettings
            ? "교시 시간 설정이 필요해요"
            : "시간표를 설정해주세요",
        )
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(textPrimary)
        if entry.status == .needsPeriodSettings {
          Text("탭하여 마이페이지에서 설정")
            .font(.system(size: 12))
            .foregroundColor(textPrimary.opacity(0.5))
        }
        Spacer(minLength: 0)
      } else {
        largeWeekGrid(weekly: weekly, rowCount: displayRows)
        if hasMore {
          Text("더보기")
            .font(.system(size: 11, weight: .regular))
            .foregroundColor(Color(hex: "272A26", opacity: 0.3))
            .frame(maxWidth: .infinity, alignment: .center)
        }
      }
    }
    .padding(0)
  }

  private var largeHeader: some View {
    HStack(alignment: .center, spacing: 6) {
      HStack(spacing: 4) {
        Image("YouthPaperLogo")
          .renderingMode(.template)
          .resizable()
          .scaledToFit()
          .frame(width: 18, height: 18)
          .foregroundColor(Color(hex: "A6DA95"))
        Text("시간표")
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(Color(hex: "A6DA95"))
      }
      Spacer(minLength: 4)
      Text(termTitle(from: entry.date))
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(textPrimary.opacity(0.55))
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
  }

  private func largeWeekGrid(weekly: [WeekdayPeriods], rowCount: Int) -> some View {
    let periodColWidth: CGFloat = 14
    let cellRadius: CGFloat = 5
    let gap: CGFloat = 3
    let byDay = Dictionary(uniqueKeysWithValues: weekly.map { ($0.weekday, $0) })

    return VStack(spacing: gap) {
      HStack(spacing: gap) {
        Color.clear.frame(width: periodColWidth)
        ForEach(weekdayLabels, id: \.self) { day in
          Text(day)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(textPrimary)
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
        }
      }

      ForEach(1...min(4, rowCount), id: \.self) { period in
        HStack(spacing: gap) {
          Text("\(period)")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(Color(hex: "888780"))
            .frame(width: periodColWidth, alignment: .leading)

          ForEach(weekdayLabels, id: \.self) { day in
            largeSubjectCell(
              cellAt(byDay: byDay, day: day, period: period),
              cornerRadius: cellRadius,
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
        }
        .frame(maxHeight: .infinity)
      }

      if rowCount >= 5 {
        Text("점심시간")
          .font(.system(size: 8, weight: .medium))
          .foregroundColor(Color(hex: "888780", opacity: 0.7))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 1)
      }

      if rowCount >= 5 {
        ForEach(5...rowCount, id: \.self) { period in
          HStack(spacing: gap) {
            Text("\(period)")
              .font(.system(size: 10, weight: .medium))
              .foregroundColor(Color(hex: "888780"))
              .frame(width: periodColWidth, alignment: .leading)

            ForEach(weekdayLabels, id: \.self) { day in
              largeSubjectCell(
                cellAt(byDay: byDay, day: day, period: period),
                cornerRadius: cellRadius,
              )
              .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
          }
          .frame(maxHeight: .infinity)
        }
      }
    }
  }

  private func cellAt(
    byDay: [String: WeekdayPeriods],
    day: String,
    period: Int,
  ) -> WeekdayPeriodCell? {
    guard let periods = byDay[day]?.periods else { return nil }
    let idx = period - 1
    guard idx >= 0, idx < periods.count else { return nil }
    return periods[idx]
  }

  @ViewBuilder
  private func largeSubjectCell(
    _ cell: WeekdayPeriodCell?,
    cornerRadius: CGFloat,
  ) -> some View {
    if let cell {
      filledLargeSubjectCell(cell, cornerRadius: cornerRadius)
    } else {
      Color.clear
    }
  }

  private func filledLargeSubjectCell(
    _ cell: WeekdayPeriodCell,
    cornerRadius: CGFloat,
  ) -> some View {
    let name = cell.subjectName
    let count = name.count
    let bg: Color = {
      guard let hex = cell.subjectColorHex else { return Color.clear }
      if isSubjectPaleHex(hex) {
        return Color(hex: subjectPaleHex)
      }
      return Color(hex: hex, opacity: 0.5)
    }()
    return Text(name)
      .font(.system(size: count >= 4 ? 10 : 12, weight: .medium))
      .foregroundColor(textPrimary)
      .lineLimit(1)
      .truncationMode(.tail)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .padding(.horizontal, 2)
      .background(
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
          .fill(bg)
      )
  }
}

struct TimetableWidget: Widget {
  let kind = "TimetableWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TimetableProvider()) { entry in
      if #available(iOS 17.0, *) {
        TimetableWidgetView(entry: entry)
          .containerBackground(.white, for: .widget)
      } else {
        TimetableWidgetView(entry: entry)
      }
    }
    .configurationDisplayName("시간표")
    .description("오늘·주간 시간표를 보여줍니다.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}
