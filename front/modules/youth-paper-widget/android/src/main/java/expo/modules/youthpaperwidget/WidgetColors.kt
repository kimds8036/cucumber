package expo.modules.youthpaperwidget

import android.graphics.Color
import kotlin.math.abs

object WidgetColors {
  const val TEXT_PRIMARY = 0xFF272A26.toInt()
  const val TEXT_SECONDARY = 0x80272A26.toInt()
  const val MUTED = 0xFF888780.toInt()
  const val DIVIDER = 0xFFE6E6E6.toInt()
  const val PRIMARY = 0xFFA6DA95.toInt()
  const val PRIMARY_DARK = 0xFF6F9163.toInt()
  const val MORE = 0x4D272A26.toInt()
  const val WHITE = 0xFFFFFFFF.toInt()
  const val INACTIVE = 0x4D272A26.toInt()
  const val INACTIVE_35 = 0x59272A26.toInt()
  const val DOT_GRAY = 0xFFC5C5C0.toInt()
  const val INACTIVE_BG = 0x1A272A26.toInt()
  const val INACTIVE_STROKE = 0x4D272A26.toInt()
  const val DIVIDER_SOFT = 0x14272A26.toInt()
  const val TERM = 0x8C272A26.toInt()
  const val MEAL_BADGE_BG = 0x1AA6DA95.toInt()
  const val MEAL_BADGE_STROKE = 0x4DA6DA95.toInt()

  val SUBJECT_PALETTE = listOf(
    "FFE8E8", "FFF8DB", "E8F6E3", "E8F2FF", "F6EAFF",
    "FFD6D6", "FFEAC1", "CBEBC5", "CCE2FC", "EAD4FC",
  )

  fun parseHex(hex: String, alpha: Int = 255): Int {
    var cleaned = hex.trim().uppercase()
    if (cleaned.startsWith("#")) cleaned = cleaned.substring(1)
    if (cleaned.length != 6) return TEXT_PRIMARY
    val value = cleaned.toLong(16).toInt()
    val r = (value shr 16) and 0xFF
    val g = (value shr 8) and 0xFF
    val b = value and 0xFF
    return Color.argb(alpha, r, g, b)
  }

  fun withOpacity(hex: String, opacity: Double): Int {
    val a = (opacity * 255).toInt().coerceIn(0, 255)
    return parseHex(hex, a)
  }

  fun darkenedSubject(hex: String, factor: Double = 0.62): Int {
    var cleaned = hex.trim().uppercase()
    if (cleaned.startsWith("#")) cleaned = cleaned.substring(1)
    if (cleaned.length != 6) return TEXT_PRIMARY
    val value = cleaned.toLong(16).toInt()
    val r = (((value shr 16) and 0xFF) / 255.0 * factor).coerceAtMost(1.0)
    val g = (((value shr 8) and 0xFF) / 255.0 * factor).coerceAtMost(1.0)
    val b = ((value and 0xFF) / 255.0 * factor).coerceAtMost(1.0)
    return Color.rgb((r * 255).toInt(), (g * 255).toInt(), (b * 255).toInt())
  }

  private fun normalizeSubject(value: String) = value.trim().lowercase()

  private fun subjectColorIndex(subject: String): Int {
    val key = normalizeSubject(subject)
    if (key.isEmpty()) return 0
    var hash = 0
    for (ch in key) {
      hash = (hash * 31 + ch.code) % 2_147_483_647
    }
    return abs(hash) % SUBJECT_PALETTE.size
  }

  fun buildSubjectColorMap(week: List<TimetableDayLite>): Map<String, String> {
    val map = mutableMapOf<String, String>()
    val used = mutableSetOf<Int>()
    val subjects = week
      .flatMap { it.periods.map { p -> normalizeSubject(p.subject) } }
      .filter { it.isNotEmpty() }
      .toSet()
      .sorted()
    for (subject in subjects) {
      val base = subjectColorIndex(subject)
      var idx = base
      for (step in 0 until SUBJECT_PALETTE.size) {
        idx = (base + step) % SUBJECT_PALETTE.size
        if (!used.contains(idx)) break
      }
      used.add(idx)
      map[subject] = SUBJECT_PALETTE[idx]
    }
    return map
  }

  fun paletteIndex(hex: String?): Int {
    val cleaned = hex?.trim()?.uppercase()?.removePrefix("#") ?: return -1
    return SUBJECT_PALETTE.indexOf(cleaned)
  }

  fun cellDrawable(hex: String?): String {
    val idx = paletteIndex(hex)
    return if (idx >= 0) "widget_cell_p$idx" else "widget_cell_clear"
  }

  fun chipDrawable(hex: String?): String {
    val idx = paletteIndex(hex)
    return if (idx >= 0) "widget_chip_p$idx" else "widget_chip_clear"
  }

  fun badgeDrawable(hex: String?): String {
    val idx = paletteIndex(hex)
    return if (idx >= 0) "widget_badge_p$idx" else "widget_badge_default"
  }

  fun colorHexForSubject(subject: String, map: Map<String, String>): String? {
    val key = normalizeSubject(subject)
    if (key.isEmpty()) return null
    return map[key] ?: SUBJECT_PALETTE[subjectColorIndex(key)]
  }
}
