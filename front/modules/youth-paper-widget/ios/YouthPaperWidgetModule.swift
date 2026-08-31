import ExpoModulesCore
import Foundation
import WidgetKit
import BackgroundTasks

public class YouthPaperWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YouthPaperWidget")

    // AppDelegate 주입 대신 모듈 로드 시 등록 (Archive/EAS 컴파일 안전)
    OnCreate {
      WidgetBackgroundScheduler.register()
      WidgetBackgroundScheduler.scheduleAll()
    }

    AsyncFunction("writeMealPayload") { (json: String) in
      WidgetSharedStore.write(key: WidgetSharedStore.mealKey, value: json)
    }

    AsyncFunction("writeTimetablePayload") { (json: String) in
      WidgetSharedStore.write(key: WidgetSharedStore.timetableKey, value: json)
    }

    AsyncFunction("writePeriodTimeSettings") { (json: String) in
      WidgetSharedStore.write(key: WidgetSharedStore.periodTimeSettingsKey, value: json)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: "TimetableWidget")
      }
    }

    AsyncFunction("writeSchoolId") { (schoolId: String) in
      WidgetSharedStore.write(key: WidgetSharedStore.schoolIdKey, value: schoolId)
    }

    AsyncFunction("writeApiBaseUrl") { (url: String) in
      WidgetSharedStore.write(key: WidgetSharedStore.apiBaseUrlKey, value: url)
    }

    AsyncFunction("writeAuthMirror") { (json: String) in
      WidgetAuthKeychain.write(json: json)
    }

    AsyncFunction("clearAuthMirror") {
      WidgetAuthKeychain.clear()
    }

    AsyncFunction("readAuthMirror") { () -> String? in
      WidgetAuthKeychain.read()
    }

    AsyncFunction("reloadWidgets") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    AsyncFunction("scheduleBackgroundRefresh") {
      WidgetBackgroundScheduler.scheduleAll()
    }
  }
}
