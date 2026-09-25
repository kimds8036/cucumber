import ExpoModulesCore
import UIKit

private struct TabItem {
  let title: String
  let symbol: String
}

// JS 탭 키 순서(board, message, school, timer, mypage)와 같아야 한다.
private let tabItems: [TabItem] = [
  TabItem(title: "게시판", symbol: "house.fill"),
  TabItem(title: "메시지", symbol: "bubble.left.and.bubble.right.fill"),
  TabItem(title: "우리 학교", symbol: "building.columns.fill"),
  TabItem(title: "타이머", symbol: "timer"),
  TabItem(title: "마이페이지", symbol: "person.fill"),
]

private let primaryColor = UIColor(red: 0xA6 / 255, green: 0xDA / 255, blue: 0x95 / 255, alpha: 1)
private let inactiveColor = UIColor(red: 0x8E / 255, green: 0x8E / 255, blue: 0x8E / 255, alpha: 1)

class YouthPaperTabBarView: ExpoView, UITabBarDelegate {
  let onTabSelect = EventDispatcher()
  let onPreferredHeightChange = EventDispatcher()

  private let tabBar = UITabBar()
  private var reportedHeight: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpTabBar()
  }

  private func setUpTabBar() {
    tabBar.items = tabItems.enumerated().map { index, item in
      UITabBarItem(title: item.title, image: UIImage(systemName: item.symbol), tag: index)
    }
    tabBar.selectedItem = tabBar.items?.first
    tabBar.tintColor = primaryColor
    tabBar.unselectedItemTintColor = inactiveColor
    tabBar.delegate = self
    tabBar.translatesAutoresizingMaskIntoConstraints = false
    addSubview(tabBar)

    NSLayoutConstraint.activate([
      tabBar.topAnchor.constraint(equalTo: topAnchor),
      tabBar.leadingAnchor.constraint(equalTo: leadingAnchor),
      tabBar.trailingAnchor.constraint(equalTo: trailingAnchor),
      tabBar.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  // iOS 버전마다 탭 바 기본 높이가 달라서 JS가 높이를 고정하면 아이콘이 잘린다.
  override func layoutSubviews() {
    super.layoutSubviews()
    guard bounds.width > 0 else { return }
    let height = tabBar.sizeThatFits(CGSize(width: bounds.width, height: .greatestFiniteMagnitude)).height
    if abs(height - reportedHeight) > 0.5 {
      reportedHeight = height
      onPreferredHeightChange(["height": height])
    }
  }

  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    setNeedsLayout()
  }

  func setSelectedIndex(_ index: Int) {
    tabBar.selectedItem = tabBar.items?.first { $0.tag == index }
  }

  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    onTabSelect(["index": item.tag])
  }
}
