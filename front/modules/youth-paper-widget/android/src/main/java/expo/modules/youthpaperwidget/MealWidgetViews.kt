package expo.modules.youthpaperwidget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews

object MealWidgetViews {
  private const val MAX_MENUS = 6
  private const val MENU_CHARS = 7

  private fun clipMealMenu(raw: String): String {
    val t = raw.trim()
    if (t.length <= MENU_CHARS) return t
    return t.take(MENU_CHARS) + ".."
  }

  fun build(context: Context): RemoteViews {
    val views = WidgetRes.views(context, "youth_paper_meal_initial", "급식 정보 없음")
    WidgetRes.click(views, context, "meal_root", WidgetIntents.openUri(context, "youthpaper://school", 11))

    val payload = WidgetPayload.parseMeal(WidgetStore.read(context, WidgetStore.MEAL_KEY))
    if (WidgetPayload.shouldShowMealEmpty(payload)) {
      WidgetRes.visible(views, context, "meal_empty", true)
      WidgetRes.visible(views, context, "meal_content", false)
      return views
    }

    WidgetRes.visible(views, context, "meal_empty", false)
    WidgetRes.visible(views, context, "meal_content", true)
    WidgetRes.text(views, context, "meal_date", WidgetPayload.formatYmd(payload?.ymd))

    val mealType = payload?.mealType
    if (WidgetPayload.isValidMealType(mealType)) {
      WidgetRes.visible(views, context, "meal_badge", true)
      WidgetRes.text(views, context, "meal_badge", WidgetPayload.mealTypeLabel(mealType))
      WidgetRes.color(views, context, "meal_badge", WidgetColors.PRIMARY_DARK)
      WidgetRes.bg(views, context, "meal_badge", WidgetColors.MEAL_BADGE_BG)
    } else {
      WidgetRes.visible(views, context, "meal_badge", false)
    }

    val menus = payload?.menus.orEmpty()
    val menuNames = listOf("meal_menu_1", "meal_menu_2", "meal_menu_3", "meal_menu_4", "meal_menu_5", "meal_menu_6")
    if (menus.isEmpty()) {
      menuNames.forEach { WidgetRes.visible(views, context, it, false) }
      WidgetRes.visible(views, context, "meal_no_info", true)
    } else {
      WidgetRes.visible(views, context, "meal_no_info", false)
      val visible = menus.take(MAX_MENUS)
      menuNames.forEachIndexed { i, name ->
        if (i < visible.size) {
          WidgetRes.visible(views, context, name, true)
          WidgetRes.text(views, context, name, clipMealMenu(visible[i]))
        } else {
          WidgetRes.visible(views, context, name, false)
        }
      }
    }
    return views
  }

  fun updateAll(context: Context) {
    val mgr = AppWidgetManager.getInstance(context)
    val ids = mgr.getAppWidgetIds(WidgetRes.mealProvider(context))
    if (ids.isEmpty()) return
    val views = build(context)
    ids.forEach { mgr.updateAppWidget(it, views) }
  }
}
