package expo.modules.youthpaperwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.util.Log

open class TimetableWidgetReceiver : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    appWidgetIds.forEach { id ->
      try {
        TimetableWidgetViews.updateToday(context, appWidgetManager, id)
      } catch (e: Exception) {
        Log.e("YouthPaperWidget", "Timetable onUpdate failed", e)
        appWidgetManager.updateAppWidget(
          id,
          WidgetRes.views(context, "youth_paper_timetable_initial", "시간표"),
        )
      }
    }
    try {
      WidgetRefreshScheduler.schedule(context)
    } catch (_: Exception) {
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
