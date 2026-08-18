package expo.modules.youthpaperwidget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONArray
import org.json.JSONObject
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

class TimetableWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = TimetableWidget()
}

class TimetableWidget : GlanceAppWidget() {
  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val raw = WidgetStorage.read(context, WidgetStorage.TIMETABLE_KEY)
    val payload = raw?.let {
      try {
        JSONObject(it)
      } catch (_: Exception) {
        null
      }
    }
    provideContent {
      TimetableContent(payload)
    }
  }
}

private fun kstDayLabel(): String {
  val day = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).dayOfWeek.value // Mon=1
  return listOf("월", "화", "수", "목", "금", "토", "일").getOrElse(day - 1) { "월" }
}

private fun isWeekend(): Boolean {
  val label = kstDayLabel()
  return label == "토" || label == "일"
}

private fun isStale(payload: JSONObject?): Boolean {
  val iso = payload?.optString("generatedAt").orEmpty()
  if (iso.isEmpty()) return false
  return try {
    val generated = ZonedDateTime.parse(iso, DateTimeFormatter.ISO_DATE_TIME)
    ChronoUnit.MILLIS.between(generated, ZonedDateTime.now()) > 24L * 60 * 60 * 1000
  } catch (_: Exception) {
    false
  }
}

@Composable
private fun TimetableContent(payload: JSONObject?) {
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse("youthpaper://mypage")).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }
  val size = LocalSize.current
  val isLarge = size.height >= 180.dp
  val primary = Color(0xFF6F9163)
  val text = Color(0xFF272A26)
  val empty = payload == null || payload.optBoolean("empty", false) ||
    ((payload.optJSONArray("week")?.length() ?: 0) == 0)

  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(Color.White)
      .padding(8.dp)
      .clickable(actionStartActivity(intent)),
  ) {
    when {
      empty -> {
        Text(
          "시간표를 설정해주세요",
          style = TextStyle(color = ColorProvider(text), fontSize = 15.sp, fontWeight = FontWeight.Bold),
        )
        Spacer(modifier = GlanceModifier.height(6.dp))
        Text(
          "탭하여 마이페이지로 이동",
          style = TextStyle(color = ColorProvider(text.copy(alpha = 0.5f)), fontSize = 12.sp),
        )
      }
      !isLarge && isWeekend() -> {
        Text(
          "주말이에요",
          style = TextStyle(color = ColorProvider(text), fontSize = 16.sp, fontWeight = FontWeight.Bold),
        )
        if (isStale(payload)) staleText()
      }
      !isLarge -> MediumTimetable(payload!!, primary, text)
      else -> LargeTimetable(payload!!, primary, text)
    }
  }
}

@Composable
private fun staleText() {
  Spacer(modifier = GlanceModifier.height(6.dp))
  Text(
    "최신화하려면 앱을 열어주세요",
    style = TextStyle(color = ColorProvider(Color(0xFF272A26).copy(alpha = 0.45f)), fontSize = 10.sp),
  )
}

@Composable
private fun MediumTimetable(payload: JSONObject, primary: Color, text: Color) {
  val today = kstDayLabel()
  val week = payload.optJSONArray("week") ?: JSONArray()
  var dayObj: JSONObject? = null
  for (i in 0 until week.length()) {
    val d = week.optJSONObject(i) ?: continue
    if (d.optString("dayLabel") == today) {
      dayObj = d
      break
    }
  }
  Text(
    "${today}요일",
    style = TextStyle(color = ColorProvider(primary), fontSize = 12.sp, fontWeight = FontWeight.Bold),
  )
  Spacer(modifier = GlanceModifier.height(4.dp))

  val periodsArr = dayObj?.optJSONArray("periods") ?: JSONArray()
  val byPeriod = sortedMapOf<Int, String>()
  var maxPeriod = 7
  for (i in 0 until periodsArr.length()) {
    val p = periodsArr.optJSONObject(i) ?: continue
    val num = p.optInt("period")
    if (num < 1) continue
    byPeriod[num] = p.optString("subject")
    maxPeriod = maxOf(maxPeriod, num)
  }
  maxPeriod = minOf(maxOf(maxPeriod, 1), 9)

  if (byPeriod.isEmpty()) {
    Text(
      "수업 없음",
      style = TextStyle(color = ColorProvider(text.copy(alpha = 0.5f)), fontSize = 14.sp),
    )
  } else {
    // 1열 교시 / 2열 과목 — 1교시~마지막까지 하루 종일 유지
    Row(modifier = GlanceModifier.fillMaxWidth()) {
      Column {
        for (period in 1..maxPeriod) {
          Text(
            period.toString(),
            style = TextStyle(color = ColorProvider(primary), fontSize = 12.sp, fontWeight = FontWeight.Bold),
            modifier = GlanceModifier.width(18.dp),
          )
        }
      }
      Column(modifier = GlanceModifier.defaultWeight()) {
        for (period in 1..maxPeriod) {
          Text(
            byPeriod[period].orEmpty().ifEmpty { " " },
            style = TextStyle(color = ColorProvider(text), fontSize = 12.sp, fontWeight = FontWeight.Medium),
            maxLines = 1,
          )
        }
      }
    }
  }
  if (isStale(payload)) staleText()
}

@Composable
private fun LargeTimetable(payload: JSONObject, primary: Color, text: Color) {
  val week = payload.optJSONArray("week") ?: JSONArray()
  val days = listOf("월", "화", "수", "목", "금")
  val grid = Color(0xFFE8E8E8)
  var maxPeriod = 7
  for (i in 0 until week.length()) {
    val periods = week.optJSONObject(i)?.optJSONArray("periods") ?: continue
    for (j in 0 until periods.length()) {
      maxPeriod = maxOf(maxPeriod, periods.optJSONObject(j)?.optInt("period") ?: 0)
    }
  }
  maxPeriod = minOf(maxPeriod, 8)

  // 격자: 셀 배경으로 구분
  Row(modifier = GlanceModifier.fillMaxWidth().background(grid)) {
    Text(" ", modifier = GlanceModifier.width(16.dp))
    for (d in days) {
      Text(
        d,
        style = TextStyle(color = ColorProvider(text.copy(alpha = 0.55f)), fontSize = 10.sp, fontWeight = FontWeight.Bold),
        modifier = GlanceModifier.defaultWeight().padding(1.dp).background(Color.White),
      )
    }
  }
  for (period in 1..maxPeriod) {
    Row(modifier = GlanceModifier.fillMaxWidth().background(grid)) {
      Text(
        period.toString(),
        style = TextStyle(color = ColorProvider(primary), fontSize = 9.sp, fontWeight = FontWeight.Bold),
        modifier = GlanceModifier.width(16.dp).padding(1.dp).background(Color.White),
      )
      for (d in days) {
        var subject = ""
        for (i in 0 until week.length()) {
          val day = week.optJSONObject(i) ?: continue
          if (day.optString("dayLabel") != d) continue
          val periods = day.optJSONArray("periods") ?: continue
          for (j in 0 until periods.length()) {
            val p = periods.optJSONObject(j) ?: continue
            if (p.optInt("period") == period) {
              subject = p.optString("subject")
              break
            }
          }
        }
        Text(
          subject.ifEmpty { " " },
          style = TextStyle(color = ColorProvider(text), fontSize = 9.sp),
          maxLines = 1,
          modifier = GlanceModifier.defaultWeight().padding(1.dp).background(Color.White),
        )
      }
    }
  }
  if (isStale(payload)) staleText()
}
