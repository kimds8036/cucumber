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
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
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
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONObject

class MealWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = MealWidget()
}

class MealWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val raw = WidgetStorage.read(context, WidgetStorage.MEAL_KEY)
    val first = raw?.let {
      try {
        JSONObject(it).optJSONObject("first")
      } catch (_: Exception) {
        null
      }
    }
    provideContent {
      MealContent(first)
    }
  }
}

@Composable
private fun MealContent(first: JSONObject?) {
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse("youthpaper://school")).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }
  val bg = Color(0xFFE5F4E0)
  val primary = Color(0xFF6F9163)
  val text = Color(0xFF272A26)

  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(bg)
      .padding(8.dp)
      .clickable(actionStartActivity(intent)),
  ) {
    val mealType = when (first?.optString("mealType")) {
      "breakfast" -> "조식"
      "lunch" -> "중식"
      "dinner" -> "석식"
      else -> "급식"
    }
    val ymd = first?.optString("ymd").orEmpty()
    val dateLabel = if (ymd.length == 8) {
      "${ymd.substring(4, 6).toIntOrNull() ?: 0}/${ymd.substring(6, 8).toIntOrNull() ?: 0}"
    } else ""

    Row(modifier = GlanceModifier.fillMaxWidth()) {
      Text(
        mealType,
        style = TextStyle(color = ColorProvider(primary), fontSize = 13.sp, fontWeight = FontWeight.Bold),
      )
      Spacer(modifier = GlanceModifier.defaultWeight())
      Text(
        dateLabel,
        style = TextStyle(color = ColorProvider(text.copy(alpha = 0.5f)), fontSize = 11.sp),
      )
    }
    Spacer(modifier = GlanceModifier.height(8.dp))

    val menus = first?.optJSONArray("menus")
    if (first == null || menus == null || menus.length() == 0) {
      Text(
        "급식 정보 없음",
        style = TextStyle(color = ColorProvider(text.copy(alpha = 0.55f)), fontSize = 14.sp),
      )
    } else {
      val limit = minOf(5, menus.length())
      for (i in 0 until limit) {
        Text(
          menus.optString(i),
          style = TextStyle(color = ColorProvider(text), fontSize = 13.sp, fontWeight = FontWeight.Medium),
          maxLines = 1,
        )
      }
    }
  }
}
