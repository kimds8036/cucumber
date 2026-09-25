import ExpoModulesCore

public class YouthPaperTabBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YouthPaperTabBar")

    View(YouthPaperTabBarView.self) {
      Events("onTabSelect", "onPreferredHeightChange")

      Prop("selectedIndex") { (view: YouthPaperTabBarView, index: Int) in
        view.setSelectedIndex(index)
      }
    }
  }
}
