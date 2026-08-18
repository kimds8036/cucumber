package expo.modules.youthpaperwidget

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object WidgetStorage {
  const val PREFS = "youth_paper_widget_prefs"
  const val MEAL_KEY = "meal_widget_payload"
  const val TIMETABLE_KEY = "timetable_widget_payload"
  const val PERIOD_TIME_SETTINGS_KEY = "period_time_settings"
  const val SCHOOL_ID_KEY = "widget_school_id"
  const val API_BASE_URL_KEY = "widget_api_base_url"
  private const val AUTH_PREFS = "youth_paper_widget_auth"
  private const val AUTH_MIRROR_KEY = "auth_mirror"

  fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun write(context: Context, key: String, value: String) {
    prefs(context).edit().putString(key, value).apply()
  }

  fun read(context: Context, key: String): String? =
    prefs(context).getString(key, null)

  private fun authPrefs(context: Context) =
    try {
      val masterKey = MasterKey.Builder(context.applicationContext)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
      EncryptedSharedPreferences.create(
        context.applicationContext,
        AUTH_PREFS,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
      )
    } catch (_: Exception) {
      context.applicationContext.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
    }

  fun writeAuthMirror(context: Context, json: String) {
    authPrefs(context).edit().putString(AUTH_MIRROR_KEY, json).apply()
  }

  fun readAuthMirror(context: Context): String? =
    authPrefs(context).getString(AUTH_MIRROR_KEY, null)

  fun clearAuthMirror(context: Context) {
    authPrefs(context).edit().remove(AUTH_MIRROR_KEY).apply()
  }
}
