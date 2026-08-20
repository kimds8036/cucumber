package expo.modules.youthpaperwidget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews

object TimetableWidgetViews {
  private const val MIN_PERIODS = 6
  private const val MAX_PERIODS = 8
  private val WEEKDAYS = listOf("월", "화", "수", "목", "금")

  private fun displayPeriodCount(actual: Int): Int {
    if (actual <= 0) return 0
    return actual.coerceIn(MIN_PERIODS, MAX_PERIODS)
  }

  fun updateAll(context: Context) {
    val mgr = AppWidgetManager.getInstance(context)
    mgr.getAppWidgetIds(WidgetRes.timetableTodayProvider(context)).forEach {
      updateToday(context, mgr, it)
    }
    mgr.getAppWidgetIds(WidgetRes.timetableWeekProvider(context)).forEach {
      updateWeek(context, mgr, it)
    }
  }

  fun updateToday(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
    mgr.updateAppWidget(appWidgetId, build(context, large = false))
  }

  fun updateWeek(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
    mgr.updateAppWidget(appWidgetId, build(context, large = true))
  }

  private fun build(context: Context, large: Boolean): RemoteViews {
    val views = WidgetRes.views(context, "youth_paper_timetable_initial", "시간표")
    WidgetRes.click(views, context, "timetable_root", WidgetIntents.openUri(context, "youthpaper://mypage", 21))
    val entry = TimetableLogic.currentEntry(context)
    WidgetRes.visible(views, context, "medium_block", !large)
    WidgetRes.visible(views, context, "large_block", large)
    if (large) fillLarge(context, views, entry) else fillMedium(context, views, entry)
    return views
  }

  private fun fillMedium(context: Context, views: RemoteViews, entry: TimetableEntry) {
    val messageOnly =
      entry.status is TimetableStatus.NoClass || entry.status is TimetableStatus.AfterSchool
    if (messageOnly) {
      WidgetRes.visible(views, context, "medium_message", true)
      WidgetRes.visible(views, context, "medium_standard", false)
      WidgetRes.text(views, context, "medium_msg_date", entry.dayLabel)
      WidgetRes.text(views, context, "medium_msg_body", entry.currentSubject)
      return
    }
    WidgetRes.visible(views, context, "medium_message", false)
    WidgetRes.visible(views, context, "medium_standard", true)
    WidgetRes.text(views, context, "medium_date", entry.dayLabel)
    WidgetRes.color(views, context, "medium_date", WidgetColors.TEXT_PRIMARY)
    WidgetRes.text(views, context, "medium_subject", entry.currentSubject)
    val badge = if (entry.statusTimeRange != null) {
      "${entry.statusText} (${entry.statusTimeRange})"
    } else {
      entry.statusText
    }
    WidgetRes.text(views, context, "medium_badge_text", badge)
    WidgetRes.color(views, context, "medium_badge_text", WidgetColors.TEXT_PRIMARY)
    WidgetRes.visible(views, context, "medium_badge_dot", true)
    val hex = entry.currentColorHex
    if (entry.isActiveAppearance && hex != null) {
      WidgetRes.imageTint(views, context, "medium_badge_dot", WidgetColors.subjectDot(hex))
    } else {
      WidgetRes.imageTint(views, context, "medium_badge_dot", WidgetColors.DOT_GRAY)
    }

    val hasPeriods = entry.allPeriods.isNotEmpty()
    val displayCount = entry.allPeriods.size.coerceAtMost(MAX_PERIODS)
    WidgetRes.visible(views, context, "medium_divider", hasPeriods)
    for (i in 1..MAX_PERIODS) {
      if (!hasPeriods || i > displayCount) {
        WidgetRes.visible(views, context, "period_root_$i", false)
        continue
      }
      val period = entry.allPeriods.getOrNull(i - 1)
      WidgetRes.visible(views, context, "period_root_$i", true)
      WidgetRes.text(views, context, "period_num_$i", "${period?.number ?: i}교시")
      WidgetRes.textEllipsisKeep(
        views,
        context,
        "period_subject_$i",
        if (period == null || period.subjectName.isEmpty()) "-" else period.subjectName,
        5,
      )
      val isActive = period != null && entry.activePeriodNumber == period.number
      val pHex = period?.subjectColorHex
      WidgetRes.color(
        views,
        context,
        "period_num_$i",
        if (isActive) WidgetColors.PRIMARY_DARK else WidgetColors.MUTED,
      )
      WidgetRes.color(views, context, "period_subject_$i", WidgetColors.TEXT_PRIMARY)
      if (isActive && pHex != null) {
        WidgetRes.imageTint(views, context, "period_dot_$i", WidgetColors.subjectDot(pHex))
        WidgetRes.drawableBg(views, context, "period_root_$i", WidgetColors.chipDrawable(pHex))
      } else {
        WidgetRes.imageTint(views, context, "period_dot_$i", WidgetColors.DOT_GRAY)
        WidgetRes.drawableBg(views, context, "period_root_$i", "widget_chip_clear")
      }
    }
  }

  private fun fillLarge(context: Context, views: RemoteViews, entry: TimetableEntry) {
    WidgetRes.text(views, context, "large_term", WidgetPayload.termTitle(entry.date))
    val weekly = entry.weeklyPeriods
    val hasAny = weekly.any { day -> day.periods.any { it != null } }
    if (!hasAny) {
      WidgetRes.visible(views, context, "large_empty_title", true)
      WidgetRes.visible(views, context, "large_grid", false)
      WidgetRes.visible(views, context, "lg_lunch_row", false)
      val needsSettings = entry.status is TimetableStatus.NeedsPeriodSettings
      WidgetRes.text(
        views,
        context,
        "large_empty_title",
        if (needsSettings) "교시 시간 설정이 필요해요" else "시간표를 설정해주세요",
      )
      return
    }
    WidgetRes.visible(views, context, "large_empty_title", false)
    WidgetRes.visible(views, context, "large_grid", true)
    val byDay = weekly.associateBy { it.weekday }
    val rowCount = weekly.maxOfOrNull { it.periods.size } ?: 0
    val displayRows = displayPeriodCount(rowCount)
    WidgetRes.visible(views, context, "lg_lunch_row", displayRows >= 5)
    for (row in 1..MAX_PERIODS) {
      val showRow = row <= displayRows
      WidgetRes.visible(views, context, "lg_row_$row", showRow)
      if (!showRow) continue
      WEEKDAYS.forEachIndexed { colIdx, day ->
        val cellId = "lg_r${row}c${colIdx + 1}"
        val cell = byDay[day]?.periods?.getOrNull(row - 1)
        if (cell == null) {
          WidgetRes.text(views, context, cellId, "")
          WidgetRes.drawableBg(views, context, cellId, "widget_cell_clear")
        } else {
          WidgetRes.textEllipsis(views, context, cellId, cell.subjectName, 4)
          WidgetRes.drawableBg(views, context, cellId, WidgetColors.cellDrawable(cell.subjectColorHex))
        }
      }
    }
  }
}
