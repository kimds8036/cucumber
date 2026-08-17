package expo.modules.youthpaperwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.util.Log

/** 4x4 고정 주간 시간표 */
open class TimetableWeekWidgetReceiver : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    appWidgetIds.forEach { id ->
      try {
        TimetableWidgetViews.updateWeek(context, appWidgetManager, id)
      } catch (e: Exception) {
        Log.e("YouthPaperWidget", "Timetable week onUpdate failed", e)
        appWidgetManager.updateAppWidget(
          id,
          WidgetRes.views(context, "youth_paper_timetable_initial", "시간표"),
        )
      }
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    onUpdate(context, appWidgetManager, intArrayOf(appWidgetId))
  }

  override fun onEnabled(context: Context) {
    try {
      WidgetRefreshScheduler.schedule(context)
    } catch (_: Exception) {
    }
  }
}
