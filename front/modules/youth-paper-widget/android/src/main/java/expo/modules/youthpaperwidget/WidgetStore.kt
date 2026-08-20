package expo.modules.youthpaperwidget

import android.content.Context

object WidgetStore {
  const val PREFS_NAME = "group.com.ucost.YouthPaper"
  const val MEAL_KEY = "meal_widget_payload"
  const val TIMETABLE_KEY = "timetable_widget_payload"
  const val PERIOD_KEY = "period_time_settings"
  const val SCHOOL_ID_KEY = "school_id"
  const val API_BASE_URL_KEY = "api_base_url"
  const val AUTH_MIRROR_KEY = "auth_mirror"
  const val STALE_MS = 24L * 60L * 60L * 1000L

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun write(context: Context, key: String, value: String) {
    prefs(context).edit().putString(key, value).apply()
  }

  fun read(context: Context, key: String): String? =
    prefs(context).getString(key, null)

  fun remove(context: Context, key: String) {
    prefs(context).edit().remove(key).apply()
  }
}
