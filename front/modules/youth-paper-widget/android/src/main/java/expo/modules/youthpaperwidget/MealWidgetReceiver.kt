package expo.modules.youthpaperwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log

open class MealWidgetReceiver : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    try {
      val views = MealWidgetViews.build(context)
      appWidgetIds.forEach { appWidgetManager.updateAppWidget(it, views) }
    } catch (e: Exception) {
      Log.e("YouthPaperWidget", "Meal onUpdate failed", e)
      val views = WidgetRes.views(context, "youth_paper_meal_initial", "급식")
      appWidgetIds.forEach { appWidgetManager.updateAppWidget(it, views) }
    }
  }

  override fun onEnabled(context: Context) {
    try {
      WidgetRefreshScheduler.schedule(context)
    } catch (_: Exception) {
    }
  }
}
