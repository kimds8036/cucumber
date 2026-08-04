import WidgetKit
import SwiftUI

private let widgetPad: CGFloat = 4
/// mypage `colors.timetableBorder`
private let gridLine = Color(red: 230 / 255, green: 230 / 255, blue: 230 / 255) // #E6E6E6
/// `colors.primaryDark` / 요청값
private let primaryGreen = Color(red: 111 / 255, green: 145 / 255, blue: 99 / 255) // #6F9163
/// `colors.textPrimary`
private let textPrimary = Color(red: 39 / 255, green: 42 / 255, blue: 38 / 255) // #272A26

/// `TIMETABLE_SUBJECT_COLORS` (styles/colors.js) — 마이페이지 시간표와 동일, 위젯에서는 opacity 50%
private let subjectPalette: [Color] = [
  Color(red: 1, green: 232 / 255, blue: 232 / 255), // #FFE8E8
  Color(red: 1, green: 248 / 255, blue: 219 / 255), // #FFF8DB
  Color(red: 232 / 255, green: 246 / 255, blue: 227 / 255), // #E8F6E3
  Color(red: 232 / 255, green: 242 / 255, blue: 1), // #E8F2FF
  Color(red: 246 / 255, green: 234 / 255, blue: 1), // #F6EAFF
  Color(red: 1, green: 214 / 255, blue: 214 / 255), // #FFD6D6
  Color(red: 1, green: 234 / 255, blue: 193 / 255), // #FFEAC1
  Color(red: 203 / 255, green: 235 / 255, blue: 197 / 255), // #CBEBC5
  Color(red: 204 / 255, green: 226 / 255, blue: 252 / 255), // #CCE2FC
  Color(red: 234 / 255, green: 212 / 255, blue: 252 / 255), // #EAD4FC
].map { $0.opacity(0.5) }

/// Timetableview.jsx `getSubjectColorIndex` 와 동일 해시
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
  return abs(hash) % subjectPalette.count
}

/// colorSeed = 0 기준, 마이페이지와 같이 충돌 시 다음 색으로 이동
private func buildSubjectColorMap(week: [TimetableDayLite]) -> [String: Color] {
  var map: [String: Color] = [:]
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
    for step in 0..<subjectPalette.count {
      idx = (base + step) % subjectPalette.count
      if !used.contains(idx) { break }
    }
    used.insert(idx)
    map[subject] = subjectPalette[idx]
  }
  return map
}

private func colorForSubject(_ subject: String, map: [String: Color]) -> Color? {
  let key = normalizeSubject(subject)
  guard !key.isEmpty else { return nil }
  return map[key] ?? subjectPalette[subjectColorIndex(key)]
}

struct TimetableEntry: TimelineEntry {
  let date: Date
  let payload: TimetableWidgetPayload?
}

struct TimetableProvider: TimelineProvider {
  func placeholder(in context: Context) -> TimetableEntry {
    TimetableEntry(date: Date(), payload: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (TimetableEntry) -> Void) {
    completion(TimetableEntry(date: Date(), payload: WidgetPayloadReader.timetable()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TimetableEntry>) -> Void) {
    let entry = TimetableEntry(date: Date(), payload: WidgetPayloadReader.timetable())
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    let nextMidnight =
      cal.nextDate(
        after: Date(),
        matching: DateComponents(hour: 0, minute: 5),
        matchingPolicy: .nextTime,
      ) ?? Date().addingTimeInterval(6 * 3600)
    completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
  }
}

struct TimetableWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: TimetableEntry

  var body: some View {
    let payload = entry.payload
    let empty = payload == nil || payload?.empty == true
      || (payload?.week?.allSatisfy { $0.periods.isEmpty } ?? true)
    let stale = WidgetPayloadReader.isTimetableStale(payload)
    let link = URL(string: "youthpaper://mypage")!

    Link(destination: link) {
      ZStack {
        Color.white
        if empty {
          emptyView
        } else if family == .systemMedium {
          mediumView(payload: payload!, stale: stale)
        } else {
          largeView(payload: payload!, stale: stale)
        }
      }
    }
  }

  private var emptyView: some View {
    VStack(spacing: 6) {
      Text("시간표를 설정해주세요")
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(textPrimary)
      Text("탭하여 마이페이지로 이동")
        .font(.system(size: 12))
        .foregroundColor(textPrimary.opacity(0.5))
    }
    .padding(widgetPad)
  }

  /// 오늘 1교시~마지막 교시 전부
  private func mediumPeriodSlots(day: TimetableDayLite?) -> [(period: Int, subject: String)] {
    let byPeriod = Dictionary(
      uniqueKeysWithValues: (day?.periods ?? []).map { ($0.period, $0.subject) },
    )
    let maxPeriod = max(byPeriod.keys.max() ?? 7, 1)
    let capped = min(maxPeriod, 9)
    return (1...capped).map { p in
      (period: p, subject: byPeriod[p] ?? "")
    }
  }

  private func mediumView(payload: TimetableWidgetPayload, stale: Bool) -> some View {
    let today = WidgetPayloadReader.kstDayLabel()
    if WidgetPayloadReader.isWeekend() {
      return AnyView(
        VStack {
          Text("주말이에요")
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(textPrimary)
          if stale { staleBanner }
        }
        .padding(widgetPad)
      )
    }
    let day = payload.week?.first(where: { $0.dayLabel == today })
      ?? payload.week?.first(where: { $0.dayLabel == payload.todayDayLabel })
    let slots = mediumPeriodSlots(day: day)
    let colorMap = buildSubjectColorMap(week: payload.week ?? [])
    return AnyView(
      VStack(alignment: .leading, spacing: 0) {
        Text("\(today)요일")
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(primaryGreen)
          .padding(.bottom, 6)

        if slots.allSatisfy({ $0.subject.isEmpty }) {
          Text("수업 없음")
            .font(.system(size: 14))
            .foregroundColor(textPrimary.opacity(0.5))
          Spacer(minLength: 0)
        } else {
          // 여백·요일 제외 남은 높이 최대 사용, 1행 : 2행 = 1 : 1.5
          GeometryReader { geo in
            let row1H = geo.size.height / 2.5
            let row2H = geo.size.height - row1H
            VStack(spacing: 0) {
              HStack(spacing: 0) {
                ForEach(slots, id: \.period) { slot in
                  Text("\(slot.period)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(primaryGreen)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
                }
              }
              .frame(height: row1H)

              HStack(spacing: 0) {
                ForEach(slots, id: \.period) { slot in
                  let bg = colorForSubject(slot.subject, map: colorMap)
                  Text(slot.subject.isEmpty ? " " : slot.subject)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.65)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(bg ?? Color.white)
                    .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
                }
              }
              .frame(height: row2H)
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
              RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(gridLine, lineWidth: 1),
            )
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        if stale { staleBanner }
      }
      .padding(widgetPad)
    )
  }

  private func largeView(payload: TimetableWidgetPayload, stale: Bool) -> some View {
    let week = payload.week ?? []
    let colorMap = buildSubjectColorMap(week: week)
    let maxPeriod = week.flatMap { $0.periods.map(\.period) }.max() ?? 0
    // 기본 1~8교시 고정 표시
    let periods = Array(1...8)
    let hasMore = maxPeriod > 8
    let days = ["월", "화", "수", "목", "금"]

    return VStack(alignment: .leading, spacing: 6) {
      // 시간표 전체를 감싸는 가장 큰 사각형 (radius 20)
      VStack(spacing: 0) {
        HStack(spacing: 0) {
          Text("")
            .frame(width: 16)
            .frame(maxHeight: .infinity)
            .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
          ForEach(days, id: \.self) { d in
            Text(d)
              .font(.system(size: 10, weight: .semibold))
              .foregroundColor(primaryGreen)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
          }
        }
        .frame(height: 18)

        ForEach(periods, id: \.self) { period in
          HStack(spacing: 0) {
            Text("\(period)")
              .font(.system(size: 9, weight: .bold))
              .foregroundColor(primaryGreen)
              .frame(width: 16)
              .frame(maxHeight: .infinity)
              .overlay(Rectangle().stroke(gridLine, lineWidth: 0.5))
            ForEach(days, id: \.self) { d in
              let subject = week.first(where: { $0.dayLabel == d })?
                .periods.first(where: { $0.period == period })?
                .subject ?? ""
              let bg = colorForSubject(subject, map: colorMap)
              Text(subject)
                .font(.system(size: 9, weight: .medium))
                .lineLimit(1)
                .minimumScaleFactor(0.65)
                .foregroundColor(textPrimary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(bg ?? Color.white)
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

      // 9교시 이상 데이터가 있을 때만
      if hasMore {
        Text("더보기")
          .font(.system(size: 11, weight: .medium))
          .foregroundColor(textPrimary.opacity(0.55))
          .frame(maxWidth: .infinity, alignment: .center)
          .padding(.top, 6)
      }

      if stale { staleBanner }
      Spacer(minLength: 0)
    }
    .padding(widgetPad)
  }

  private var staleBanner: some View {
    Text("최신화하려면 앱을 열어주세요")
      .font(.system(size: 10))
      .foregroundColor(textPrimary.opacity(0.45))
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
