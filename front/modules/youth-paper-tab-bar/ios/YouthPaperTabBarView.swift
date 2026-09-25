import CoreText
import ExpoModulesCore
import UIKit

struct TabIcon: Record {
  @Field var family: String = ""
  @Field var inactive: Int = 0
  @Field var active: Int = 0
}

// JS 탭 키 순서(timer, school, board, message, mypage)와 같아야 한다.
private let tabTitles = ["타이머", "우리 학교", "게시판", "메시지", "마이페이지"]
private let boardIndex = 2

// @expo/vector-icons 이름 → 폰트 PostScript 이름
private let postScriptNames = [
  "Octicons": "Octicons",
  "Ionicons": "Ionicons",
  "MaterialCommunityIcons": "MaterialDesignIcons",
]

private let iconFontSize: CGFloat = 26
private let iconCanvasSize = CGSize(width: 28, height: 28)

private let registerFontsOnce: Void = {
  guard let bundleURL = Bundle(for: YouthPaperTabBarView.self)
    .url(forResource: "YouthPaperTabBarFonts", withExtension: "bundle"),
    let fontURLs = Bundle(url: bundleURL)?.urls(forResourcesWithExtension: "ttf", subdirectory: nil)
  else { return }
  // expo-font가 같은 폰트를 먼저 등록했으면 실패하지만 UIFont(name:)으로는 쓸 수 있다.
  for url in fontURLs {
    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
  }
}()

private func glyphImage(family: String, codepoint: Int, color: UIColor) -> UIImage? {
  guard let name = postScriptNames[family],
        let font = UIFont(name: name, size: iconFontSize),
        let scalar = UnicodeScalar(codepoint) else { return nil }
  let glyph = String(Character(scalar)) as NSString
  let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
  let glyphSize = glyph.size(withAttributes: attributes)
  let origin = CGPoint(
    x: (iconCanvasSize.width - glyphSize.width) / 2,
    y: (iconCanvasSize.height - glyphSize.height) / 2
  )
  return UIGraphicsImageRenderer(size: iconCanvasSize).image { _ in
    glyph.draw(at: origin, withAttributes: attributes)
  }.withRenderingMode(.alwaysOriginal)
}

class YouthPaperTabBarView: ExpoView, UITabBarDelegate {
  let onTabSelect = EventDispatcher()
  let onPreferredHeightChange = EventDispatcher()

  var icons: [TabIcon] = [] { didSet { needsItemsUpdate = true } }
  var activeColor: UIColor = .black { didSet { needsItemsUpdate = true } }
  var inactiveColor: UIColor = .lightGray { didSet { needsItemsUpdate = true } }

  private var needsItemsUpdate = false
  private let tabBar = UITabBar()
  private var selectedIndex = boardIndex
  private var reportedHeight: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    _ = registerFontsOnce
    setUpTabBar()
    applyItems()
  }

  private func setUpTabBar() {
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

  func applyItemsIfNeeded() {
    guard needsItemsUpdate else { return }
    needsItemsUpdate = false
    applyItems()
  }

  private func applyItems() {
    tabBar.items = tabTitles.enumerated().map { index, title in
      let icon = index < icons.count ? icons[index] : nil
      let image = icon.flatMap { glyphImage(family: $0.family, codepoint: $0.inactive, color: inactiveColor) }
      let selectedImage = icon.flatMap { glyphImage(family: $0.family, codepoint: $0.active, color: activeColor) }
      return UITabBarItem(title: title, image: image, selectedImage: selectedImage)
        .tagged(index)
    }
    applyTitleColors()
    tabBar.selectedItem = tabBar.items?.first { $0.tag == selectedIndex }
  }

  // iOS 26 유리 탭 바는 unselectedItemTintColor를 무시해서 appearance로 글자색을 준다.
  private func applyTitleColors() {
    tabBar.tintColor = activeColor
    tabBar.unselectedItemTintColor = inactiveColor

    let appearance = UITabBarAppearance()
    appearance.configureWithDefaultBackground()
    for layout in [
      appearance.stackedLayoutAppearance,
      appearance.inlineLayoutAppearance,
      appearance.compactInlineLayoutAppearance,
    ] {
      layout.normal.titleTextAttributes = [.foregroundColor: inactiveColor]
      layout.normal.iconColor = inactiveColor
      layout.selected.titleTextAttributes = [.foregroundColor: activeColor]
      layout.selected.iconColor = activeColor
    }
    tabBar.standardAppearance = appearance
    tabBar.scrollEdgeAppearance = appearance
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
    selectedIndex = index
    tabBar.selectedItem = tabBar.items?.first { $0.tag == index }
  }

  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    onTabSelect(["index": item.tag])
  }
}

private extension UITabBarItem {
  func tagged(_ tag: Int) -> UITabBarItem {
    self.tag = tag
    return self
  }
}
