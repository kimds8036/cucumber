package expo.modules.youthpaperwidget

import android.content.Context
import java.util.Calendar
import java.util.Date

sealed class TimetableStatus {
  data object NeedsPeriodSettings : TimetableStatus()
  data object NeedsTimetableData : TimetableStatus()
  data object NoClass : TimetableStatus()
  data object BeforeSchool : TimetableStatus()
  data class InClass(val period: Int) : TimetableStatus()
  data class BreakTime(val lastPeriod: Int) : TimetableStatus()
  data object AfterSchool : TimetableStatus()
}

data class TimetableEntry(
  val date: Date,
  val dayLabel: String,
  val statusText: String,
  val statusTimeRange: String?,
  val currentSubject: String,
  val currentColorHex: String?,
  val allPeriods: List<MergedPeriod>,
  val activePeriodNumber: Int?,
  val status: TimetableStatus,
  val isActiveAppearance: Boolean,
  val weeklyPeriods: List<WeekdayPeriods>,
)

object TimetableLogic {
  val weekdayLabels = listOf("월", "화", "수", "목", "금")

  fun currentEntry(context: Context): TimetableEntry {
    val now = Date()
    val today = WidgetPayload.startOfDay(now)
    val merged = mergePeriods(context, today)
    val status = status(
      at = now,
      periods = merged.periods,
      dayHasSubjects = merged.dayHasSubjects,
      hasTimetable = merged.hasTimetablePayload,
      hasPeriodSettings = merged.hasPeriodSettings,
    )
    return makeEntry(context, now, today, merged.periods, status)
  }

  data class MergeResult(
    val periods: List<MergedPeriod>,
    val hasPeriodSettings: Boolean,
    val hasTimetablePayload: Boolean,
    val dayHasSubjects: Boolean,
  )

  fun mergePeriods(context: Context, day: Date): MergeResult {
    val configs = WidgetPayload.parsePeriodSettings(WidgetStore.read(context, WidgetStore.PERIOD_KEY))
    val hasPeriodSettings = configs.isNotEmpty()
    val payload = WidgetPayload.parseTimetable(WidgetStore.read(context, WidgetStore.TIMETABLE_KEY))
    val hasTimetablePayload = payload != null && payload.empty != true
    val dayLabel = WidgetPayload.kstDayLabel(day)
    val dayData = payload?.week?.firstOrNull { it.dayLabel == dayLabel }
      ?: payload?.week?.firstOrNull { it.dayLabel == payload.todayDayLabel }
    val subjectsByPeriod = (dayData?.periods ?: emptyList()).associate { it.period to it.subject }
    val colorMap = WidgetColors.buildSubjectColorMap(payload?.week ?: emptyList())
    val dayHasSubjects = subjectsByPeriod.values.any { it.trim().isNotEmpty() }

    if (!hasPeriodSettings) {
      return MergeResult(emptyList(), false, hasTimetablePayload, dayHasSubjects)
    }
    val lastSubjectPeriod = subjectsByPeriod.keys.maxOrNull() ?: 0
    if (lastSubjectPeriod < 1) {
      return MergeResult(emptyList(), true, hasTimetablePayload, dayHasSubjects)
    }
    val configByNumber = configs.associateBy { it.periodNumber }
    val merged = mutableListOf<MergedPeriod>()
    for (n in 1..lastSubjectPeriod) {
      val subject = subjectsByPeriod[n] ?: ""
      val cfg = configByNumber[n]
      val start = cfg?.let { WidgetPayload.dateBySetting(it.startTime, day) }
      val end = cfg?.let { WidgetPayload.dateBySetting(it.endTime, day) }
      val valid = if (start != null && end != null && end.after(start)) Pair(start, end) else null
      merged.add(
        MergedPeriod(
          number = n,
          startTime = valid?.first,
          endTime = valid?.second,
          subjectName = subject,
          subjectColorHex = WidgetColors.colorHexForSubject(subject, colorMap),
        ),
      )
    }
    return MergeResult(merged, true, hasTimetablePayload, dayHasSubjects)
  }

  fun buildWeeklyPeriods(context: Context): List<WeekdayPeriods> {
    val configs = WidgetPayload.parsePeriodSettings(WidgetStore.read(context, WidgetStore.PERIOD_KEY))
    val payload = WidgetPayload.parseTimetable(WidgetStore.read(context, WidgetStore.TIMETABLE_KEY))
    val week = payload?.week ?: emptyList()
    val colorMap = WidgetColors.buildSubjectColorMap(week)
    val fromSettings = configs.maxOfOrNull { it.periodNumber } ?: 0
    val fromWeek = week.flatMap { it.periods.map { p -> p.period } }.maxOrNull() ?: 0
    val maxN = if (fromSettings > 0) fromSettings else fromWeek
    if (maxN < 1) {
      return weekdayLabels.map { WeekdayPeriods(it, emptyList()) }
    }
    return weekdayLabels.map { day ->
      val dayData = week.firstOrNull { it.dayLabel == day }
      val byPeriod = (dayData?.periods ?: emptyList()).associate { it.period to it.subject }
      val cells = (1..maxN).map { n ->
        val subject = (byPeriod[n] ?: "").trim()
        if (subject.isEmpty()) {
          null
        } else {
          WeekdayPeriodCell(
            subjectName = subject,
            subjectColorHex = WidgetColors.colorHexForSubject(subject, colorMap),
          )
        }
      }
      WeekdayPeriods(day, cells)
    }
  }

  fun status(
    at: Date,
    periods: List<MergedPeriod>,
    dayHasSubjects: Boolean,
    hasTimetable: Boolean,
    hasPeriodSettings: Boolean,
  ): TimetableStatus {
    if (!hasPeriodSettings) return TimetableStatus.NeedsPeriodSettings
    if (!hasTimetable) return TimetableStatus.NeedsTimetableData
    if (!dayHasSubjects) return TimetableStatus.NoClass
    val scheduled = periods.filter { it.hasSchedule }
    val first = scheduled.firstOrNull()
    val last = scheduled.lastOrNull()
    val firstStart = first?.startTime
    val lastEnd = last?.endTime
    if (first == null || last == null || firstStart == null || lastEnd == null) {
      return TimetableStatus.BeforeSchool
    }
    if (at.before(firstStart)) return TimetableStatus.BeforeSchool
    if (!at.before(lastEnd)) return TimetableStatus.AfterSchool
    scheduled.forEachIndexed { idx, p ->
      val start = p.startTime ?: return@forEachIndexed
      val end = p.endTime ?: return@forEachIndexed
      if (!at.before(start) && at.before(end)) {
        return TimetableStatus.InClass(p.number)
      }
      if (idx < scheduled.size - 1) {
        val nextStart = scheduled[idx + 1].startTime
        if (nextStart != null && !at.before(end) && at.before(nextStart)) {
          return TimetableStatus.BreakTime(p.number)
        }
      }
    }
    return TimetableStatus.AfterSchool
  }

  fun makeEntry(
    context: Context,
    date: Date,
    day: Date,
    periods: List<MergedPeriod>,
    status: TimetableStatus,
  ): TimetableEntry {
    val dayLabel = WidgetPayload.formatDayLabel(day)
    val weekly = buildWeeklyPeriods(context)
    return when (status) {
      TimetableStatus.NeedsPeriodSettings -> TimetableEntry(
        date, dayLabel, "설정 필요", null, "시간표 설정이 필요해요",
        null, periods, null, status, false, weekly,
      )
      TimetableStatus.NeedsTimetableData -> TimetableEntry(
        date, dayLabel, "확인 필요", null, "시간표를 확인해 주세요",
        null, periods, null, status, false, weekly,
      )
      TimetableStatus.NoClass -> TimetableEntry(
        date, dayLabel, "수업 없음", null, "오늘은 수업이 없습니다",
        null, emptyList(), null, status, false, weekly,
      )
      TimetableStatus.BeforeSchool -> {
        val first = periods.firstOrNull { it.subjectName.isNotEmpty() } ?: periods.firstOrNull()
        val subject = when {
          first != null && first.subjectName.isNotEmpty() -> first.subjectName
          first != null -> "${first.number}교시"
          else -> "1교시"
        }
        val range = if (first?.startTime != null && first.endTime != null) {
          WidgetPayload.formatTimeRange(first.startTime, first.endTime)
        } else null
        TimetableEntry(
          date, dayLabel, "수업시작 전", range, subject,
          first?.subjectColorHex, periods, null, status, false, weekly,
        )
      }
      TimetableStatus.AfterSchool -> TimetableEntry(
        date, dayLabel, "하교", null, "오늘 수업이 끝났습니다",
        null, emptyList(), null, status, false, weekly,
      )
      is TimetableStatus.InClass -> {
        val n = status.period
        val p = periods.firstOrNull { it.number == n }
        val subject = if (p != null && p.subjectName.isNotEmpty()) p.subjectName else "${n}교시"
        val range = if (p?.startTime != null && p.endTime != null) {
          WidgetPayload.formatTimeRange(p.startTime, p.endTime)
        } else null
        TimetableEntry(
          date, dayLabel, "${n}교시", range, subject,
          p?.subjectColorHex, periods, n, status, true, weekly,
        )
      }
      is TimetableStatus.BreakTime -> {
        val n = status.lastPeriod
        val p = periods.firstOrNull { it.number == n }
        val subject = if (p != null && p.subjectName.isNotEmpty()) p.subjectName else "${n}교시"
        val range = if (p?.startTime != null && p.endTime != null) {
          WidgetPayload.formatTimeRange(p.startTime, p.endTime)
        } else null
        TimetableEntry(
          date, dayLabel, "${n}교시", range, subject,
          null, periods, null, status, false, weekly,
        )
      }
    }
  }

  fun nextRefreshAt(context: Context): Long {
    val now = Date()
    val today = WidgetPayload.startOfDay(now)
    val merged = mergePeriods(context, today)
    val times = mutableListOf<Long>()
    merged.periods.forEach { p ->
      p.startTime?.time?.let { times.add(it) }
      p.endTime?.time?.let { times.add(it) }
    }
    val cal = WidgetPayload.kstCalendar()
    cal.time = today
    cal.add(Calendar.DAY_OF_YEAR, 1)
    times.add(cal.timeInMillis)
    return times.filter { it > now.time }.minOrNull() ?: (now.time + 30 * 60 * 1000L)
  }
}
