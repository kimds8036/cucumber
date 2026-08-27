import { formatKstDateYmd, getKstNow } from './reverification.service.js';
import { academicYearOfYmd, toYmd } from '../utils/schoolDay.js';
import pool from '../config/database.js';

/** 1학기 개학은 항상 해당 학년도 3월 1일 */
export function semester1OpenYmd(academicYear) {
  return `${Number(academicYear)}-03-01`;
}

/**
 * 달력 폴백 SEM (school_terms 없을 때).
 * 3~7월 → 1, 8~2월 → 2 (8월은 NEIS에 2학기 표가 올라오는 시점이라 2 우선)
 */
export function calendarFallbackSemester(ymd) {
  const m = Number(String(ymd).slice(5, 7));
  if (m >= 3 && m <= 7) return 1;
  return 2;
}

/**
 * 학교별 NEIS 시간표 SEM.
 * school_terms 2학기 개학일이 있으면 그날부터 SEM=2, 그 전(3/1~)은 SEM=1.
 */
export async function resolveNeisSemester(schoolId, ref = new Date()) {
  const today = formatKstDateYmd(getKstNow(ref));
  if (!schoolId) return calendarFallbackSemester(today);

  const ay = academicYearOfYmd(today);
  try {
    const [[sem2]] = await pool.execute(
      `SELECT open_ymd, close_ymd
       FROM school_terms
       WHERE school_id = ? AND academic_year = ? AND semester = 2
       LIMIT 1`,
      [schoolId, ay],
    );
    if (sem2?.open_ymd) {
      const open = toYmd(sem2.open_ymd);
      if (open && today >= open) return 2;
      return 1;
    }

    const [[sem1]] = await pool.execute(
      `SELECT open_ymd, close_ymd
       FROM school_terms
       WHERE school_id = ? AND academic_year = ? AND semester = 1
       LIMIT 1`,
      [schoolId, ay],
    );
    if (sem1?.close_ymd) {
      const close = toYmd(sem1.close_ymd);
      if (close && today > close) return 2;
    }
  } catch (err) {
    console.warn('[semester] resolveNeisSemester', schoolId, err?.message || err);
  }

  return calendarFallbackSemester(today);
}
