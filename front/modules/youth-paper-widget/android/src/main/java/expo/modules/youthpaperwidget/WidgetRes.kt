package expo.modules.youthpaperwidget

import android.app.PendingIntent
import android.content.Context
import android.view.View
import android.widget.RemoteViews

internal object WidgetRes {
  fun mealProvider(context: Context) =
    android.content.ComponentName(context.packageName, "com.ucost.YouthPaper.widget.MealWidgetReceiver")

  fun timetableTodayProvider(context: Context) =
    android.content.ComponentName(context.packageName, "com.ucost.YouthPaper.widget.TimetableWidgetReceiver")

  fun timetableWeekProvider(context: Context) =
    android.content.ComponentName(context.packageName, "com.ucost.YouthPaper.widget.TimetableWeekWidgetReceiver")

  fun views(context: Context, layoutName: String, fallbackText: String): RemoteViews {
    val pkg = context.packageName
    val id = context.resources.getIdentifier(layoutName, "layout", pkg)
    if (id != 0) {
      try {
        return RemoteViews(pkg, id)
      } catch (_: Exception) {
      }
    }
    val simple = RemoteViews("android", android.R.layout.simple_list_item_1)
    simple.setTextViewText(android.R.id.text1, fallbackText)
    return simple
  }

  fun id(context: Context, name: String): Int =
    context.resources.getIdentifier(name, "id", context.packageName)

  fun click(views: RemoteViews, context: Context, name: String, intent: PendingIntent) {
    val viewId = id(context, name)
    if (viewId != 0) views.setOnClickPendingIntent(viewId, intent)
  }

  fun text(views: RemoteViews, context: Context, name: String, value: CharSequence) {
    val viewId = id(context, name)
    if (viewId != 0) views.setTextViewText(viewId, value)
  }

  fun textEllipsis(
    views: RemoteViews,
    context: Context,
    name: String,
    value: CharSequence,
    maxChars: Int,
  ) {
    text(views, context, name, ellipsis(value.toString(), maxChars))
  }

  fun textEllipsisKeep(
    views: RemoteViews,
    context: Context,
    name: String,
    value: CharSequence,
    maxChars: Int,
  ) {
    text(views, context, name, ellipsisKeep(value.toString(), maxChars))
  }

  fun ellipsis(value: String, maxChars: Int): String {
    val t = value.trim()
    if (maxChars <= 2) return if (t.length <= maxChars) t else ".."
    if (t.length <= maxChars) return t
    return t.take(maxChars - 2) + ".."
  }

  /** maxChars글자까지는 그대로, 그보다 길면 그 글자수까지 보여 주고 .. */
  fun ellipsisKeep(value: String, maxChars: Int): String {
    val t = value.trim()
    if (t.length <= maxChars) return t
    return t.take(maxChars) + ".."
  }

  fun visible(views: RemoteViews, context: Context, name: String, show: Boolean) {
    val viewId = id(context, name)
    if (viewId != 0) views.setViewVisibility(viewId, if (show) View.VISIBLE else View.GONE)
  }

  fun color(views: RemoteViews, context: Context, name: String, color: Int) {
    val viewId = id(context, name)
    if (viewId != 0) views.setTextColor(viewId, color)
  }

  fun bg(views: RemoteViews, context: Context, name: String, color: Int) {
    val viewId = id(context, name)
    if (viewId != 0) views.setInt(viewId, "setBackgroundColor", color)
  }

  fun drawableBg(views: RemoteViews, context: Context, name: String, drawableName: String) {
    val viewId = id(context, name)
    val res = context.resources.getIdentifier(drawableName, "drawable", context.packageName)
    if (viewId != 0 && res != 0) views.setInt(viewId, "setBackgroundResource", res)
  }

  fun imageTint(views: RemoteViews, context: Context, name: String, color: Int) {
    val viewId = id(context, name)
    if (viewId != 0) views.setInt(viewId, "setColorFilter", color)
  }
}
