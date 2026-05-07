/**
 * 타이머 서버 저장/조회 유틸
 * - 하루 기준: 오전 6시 ~ 익일 05:59
 * - 로컬 캐시를 사용하지 않고 서버 API만 사용
 */
import { api } from './api';

const TIMER_TIMEZONE = 'Asia/Seoul';

function getKstDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
  };
}

function formatUtcDateAsYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 6시~익일 5시59분 기준 "오늘" 날짜 키 (YYYY-MM-DD) */
export function getTimerDayKey(date = new Date()) {
  const kst = getKstDateParts(date);
  const baseUtc = new Date(Date.UTC(kst.year, kst.month - 1, kst.day));
  if (kst.hour < 6) {
    baseUtc.setUTCDate(baseUtc.getUTCDate() - 1);
  }
  return formatUtcDateAsYmd(baseUtc);
}

/** 전날 날짜 키 (6~6 기준 하루 전) */
export function getPreviousDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(d.getHours() - 24);
  return getTimerDayKey(d);
}

/** 다음날 날짜 키 (6~6 기준 하루 후) */
export function getNextDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(d.getHours() + 24);
  return getTimerDayKey(d);
}

/** day_key 해당 타이머일 06:00 KST 시작점 (epoch ms) */
export function timerDayBoundaryMs(dayKeyStr) {
  const d = typeof dayKeyStr === 'string' ? dayKeyStr.trim().slice(0, 10) : '';
  if (!d) return NaN;
  return Date.parse(`${d}T06:00:00+09:00`);
}

const TIMER_LINE_END_SEC = 24 * 60 * 60;

/** API 또는 로컬 상태의 세션 배열을 startedAtMs/endedAtMs 로 통일 (contextDayKey = 해당 패널 day_key) */
export function normalizeSessionsArray(sessionsRaw, contextDayKey) {
  const anchor = timerDayBoundaryMs(contextDayKey);

  return (Array.isArray(sessionsRaw) ? sessionsRaw : []).map((s) => {
    let startedAtMs =
      s.startedAtMs != null && Number.isFinite(Number(s.startedAtMs))
        ? Number(s.startedAtMs)
        : s.startedAt != null && String(s.startedAt).trim() !== ''
          ? Date.parse(String(s.startedAt))
          : NaN;
    let endedAtMs =
      s.endedAtMs != null && s.endedAtMs !== ''
        ? Number(s.endedAtMs)
        : s.endedAt != null && String(s.endedAt).trim() !== ''
          ? Date.parse(String(s.endedAt))
          : null;

    let startSec = s.startSeconds != null ? Number(s.startSeconds) : null;
    let endSec = s.endSeconds != null ? Number(s.endSeconds) : null;

    if (!Number.isFinite(startedAtMs) && Number.isFinite(anchor)) {
      if (startSec == null && s.startMinutes != null) {
        startSec = Math.floor(Number(s.startMinutes) * 60);
        if (s.endMinutes != null) {
          endSec = Math.floor(Number(s.endMinutes) * 60);
        } else {
          endSec = null;
        }
      }
      if (startSec != null && Number.isFinite(anchor)) {
        startedAtMs = anchor + Math.floor(Number(startSec) || 0) * 1000;
        endedAtMs =
          endSec == null
            ? null
            : anchor + Math.floor(Number(endSec) || 0) * 1000;
      }
    }

    if (!Number.isFinite(startedAtMs)) {
      startedAtMs = Number.isFinite(anchor)
        ? anchor + (Number(startSec) || 0) * 1000
        : 0;
    }

    if (endSec != null && startSec != null && endSec < startSec) {
      endSec = TIMER_LINE_END_SEC;
    }
    if (
      endedAtMs != null &&
      Number.isFinite(endedAtMs) &&
      Number.isFinite(startedAtMs) &&
      endedAtMs < startedAtMs &&
      Number.isFinite(anchor)
    ) {
      endedAtMs = anchor + TIMER_LINE_END_SEC * 1000;
    }

    const open = endedAtMs == null || !Number.isFinite(endedAtMs);
    const endEffective = open ? null : endedAtMs;

    return {
      subjectId: s.subjectId != null ? Number(s.subjectId) : null,
      subjectName:
        s.subjectName != null ? String(s.subjectName).trim() : null,
      subjectColor:
        s.subjectColor != null ? String(s.subjectColor).trim() : null,
      startedAtMs,
      endedAtMs: endEffective,
    };
  });
}

function normalizeLoadedPayload(data, contextDayKey) {
  if (!data || typeof data !== 'object') return null;
  return {
    sessions: normalizeSessionsArray(data.sessions, contextDayKey),
    totalElapsedMs: typeof data.totalElapsedMs === 'number' ? data.totalElapsedMs : 0,
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
  };
}

export async function saveDayToDb(dayKey, payload, options = {}) {
  try {
    await api.post('/api/timer/day', {
      dayKey,
      sessions: payload.sessions ?? [],
      totalElapsedMs: payload.totalElapsedMs ?? 0,
      subjects: payload.subjects ?? [],
      tasks: payload.tasks ?? [],
    });
    return true;
  } catch (e) {
    console.error('[Timer] saveDayToDb 실패', e?.response?.data || e.message);
    return false;
  }
}

/**
 * 전날 및 그 이전 날짜 데이터는 DB에서 조회. 오늘은 로컬만 사용.
 * dayKey가 오늘보다 이전이면 DB, 오늘이면 null(로컬에서 로드), 미래면 로컬 시도.
 */
export async function loadDayFromDb(dayKey) {
  try {
    const res = await api.get('/api/timer/day', { params: { dayKey } });
    const data = res.data?.data;
    if (!data) return null;
    const normalized = normalizeLoadedPayload(data, dayKey);
    if (__DEV__) {
      console.log('[TimerTimetablePaint][loadDayFromDb]', {
        dayKey,
        success: res.data?.success,
        totalElapsedMs: normalized.totalElapsedMs,
        sessions: normalized.sessions,
        subjects: normalized.subjects,
      });
    }
    return normalized;
  } catch (e) {
    // 로그인되지 않은 상태(토큰 없음)에서 타이머 화면을 볼 때는
    // 인증 오류(401)는 자연스러운 상황이므로 조용히 무시한다.
    const status = e?.response?.status;
    if (status === 401) {
      return null;
    }
    console.error('[Timer] loadDayFromDb 실패', e?.response?.data || e.message);
    return null;
  }
}
