import WidgetKit
import SwiftUI

private let widgetPad: CGFloat = 0
private let textPrimary = Color(hex: "272A26")
private let inactiveBase = Color(hex: "272A26")

/// `TIMETABLE_SUBJECT_COLORS` (styles/colors.js)
private let subjectPaletteHex: [String] = [
  "FFE8E8", "FFF8DB", "E8F6E3", "E8F2FF", "F6EAFF",
  "FFD6D6", "FFEAC1", "CBEBC5", "CCE2FC", "EAD4FC",
]

private func normalizeSubject(_ value: String) -> String {
  value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
}

private func subjectColorIndex(_ subject: String) -> Int {
  let key = normalizeSubject(subject)
  guard !key.isEmpty else { return 0 }
  var hash = 0
  for scalar in key.unicodeScalars {
    hash = (hash * 31 + Int(scalar.value)) % 2_147_483_647
  }
  return abs(hash) % subjectPaletteHex.count
}

private func buildSubjectColorMap(week: [TimetableDayLite]) -> [String: String] {
  var map: [String: String] = [:]
  var used = Set<Int>()
  let subjects = Array(
    Set(
      week.flatMap { $0.periods.map { normalizeSubject($0.subject) } }
        .filter { !$0.isEmpty },
    ),
  ).sorted()

  for subject in subjects {
    let base = subjectColorIndex(subject)
    var idx = base
    for step in 0..<subjectPaletteHex.count {
      idx = (base + step) % subjectPaletteHex.count
      if !used.contains(idx) { break }
    }
    used.insert(idx)
    map[subject] = subjectPaletteHex[idx]
  }
  return map
}

private func colorHexForSubject(_ subject: String, map: [String: String]) -> String? {
  let key = normalizeSubject(subject)
  guard !key.isEmpty else { return nil }
  return map[key] ?? subjectPaletteHex[subjectColorIndex(key)]
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

// MARK: - Entry

enum TimetableWidgetStatus: Equatable {
  case needsPeriodSettings
  case needsTimetableData
  case holiday
  case beforeSchool
  case inClass(period: Int)
  case breakTime(lastPeriod: Int)
  case afterSchool
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
    let dayLabel = WidgetPayloadReader.kstDayLabel(date: day)
    let dayData =
      payload?.week?.first(where: { $0.dayLabel == dayLabel })
      ?? payload?.week?.first(where: { $0.dayLabel == payload?.todayDayLabel })
    let subjectsByPeriod = Dictionary(
      uniqueKeysWithValues: (dayData?.periods ?? []).map { ($0.period, $0.subject) },
    )
    let colorMap = buildSubjectColorMap(week: payload?.week ?? [])
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
          subjectColorHex: colorHexForSubject(subject, map: colorMap),
        ),
      )
    }
    return (merged, true, hasTimetablePayload, dayHasSubjects)
  }

  static func makeEntry(at date: Date, day: Date, periods: [MergedPeriod], status: TimetableWidgetStatus)
    -> TimetableEntry
  {
    let dayLabel = WidgetPayloadReader.formatDayLabel(day)
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
      )
    case .holiday:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "휴일",
        statusTimeRange: nil,
        currentSubject: "편안한 주말 보내세요",
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
      )
    case .beforeSchool:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "등교 전",
        statusTimeRange: nil,
        currentSubject: "즐거운 하루 되세요",
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
      )
    case .afterSchool:
      return TimetableEntry(
        date: date,
        dayLabel: dayLabel,
        statusText: "하교",
        statusTimeRange: nil,
        currentSubject: "오늘 하루도 수고했어요",
        currentColorHex: nil,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
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
        currentColorHex: p?.subjectColorHex,
        allPeriods: periods,
        activePeriodNumber: nil,
        status: status,
        isActiveAppearance: false,
      )
    }
  }

  static func status(at date: Date, periods: [MergedPeriod], dayHasSubjects: Bool, hasTimetable: Bool)
    -> TimetableWidgetStatus
  {
    if periods.isEmpty { return .needsPeriodSettings }
    if WidgetPayloadReader.isWeekend(date: date) || !dayHasSubjects {
      return .holiday
    }
    if !hasTimetable { return .needsTimetableData }
    let scheduled = periods.filter(\.hasSchedule)
    guard let first = scheduled.first,
          let last = scheduled.last,
          let firstStart = first.startTime,
          let lastEnd = last.endTime
    else { return .beforeSchool }
    if date < firstStart { return .beforeSchool }
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
    let today = WidgetPayloadReader.startOfDay(now)
    let tomorrow = cal.date(byAdding: .day, value: 1, to: today) ?? today.addingTimeInterval(86400)

    var entries: [TimetableEntry] = []
    entries.append(contentsOf: entriesForDay(today, includeStartOfDay: true))
    entries.append(contentsOf: entriesForDay(tomorrow, includeStartOfDay: true))

    // 현재 시각 기준 엔트리 보장
    let todayMerge = mergePeriods(for: today)
    if todayMerge.hasPeriodSettings {
      let st = status(
        at: now,
        periods: todayMerge.periods,
        dayHasSubjects: todayMerge.dayHasSubjects,
        hasTimetable: todayMerge.hasTimetablePayload,
      )
      entries.append(
        makeEntry(at: now, day: today, periods: todayMerge.periods, status: st),
      )
    } else {
      entries.append(
        makeEntry(at: now, day: today, periods: [], status: .needsPeriodSettings),
      )
    }

    let unique = Dictionary(grouping: entries, by: { $0.date.timeIntervalSince1970 })
      .compactMap { _, group in group.last }
      .sorted { $0.date < $1.date }

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

    if WidgetPayloadReader.isWeekend(date: day) || !merged.dayHasSubjects {
      if includeStartOfDay {
        out.append(makeEntry(at: day, day: day, periods: merged.periods, status: .holiday))
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

    let periods = merged.periods
    let scheduled = periods.filter(\.hasSchedule)
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

  private var badgeBg: Color {
    if entry.isActiveAppearance, let hex = entry.currentColorHex {
      return Color(hex: hex, opacity: 0.2)
    }
    return inactiveBase.opacity(0.1)
  }

  private var badgeStroke: Color {
    if entry.isActiveAppearance, let hex = entry.currentColorHex {
      return Color(hex: hex, opacity: 0.4)
    }
    return inactiveBase.opacity(0.3)
  }

  private var badgeForeground: Color {
    if entry.isActiveAppearance, let hex = entry.currentColorHex {
      return darkenedSubjectColor(hex: hex)
    }
    return inactiveBase.opacity(0.3)
  }

  private var badgeLogoColor: Color {
    if entry.isActiveAppearance, let hex = entry.currentColorHex {
      return Color(hex: hex)
    }
    return inactiveBase.opacity(0.3)
  }

  private var mediumView: some View {
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

      Spacer(minLength: 6)

      Text(entry.currentSubject)
        .font(.system(size: 24, weight: .bold))
        .foregroundColor(textPrimary)
        .lineLimit(2)
        .minimumScaleFactor(0.7)

      Spacer(minLength: 6)

      if !entry.allPeriods.isEmpty {
        Rectangle()
          .fill(inactiveBase.opacity(0.08))
          .frame(height: 1)
          .padding(.bottom, 6)

        HStack(spacing: 0) {
          ForEach(entry.allPeriods) { period in
            periodColumn(period)
              .frame(maxWidth: .infinity)
          }
        }
      }
    }
    .padding(widgetPad)
  }

  private var statusBadge: some View {
    HStack(spacing: 4) {
      Image("YouthPaperLogo")
        .renderingMode(.template)
        .resizable()
        .scaledToFit()
        .frame(width: 14, height: 14)
        .foregroundColor(badgeLogoColor)
      Text(badgeLabel)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(badgeForeground)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(
      Capsule(style: .continuous).fill(badgeBg),
    )
    .overlay(
      Capsule(style: .continuous).stroke(badgeStroke, lineWidth: 1),
    )
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
    let fg: Color = {
      if isActive, let hex { return darkenedSubjectColor(hex: hex) }
      return inactiveBase.opacity(0.3)
    }()
    let bg: Color = {
      if isActive, let hex { return Color(hex: hex, opacity: 0.2) }
      return Color.clear
    }()
    let stroke: Color = {
      if isActive, let hex { return Color(hex: hex, opacity: 0.4) }
      return Color.clear
    }()
    let label = period.subjectName.isEmpty ? "-" : period.subjectName

    return VStack(spacing: 3) {
      Text("\(period.number)")
        .font(.system(size: 9, weight: .semibold))
        .foregroundColor(isActive ? fg : inactiveBase.opacity(0.35))
      Text(label)
        .font(.system(size: 9, weight: .medium))
        .foregroundColor(fg)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .padding(.horizontal, 3)
    .padding(.vertical, 8)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 4, style: .continuous).fill(bg))
    .overlay(
      RoundedRectangle(cornerRadius: 4, style: .continuous).stroke(stroke, lineWidth: 0.8),
    )
  }

  /// Large: 기존 주간 격자 유지 (타임라인 entry의 allPeriods / week payload 병행)
  private var largeView: some View {
    let payload = WidgetPayloadReader.timetable()
    let week = payload?.week ?? []
    let colorMap = buildSubjectColorMap(week: week)
    let days = ["월", "화", "수", "목", "금"]
    let maxPeriod = week.flatMap { $0.periods.map(\.period) }.max() ?? 0
    let periods = Array(1...8)
    let hasMore = maxPeriod > 8
    let gridLine = Color(hex: "E6E6E6")

    return VStack(alignment: .leading, spacing: 6) {
      if entry.status == .needsPeriodSettings {
        Text("교시 시간 설정이 필요해요")
          .font(.system(size: 15, weight: .semibold))
          .foregroundColor(textPrimary)
        Text("탭하여 마이페이지에서 설정")
          .font(.system(size: 12))
          .foregroundColor(textPrimary.opacity(0.5))
        Spacer(minLength: 0)
      } else if week.isEmpty || payload?.empty == true {
        Text("시간표를 설정해주세요")
          .font(.system(size: 15, weight: .semibold))
          .foregroundColor(textPrimary)
        Spacer(minLength: 0)
      } else {
        VStack(spacing: 0) {
          HStack(spacing: 0) {
            Text("").frame(width: 16).frame(maxHeight: .infinity)
              .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
            ForEach(days, id: \.self) { d in
              Text(d)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "6F9163"))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
            }
          }
          .frame(height: 18)

          ForEach(periods, id: \.self) { period in
            HStack(spacing: 0) {
              Text("\(period)")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(Color(hex: "6F9163"))
                .frame(width: 16)
                .frame(maxHeight: .infinity)
                .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
              ForEach(days, id: \.self) { d in
                let subject = week.first(where: { $0.dayLabel == d })?
                  .periods.first(where: { $0.period == period })?
                  .subject ?? ""
                let hex = colorHexForSubject(subject, map: colorMap)
                Text(subject)
                  .font(.system(size: 9, weight: .medium))
                  .lineLimit(1)
                  .minimumScaleFactor(0.65)
                  .foregroundColor(textPrimary)
                  .frame(maxWidth: .infinity, maxHeight: .infinity)
                  .background(hex.map { Color(hex: $0, opacity: 0.5) } ?? Color.white)
                  .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
              }
            }
            .frame(minHeight: 16)
          }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 10, style: .continuous)
            .stroke(gridLine, lineWidth: 1),
        )
        if hasMore {
          Text("더보기")
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(textPrimary.opacity(0.55))
            .frame(maxWidth: .infinity, alignment: .center)
        }
        Spacer(minLength: 0)
      }
    }
    .padding(widgetPad)
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
    .description("오늘 교시·과목을 보여줍니다.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}
