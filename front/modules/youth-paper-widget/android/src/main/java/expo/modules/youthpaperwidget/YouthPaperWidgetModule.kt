package expo.modules.youthpaperwidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YouthPaperWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YouthPaperWidget")

    AsyncFunction("writeMealPayload") { json: String ->
      val ctx = requireContext()
      WidgetStore.write(ctx, WidgetStore.MEAL_KEY, json)
      WidgetUpdater.reloadAll(ctx)
    }

    AsyncFunction("writeTimetablePayload") { json: String ->
      val ctx = requireContext()
      WidgetStore.write(ctx, WidgetStore.TIMETABLE_KEY, json)
      WidgetUpdater.reloadAll(ctx)
    }

    AsyncFunction("writePeriodTimeSettings") { json: String ->
      val ctx = requireContext()
      WidgetStore.write(ctx, WidgetStore.PERIOD_KEY, json)
      WidgetUpdater.reloadAll(ctx)
    }

    AsyncFunction("writeSchoolId") { schoolId: String ->
      WidgetStore.write(requireContext(), WidgetStore.SCHOOL_ID_KEY, schoolId)
    }

    AsyncFunction("writeApiBaseUrl") { url: String ->
      WidgetStore.write(requireContext(), WidgetStore.API_BASE_URL_KEY, url)
    }

    AsyncFunction("writeAuthMirror") { json: String ->
      WidgetStore.write(requireContext(), WidgetStore.AUTH_MIRROR_KEY, json)
    }

    AsyncFunction("clearAuthMirror") {
      WidgetStore.remove(requireContext(), WidgetStore.AUTH_MIRROR_KEY)
    }

    AsyncFunction("readAuthMirror") {
      WidgetStore.read(requireContext(), WidgetStore.AUTH_MIRROR_KEY)
    }

    AsyncFunction("reloadWidgets") {
      WidgetUpdater.reloadAll(requireContext())
    }

    AsyncFunction("scheduleBackgroundRefresh") {
      val ctx = requireContext()
      WidgetRefreshScheduler.schedule(ctx)
      WidgetUpdater.reloadAll(ctx)
    }
  }

  private fun requireContext() =
    appContext.reactContext ?: throw IllegalStateException("React context lost")
}
