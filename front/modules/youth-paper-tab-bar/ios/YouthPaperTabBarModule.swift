import ExpoModulesCore

public class YouthPaperTabBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YouthPaperTabBar")

    View(YouthPaperTabBarView.self) {
      Events("onTabSelect", "onPreferredHeightChange")

      Prop("selectedIndex") { (view: YouthPaperTabBarView, index: Int) in
        view.setSelectedIndex(index)
      }

      Prop("icons") { (view: YouthPaperTabBarView, icons: [TabIcon]) in
        view.icons = icons
      }

      Prop("activeColor") { (view: YouthPaperTabBarView, color: UIColor) in
        view.activeColor = color
      }

      Prop("inactiveColor") { (view: YouthPaperTabBarView, color: UIColor) in
        view.inactiveColor = color
      }

      OnViewDidUpdateProps { (view: YouthPaperTabBarView) in
        view.applyItemsIfNeeded()
      }
    }
  }
}
