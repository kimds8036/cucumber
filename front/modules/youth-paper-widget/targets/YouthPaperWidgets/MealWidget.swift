import WidgetKit
import SwiftUI

struct MealEntry: TimelineEntry {
  let date: Date
  let payload: MealWidgetPayload?
}

struct MealProvider: TimelineProvider {
  func placeholder(in context: Context) -> MealEntry {
    MealEntry(date: Date(), payload: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (MealEntry) -> Void) {
    completion(MealEntry(date: Date(), payload: WidgetPayloadReader.meal()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MealEntry>) -> Void) {
    let entry = MealEntry(date: Date(), payload: WidgetPayloadReader.meal())
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct MealWidgetView: View {
  var entry: MealEntry

  var body: some View {
    let first = entry.payload?.first
    let menus = first?.menus ?? []
    Link(destination: URL(string: "youthpaper://school")!) {
      ZStack {
        Color(red: 0.898, green: 0.957, blue: 0.878)
        VStack(alignment: .leading, spacing: 6) {
          HStack {
            Text(WidgetPayloadReader.mealTypeLabel(first?.mealType))
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(Color(red: 0.435, green: 0.569, blue: 0.388))
            Spacer()
            Text(WidgetPayloadReader.formatYmd(first?.ymd))
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.5))
          }
          if first == nil || menus.isEmpty {
            Spacer(minLength: 0)
            Text("급식 정보 없음")
              .font(.system(size: 14, weight: .medium))
              .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149).opacity(0.55))
            Spacer(minLength: 0)
          } else {
            ForEach(Array(menus.prefix(5).enumerated()), id: \.offset) { _, menu in
              Text(menu)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(red: 0.153, green: 0.165, blue: 0.149))
                .lineLimit(1)
            }
            Spacer(minLength: 0)
          }
        }
        .padding(14)
      }
    }
  }
}

struct MealWidget: Widget {
  let kind = "MealWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MealProvider()) { entry in
      if #available(iOS 17.0, *) {
        MealWidgetView(entry: entry)
          .containerBackground(Color(red: 0.898, green: 0.957, blue: 0.878), for: .widget)
      } else {
        MealWidgetView(entry: entry)
      }
    }
    .configurationDisplayName("급식")
    .description("다음 급식 메뉴를 보여줍니다.")
    .supportedFamilies([.systemSmall])
  }
}
