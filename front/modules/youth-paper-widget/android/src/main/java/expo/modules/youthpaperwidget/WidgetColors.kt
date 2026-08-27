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

  /** 인앱 `TIMETABLE_SUBJECT_COLORS` 와 동일 */
  val SUBJECT_PALETTE = listOf(
    "FFBCBC", // 레드
    "FFEEA8", // 옐로우
    "AEEEB9", // 그린
    "A1ECE2", // 틸
    "B5BEFB", // 바이올렛
    "E3C8FE", // 퍼플
    "D5B88F", // 브라운
    "B9C0CB", // 슬레이트
    "F2EDE4", // 아이보리 (공란 흰색과 구분)
    "FFCB91", // 오렌지
    "F28FC9", // 핑크
    "7EC8F0", // 하늘
    "7C8EF2", // 인디고
  )

  /** 공란과 헷갈리는 연한 과목색 */
  const val SUBJECT_PALE = "F2EDE4"

  /** 4x2(미디엄) — 흰 배경에서 잘 안 보이는 연한색 제외 */
  val SUBJECT_PALETTE_NO_WHITE = SUBJECT_PALETTE.filter { it != SUBJECT_PALE }

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

  /** 파스텔 과목색을 점용으로 채도↑·명도↓ */
  fun subjectDot(hex: String): Int {
    val cleaned = hex.trim().uppercase().removePrefix("#")
    if (cleaned == SUBJECT_PALE || cleaned == "FFFFFF") return DOT_GRAY
    val hsv = FloatArray(3)
    Color.colorToHSV(parseHex(hex), hsv)
    hsv[1] = (hsv[1] * 1.55f + 0.22f).coerceAtMost(0.82f)
    hsv[2] = (hsv[2] * 0.62f).coerceIn(0.48f, 0.78f)
    return Color.HSVToColor(hsv)
  }

  private fun normalizeSubject(value: String) = value.trim().lowercase()

  private fun subjectColorIndex(subject: String, paletteSize: Int): Int {
    val key = normalizeSubject(subject)
    if (key.isEmpty() || paletteSize <= 0) return 0
    var hash = 0
    for (ch in key) {
      hash = (hash * 31 + ch.code) % 2_147_483_647
    }
    return abs(hash) % paletteSize
  }

  fun buildSubjectColorMap(
    week: List<TimetableDayLite>,
    excludeWhite: Boolean = false,
  ): Map<String, String> {
    val palette = if (excludeWhite) SUBJECT_PALETTE_NO_WHITE else SUBJECT_PALETTE
    val map = mutableMapOf<String, String>()
    val used = mutableSetOf<Int>()
    val subjects = week
      .flatMap { it.periods.map { p -> normalizeSubject(p.subject) } }
      .filter { it.isNotEmpty() }
      .toSet()
      .sorted()
    for (subject in subjects) {
      val base = subjectColorIndex(subject, palette.size)
      var idx = base
      for (step in 0 until palette.size) {
        idx = (base + step) % palette.size
        if (!used.contains(idx)) break
      }
      used.add(idx)
      map[subject] = palette[idx]
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

  fun colorHexForSubject(
    subject: String,
    map: Map<String, String>,
    excludeWhite: Boolean = false,
  ): String? {
    val key = normalizeSubject(subject)
    if (key.isEmpty()) return null
    map[key]?.let { return it }
    val palette = if (excludeWhite) SUBJECT_PALETTE_NO_WHITE else SUBJECT_PALETTE
    if (palette.isEmpty()) return null
    return palette[subjectColorIndex(key, palette.size)]
  }
}
