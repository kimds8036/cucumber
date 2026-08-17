package expo.modules.youthpaperwidget

import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class MealPayload(
  val ymd: String?,
  val mealType: String?,
  val menus: List<String>,
  val syncedAt: String?,
)

data class PeriodConfig(
  val periodNumber: Int,
  val startTime: String,
  val endTime: String,
)

data class TimetablePeriodLite(
  val period: Int,
  val subject: String,
)

data class TimetableDayLite(
  val dayLabel: String,
  val periods: List<TimetablePeriodLite>,
)

data class TimetablePayload(
  val generatedAt: String?,
  val todayDayLabel: String?,
  val week: List<TimetableDayLite>,
  val empty: Boolean,
)

data class MergedPeriod(
  val number: Int,
  val startTime: Date?,
  val endTime: Date?,
  val subjectName: String,
  val subjectColorHex: String?,
) {
  val hasSchedule: Boolean get() = startTime != null && endTime != null
}

data class WeekdayPeriodCell(
  val subjectName: String,
  val subjectColorHex: String?,
)

data class WeekdayPeriods(
  val weekday: String,
  val periods: List<WeekdayPeriodCell?>,
)

object WidgetPayload {
  private val kst: TimeZone = TimeZone.getTimeZone("Asia/Seoul")

  fun kstCalendar(): Calendar =
    Calendar.getInstance(kst, Locale.KOREA).apply {
      firstDayOfWeek = Calendar.SUNDAY
    }

  fun parseMeal(raw: String?): MealPayload? {
    if (raw.isNullOrBlank()) return null
    return try {
      val obj = JSONObject(raw)
      val first = obj.optJSONObject("first")
      val ymd = obj.optStringOrNull("ymd") ?: first?.optStringOrNull("ymd")
      val mealType = obj.optStringOrNull("mealType") ?: first?.optStringOrNull("mealType")
      val menus = obj.optStringList("menus").ifEmpty { first?.optStringList("menus") ?: emptyList() }
      val synced = obj.optStringOrNull("syncedAt") ?: obj.optStringOrNull("generatedAt")
      MealPayload(ymd, mealType, menus, synced)
    } catch (_: Exception) {
      null
    }
  }

  fun parseTimetable(raw: String?): TimetablePayload? {
    if (raw.isNullOrBlank()) return null
    return try {
      val obj = JSONObject(raw)
      val weekArr = obj.optJSONArray("week") ?: JSONArray()
      val week = mutableListOf<TimetableDayLite>()
      for (i in 0 until weekArr.length()) {
        val day = weekArr.optJSONObject(i) ?: continue
        val periodsArr = day.optJSONArray("periods") ?: JSONArray()
        val periods = mutableListOf<TimetablePeriodLite>()
        for (j in 0 until periodsArr.length()) {
          val p = periodsArr.optJSONObject(j) ?: continue
          periods.add(
            TimetablePeriodLite(
              period = p.optInt("period"),
              subject = p.optString("subject", ""),
            ),
          )
        }
        week.add(TimetableDayLite(day.optString("dayLabel", ""), periods))
      }
      TimetablePayload(
        generatedAt = obj.optStringOrNull("generatedAt"),
        todayDayLabel = obj.optStringOrNull("todayDayLabel"),
        week = week,
        empty = obj.optBoolean("empty", false),
      )
    } catch (_: Exception) {
      null
    }
  }

  fun parsePeriodSettings(raw: String?): List<PeriodConfig> {
    if (raw.isNullOrBlank()) return emptyList()
    return try {
      val obj = JSONObject(raw)
      val arr = obj.optJSONArray("periods") ?: return emptyList()
      val out = mutableListOf<PeriodConfig>()
      for (i in 0 until arr.length()) {
        val p = arr.optJSONObject(i) ?: continue
        out.add(
          PeriodConfig(
            periodNumber = p.optInt("periodNumber"),
            startTime = p.optString("startTime", ""),
            endTime = p.optString("endTime", ""),
          ),
        )
      }
      out.sortedBy { it.periodNumber }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun mealTypeLabel(type: String?): String =
    when (type) {
      "breakfast" -> "조식"
      "lunch" -> "중식"
      "dinner" -> "석식"
      else -> "급식"
    }

  fun isValidMealType(type: String?): Boolean =
    type == "breakfast" || type == "lunch" || type == "dinner"

  fun formatYmd(ymd: String?): String {
    if (ymd == null || ymd.length != 8) return ""
    val m = ymd.substring(4, 6).toIntOrNull() ?: 0
    val d = ymd.substring(6, 8).toIntOrNull() ?: 0
    return "$m/$d"
  }

  fun kstDayLabel(date: Date = Date()): String {
    val cal = kstCalendar()
    cal.time = date
    return when (cal.get(Calendar.DAY_OF_WEEK)) {
      Calendar.SUNDAY -> "일"
      Calendar.MONDAY -> "월"
      Calendar.TUESDAY -> "화"
      Calendar.WEDNESDAY -> "수"
      Calendar.THURSDAY -> "목"
      Calendar.FRIDAY -> "금"
      else -> "토"
    }
  }

  fun startOfDay(date: Date): Date {
    val cal = kstCalendar()
    cal.time = date
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.time
  }

  fun dateBySetting(hhmm: String, on: Date): Date? {
    val parts = hhmm.split(":")
    if (parts.size != 2) return null
    val h = parts[0].toIntOrNull() ?: return null
    val m = parts[1].toIntOrNull() ?: return null
    val cal = kstCalendar()
    cal.time = on
    cal.set(Calendar.HOUR_OF_DAY, h)
    cal.set(Calendar.MINUTE, m)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.time
  }

  fun formatDayLabel(date: Date): String {
    val cal = kstCalendar()
    cal.time = date
    val month = cal.get(Calendar.MONTH) + 1
    val day = cal.get(Calendar.DAY_OF_MONTH)
    return "${month}월 ${day}일 (${kstDayLabel(date)})"
  }

  fun formatTimeRange(start: Date, end: Date): String {
    val f = SimpleDateFormat("HH:mm", Locale.KOREA)
    f.timeZone = kst
    return "${f.format(start)}~${f.format(end)}"
  }

  fun termTitle(date: Date): String {
    val cal = kstCalendar()
    cal.time = date
    val year = cal.get(Calendar.YEAR)
    val month = cal.get(Calendar.MONTH) + 1
    val semester = if (month in 2..7) "1학기" else "2학기"
    return "${year}년 $semester"
  }

  private fun parseIso8601(iso: String): Date? {
    val patterns = listOf(
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
      "yyyy-MM-dd'T'HH:mm:ss.SSSX",
      "yyyy-MM-dd'T'HH:mm:ssX",
    )
    for (p in patterns) {
      try {
        val f = SimpleDateFormat(p, Locale.US)
        f.timeZone = TimeZone.getTimeZone("UTC")
        return f.parse(iso)
      } catch (_: Exception) {
      }
    }
    return null
  }

  fun isMealStale(payload: MealPayload?): Boolean {
    val iso = payload?.syncedAt ?: return false
    val synced = parseIso8601(iso) ?: return false
    return Date().time - synced.time > WidgetStore.STALE_MS
  }

  fun shouldShowMealEmpty(payload: MealPayload?): Boolean {
    if (payload == null) return true
    if (isMealStale(payload)) return true
    if (!isValidMealType(payload.mealType)) return true
    return false
  }

  private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = optString(key, "")
    return v.ifBlank { null }
  }

  private fun JSONObject.optStringList(key: String): List<String> {
    val arr = optJSONArray(key) ?: return emptyList()
    val out = mutableListOf<String>()
    for (i in 0 until arr.length()) {
      val s = arr.optString(i, "")
      if (s.isNotBlank()) out.add(s)
    }
    return out
  }
}
