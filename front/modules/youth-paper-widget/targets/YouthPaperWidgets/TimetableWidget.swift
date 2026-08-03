import WidgetKit
import SwiftUI

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
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct TimetableWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: TimetableEntry

  var body: some View {
    let payload = entry.payload
    let empty = payload == nil || payload?.empty == true || (payload?.week?.allSatisfy { $0.periods.isEmpty } ?? true)
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
    VStack(spacing: 8) {
      Text("시간표를 설정해주세요")
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149))
      Text("탭하여 마이페이지로 이동")
        .font(.system(size: 12))
        .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.5))
    }
    .padding(16)
  }

  private func mediumView(payload: TimetableWidgetPayload, stale: Bool) -> some View {
    let today = WidgetPayloadReader.kstDayLabel()
    if WidgetPayloadReader.isWeekend() {
      return AnyView(
        VStack {
          Text("주말이에요")
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149))
          if stale { staleBanner }
        }
        .padding(16)
      )
    }
    let day = payload.week?.first(where: { $0.dayLabel == today })
      ?? payload.week?.first(where: { $0.dayLabel == payload.todayDayLabel })
    let periods = day?.periods ?? []
    return AnyView(
      VStack(alignment: .leading, spacing: 6) {
        HStack {
          Text("\(today)요일 시간표")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Color(red: 0.435, green: 0.569, blue: 0.388))
          Spacer()
        }
        if periods.isEmpty {
          Text("수업 없음")
            .font(.system(size: 14))
            .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.5))
        } else {
          ForEach(periods.prefix(7), id: \.period) { p in
            HStack(spacing: 8) {
              Text("\(p.period)")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(red: 0.435, green: 0.569, blue: 0.388))
                .frame(width: 16, alignment: .trailing)
              Text(p.subject)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149))
                .lineLimit(1)
              Spacer(minLength: 0)
            }
          }
        }
        if stale { staleBanner }
        Spacer(minLength: 0)
      }
      .padding(14)
    )
  }

  private func largeView(payload: TimetableWidgetPayload, stale: Bool) -> some View {
    let week = payload.week ?? []
    let maxPeriod = week.flatMap { $0.periods.map(\.period) }.max() ?? 7
    let periods = Array(1...min(max(maxPeriod, 1), 8))

    return VStack(alignment: .leading, spacing: 4) {
      Text("주간 시간표")
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(Color(red: 0.435, green: 0.569, blue: 0.388))
      HStack(spacing: 0) {
        Text("")
          .frame(width: 18)
        ForEach(["월", "화", "수", "목", "금"], id: \.self) { d in
          Text(d)
            .font(.system(size: 11, weight: .semibold))
            .frame(maxWidth: .infinity)
            .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.55))
        }
      }
      ForEach(periods, id: \.self) { period in
        HStack(spacing: 0) {
          Text("\(period)")
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(Color(red: 0.435, green: 0.569, blue: 0.388))
            .frame(width: 18, alignment: .trailing)
          ForEach(["월", "화", "수", "목", "금"], id: \.self) { d in
            let subject = week.first(where: { $0.dayLabel == d })?
              .periods.first(where: { $0.period == period })?
              .subject ?? ""
            Text(subject)
              .font(.system(size: 10, weight: .medium))
              .lineLimit(1)
              .minimumScaleFactor(0.7)
              .frame(maxWidth: .infinity)
              .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149))
          }
        }
      }
      if stale { staleBanner }
      Spacer(minLength: 0)
    }
    .padding(12)
  }

  private var staleBanner: some View {
    Text("최신화하려면 앱을 열어주세요")
      .font(.system(size: 10))
      .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.45))
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
