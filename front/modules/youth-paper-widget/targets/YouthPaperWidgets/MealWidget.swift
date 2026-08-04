import WidgetKit
import SwiftUI

private let widgetPad: CGFloat = 4
/// 기존 급식 위젯 배경색 → 뱃지 배경으로 재사용
private let mealBadgeBg = Color(red: 0.898, green: 0.957, blue: 0.878) // ≈ #E5F4E0
private let primaryGreen = Color(red: 111 / 255, green: 145 / 255, blue: 99 / 255) // #6F9163
private let textPrimary = Color(red: 39 / 255, green: 42 / 255, blue: 38 / 255) // #272A26

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
        Color.white
        VStack(alignment: .leading, spacing: 4) {
          HStack(alignment: .center) {
            Text(WidgetPayloadReader.formatYmd(first?.ymd))
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(textPrimary.opacity(0.5))
            Spacer(minLength: 0)
            mealTypeBadge(WidgetPayloadReader.mealTypeLabel(first?.mealType))
          }

          if first == nil || menus.isEmpty {
            Spacer(minLength: 0)
            Text("급식 정보 없음")
              .font(.system(size: 14, weight: .medium))
              .foregroundColor(textPrimary.opacity(0.55))
            Spacer(minLength: 0)
          } else {
            ForEach(Array(menus.prefix(5).enumerated()), id: \.offset) { _, menu in
              Text(menu)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(textPrimary)
                .lineLimit(1)
            }
            Spacer(minLength: 0)
          }
        }
        .padding(widgetPad)
      }
    }
  }

  private func mealTypeBadge(_ label: String) -> some View {
    Text(label)
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(primaryGreen)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(
        Capsule(style: .continuous)
          .fill(mealBadgeBg),
      )
  }
}

struct MealWidget: Widget {
  let kind = "MealWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MealProvider()) { entry in
      if #available(iOS 17.0, *) {
        MealWidgetView(entry: entry)
          .containerBackground(Color.white, for: .widget)
      } else {
        MealWidgetView(entry: entry)
      }
    }
    .configurationDisplayName("급식")
    .description("다음 급식 메뉴를 보여줍니다.")
    .supportedFamilies([.systemSmall])
  }
}
