import WidgetKit
import SwiftUI

private let textPrimary = Color(hex: "272A26")
private let textSecondary = Color(hex: "272A26", opacity: 0.5)
private let mutedGray = Color(hex: "888780")
private let dividerColor = Color(hex: "E6E6E6")
private let primary = Color(hex: "A6DA95")
private let moreColor = Color(hex: "272A26", opacity: 0.3)
/// systemSmall 한 열 기준 물리적으로 보이는 최대 줄 수
private let maxMenusVisible = 6

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
    // 끼니 경계 재계산 없음 — 약 30분 주기 새로고침
    let next = Date().addingTimeInterval(30 * 60)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct MealWidgetView: View {
  var entry: MealEntry

  private var isEmpty: Bool {
    WidgetPayloadReader.shouldShowMealEmpty(entry.payload)
  }

  private var isVacation: Bool {
    entry.payload?.resolvedIsVacation == true
  }

  var body: some View {
    Link(destination: URL(string: "youthpaper://school")!) {
      ZStack {
        Color.white
        if isVacation {
          vacationView
        } else if isEmpty {
          emptyView
        } else {
          contentView
        }
      }
      .padding(0)
    }
  }

  private var emptyView: some View {
    Text("급식 정보 없음")
      .font(.system(size: 12, weight: .medium))
      .foregroundColor(mutedGray)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var vacationView: some View {
    Text(entry.payload?.bannerText ?? "당분간 급식 정보가 없어요")
      .font(.system(size: 12, weight: .medium))
      .foregroundColor(mutedGray)
      .multilineTextAlignment(.center)
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var contentView: some View {
    let payload = entry.payload
    let menus = payload?.resolvedMenus ?? []
    let mealType = payload?.resolvedMealType
    let visible = Array(menus.prefix(maxMenusVisible))
    let showMore = menus.count > maxMenusVisible

    return HStack(alignment: .top, spacing: 0) {
      VStack(alignment: .center, spacing: 6) {
        Image("MealRice")
          .renderingMode(.template)
          .resizable()
          .scaledToFit()
          .frame(width: 16, height: 16)
          .foregroundColor(textSecondary)

        Text(WidgetPayloadReader.formatYmd(payload?.resolvedYmd))
          .font(.system(size: 9, weight: .medium))
          .foregroundColor(textSecondary)
          .lineLimit(1)
          .multilineTextAlignment(.center)

        if let mealType, WidgetPayloadReader.isValidMealType(mealType) {
          mealTypeBadge(WidgetPayloadReader.mealTypeLabel(mealType))
        }

        Spacer(minLength: 0)
      }

      Rectangle()
        .fill(dividerColor)
        .frame(width: 1)
        .padding(.leading, 2)
        .padding(.trailing, 6)

      VStack(alignment: .leading, spacing: 0) {
        if menus.isEmpty {
          Text("정보 없음")
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(textPrimary)
          Spacer(minLength: 0)
        } else {
          VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(visible.enumerated()), id: \.offset) { _, menu in
              menuText(clippedMenu(menu))
            }
          }

          Spacer(minLength: 0)

          if showMore {
            Text("더보기")
              .font(.system(size: 10, weight: .regular))
              .foregroundColor(moreColor)
              .frame(maxWidth: .infinity, alignment: .trailing)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .padding(0)
  }

  private func clippedMenu(_ menu: String) -> String {
    let t = menu.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.count <= 7 { return t }
    return String(t.prefix(7)) + ".."
  }

  private func menuText(_ menu: String) -> some View {
    Text(menu)
      .font(.system(size: 11, weight: .medium))
      .foregroundColor(textPrimary)
      .lineLimit(1)
      .truncationMode(.tail)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func mealTypeBadge(_ label: String) -> some View {
    Text(label)
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(Color(hex: "6F9163"))
      .padding(.horizontal, 6)
      .padding(.vertical, 3)
      .background(
        Capsule(style: .continuous)
          .fill(Color(hex: "A6DA95", opacity: 0.1)),
      )
      .overlay(
        Capsule(style: .continuous)
          .stroke(Color(hex: "A6DA95", opacity: 0.3), lineWidth: 1),
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
