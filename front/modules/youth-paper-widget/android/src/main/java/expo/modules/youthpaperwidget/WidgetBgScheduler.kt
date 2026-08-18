package expo.modules.youthpaperwidget

import android.content.Context
import android.content.Intent
import android.content.BroadcastReceiver
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Duration
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

object WidgetBgScheduler {
  private const val MEAL_WORK = "yp_meal_widget_refresh"
  private const val TIMETABLE_WORK = "yp_timetable_widget_refresh"

  fun scheduleAll(context: Context) {
    val wm = WorkManager.getInstance(context.applicationContext)
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    // Glance/WorkManager는 exact 시각 보장이 어려워 6h periodic + 부팅 시 보정
    val meal = PeriodicWorkRequestBuilder<MealRefreshWorker>(6, TimeUnit.HOURS)
      .setConstraints(constraints)
      .setInitialDelay(computeMealInitialDelayMinutes(), TimeUnit.MINUTES)
      .build()
    wm.enqueueUniquePeriodicWork(MEAL_WORK, ExistingPeriodicWorkPolicy.UPDATE, meal)

    val tt = PeriodicWorkRequestBuilder<TimetableRefreshWorker>(24, TimeUnit.HOURS)
      .setConstraints(constraints)
      .setInitialDelay(computeTimetableInitialDelayMinutes(), TimeUnit.MINUTES)
      .build()
    wm.enqueueUniquePeriodicWork(TIMETABLE_WORK, ExistingPeriodicWorkPolicy.UPDATE, tt)
  }

  fun enqueueMealRetry(context: Context) {
    val req = OneTimeWorkRequestBuilder<MealRefreshWorker>()
      .setInitialDelay(30, TimeUnit.MINUTES)
      .setConstraints(
        Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
      )
      .build()
    WorkManager.getInstance(context).enqueue(req)
  }

  private fun kstNow(): ZonedDateTime = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))

  private fun computeMealInitialDelayMinutes(): Long {
    val now = kstNow()
    val hours = listOf(10, 14, 20)
    for (h in hours) {
      var next = now.withHour(h).withMinute(0).withSecond(0).withNano(0)
      if (next.isAfter(now)) {
        return Duration.between(now, next).toMinutes().coerceAtLeast(1)
      }
    }
    val next = now.plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0)
    return Duration.between(now, next).toMinutes().coerceAtLeast(1)
  }

  private fun computeTimetableInitialDelayMinutes(): Long {
    val now = kstNow()
    var next = now.plusDays(1).withHour(0).withMinute(15).withSecond(0).withNano(0)
    if (now.hour == 0 && now.minute < 60) {
      // 이미 자정 창이면 짧게
      next = now.plusMinutes(5)
    }
    return Duration.between(now, next).toMinutes().coerceAtLeast(1)
  }
}

class MealRefreshWorker(appContext: Context, params: WorkerParameters) :
  CoroutineWorker(appContext, params) {
  override suspend fun doWork(): Result {
    val schoolId = WidgetStorage.read(applicationContext, WidgetStorage.SCHOOL_ID_KEY).orEmpty()
    val base = WidgetStorage.read(applicationContext, WidgetStorage.API_BASE_URL_KEY).orEmpty()
      .trimEnd('/')
    if (schoolId.isEmpty() || base.isEmpty()) return Result.success()

    return try {
      val url = URL("$base/api/schools/$schoolId/meals/next?count=3")
      val conn = (url.openConnection() as HttpURLConnection).apply {
        connectTimeout = 15000
        readTimeout = 15000
        requestMethod = "GET"
      }
      val code = conn.responseCode
      if (code !in 200..299) {
        WidgetBgScheduler.enqueueMealRetry(applicationContext)
        return Result.retry()
      }
      val body = conn.inputStream.bufferedReader().use { it.readText() }
      val meals = JSONObject(body).optJSONObject("data")?.optJSONArray("meals") ?: JSONArray()
      val first = if (meals.length() > 0) meals.optJSONObject(0) else null
      val payload = JSONObject()
        .put("generatedAt", ZonedDateTime.now().toString())
        .put("first", first ?: JSONObject.NULL)
      WidgetStorage.write(applicationContext, WidgetStorage.MEAL_KEY, payload.toString())
      WidgetUpdater.updateAll(applicationContext)
      Result.success()
    } catch (_: Exception) {
      WidgetBgScheduler.enqueueMealRetry(applicationContext)
      Result.retry()
    }
  }
}

class TimetableRefreshWorker(appContext: Context, params: WorkerParameters) :
  CoroutineWorker(appContext, params) {
  override suspend fun doWork(): Result {
    val mirrorRaw = WidgetStorage.readAuthMirror(applicationContext) ?: return Result.success()
    val mirror = try {
      JSONObject(mirrorRaw)
    } catch (_: Exception) {
      return Result.success()
    }
    val refreshToken = mirror.optString("refreshToken")
    val deviceId = mirror.optString("deviceId")
    val base = WidgetStorage.read(applicationContext, WidgetStorage.API_BASE_URL_KEY).orEmpty()
      .trimEnd('/')
    if (refreshToken.isEmpty() || deviceId.isEmpty() || base.isEmpty()) return Result.success()

    return try {
      val refreshBody = JSONObject()
        .put("refreshToken", refreshToken)
        .put("deviceId", deviceId)
        .toString()
      val refreshConn = (URL("$base/api/auth/refresh").openConnection() as HttpURLConnection).apply {
        connectTimeout = 15000
        readTimeout = 15000
        requestMethod = "POST"
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        outputStream.use { it.write(refreshBody.toByteArray()) }
      }
      if (refreshConn.responseCode !in 200..299) return Result.success()
      val refreshResp = refreshConn.inputStream.bufferedReader().use { it.readText() }
      val data = JSONObject(refreshResp).optJSONObject("data") ?: JSONObject(refreshResp)
      val access = data.optString("token")
      if (access.isEmpty()) return Result.success()
      val nextRefresh = data.optString("refreshToken").ifEmpty { refreshToken }

      val updated = JSONObject()
        .put("accessToken", access)
        .put("refreshToken", nextRefresh)
        .put("deviceId", deviceId)
        .put("updatedAt", System.currentTimeMillis())
      WidgetStorage.writeAuthMirror(applicationContext, updated.toString())

      val ttConn = (URL("$base/api/timetable").openConnection() as HttpURLConnection).apply {
        connectTimeout = 20000
        readTimeout = 20000
        requestMethod = "GET"
        setRequestProperty("Authorization", "Bearer $access")
      }
      if (ttConn.responseCode !in 200..299) return Result.success()
      val ttResp = ttConn.inputStream.bufferedReader().use { it.readText() }
      val flat = JSONObject(ttResp).optJSONObject("data")?.optJSONObject("timetable")
        ?: JSONObject()
      val payload = buildTimetablePayload(flat)
      WidgetStorage.write(applicationContext, WidgetStorage.TIMETABLE_KEY, payload.toString())
      WidgetUpdater.updateAll(applicationContext)
      Result.success()
    } catch (_: Exception) {
      Result.success()
    }
  }

  private fun buildTimetablePayload(flat: JSONObject): JSONObject {
    val days = listOf("월", "화", "수", "목", "금")
    val week = JSONArray()
    var hasAny = false
    for (day in days) {
      val byPeriod = sortedMapOf<Int, String>()
      val keys = flat.keys()
      while (keys.hasNext()) {
        val key = keys.next()
        val subject = flat.optString(key).trim()
        if (subject.isEmpty()) continue
        val parts = key.split("-")
        if (parts.size != 2 || parts[0] != day) continue
        val period = parts[1].toIntOrNull() ?: continue
        byPeriod[period] = subject
      }
      val periods = JSONArray()
      for ((p, s) in byPeriod) {
        periods.put(JSONObject().put("period", p).put("subject", s))
        hasAny = true
      }
      week.put(JSONObject().put("dayLabel", day).put("periods", periods))
    }
    val today = kstDayLabel()
    return JSONObject()
      .put("generatedAt", ZonedDateTime.now().toString())
      .put("todayDayLabel", if (today in days) today else JSONObject.NULL)
      .put("week", week)
      .put("empty", !hasAny)
  }
}

class WidgetBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
      WidgetBgScheduler.scheduleAll(context)
    }
  }
}
