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

function normalizeLoadedPayload(data) {
  if (!data || typeof data !== 'object') return null;
  const sessions = Array.isArray(data.sessions)
    ? data.sessions.map((s) => {
        let startSec = s.startSeconds != null ? Number(s.startSeconds) : null;
        // endSeconds 가 없으면 "진행 중" 세션으로 간주해 null 유지
        let endSec = s.endSeconds != null ? Number(s.endSeconds) : null;

        // 옛날 포맷(startMinutes/endMinutes) 지원
        if (startSec == null && s.startMinutes != null) {
          startSec = Math.floor(Number(s.startMinutes) * 60);
          if (s.endMinutes != null) {
            endSec = Math.floor(Number(s.endMinutes) * 60);
          } else {
            // endMinutes 도 없으면 진행 중 세션이므로 endSec 은 그대로 null
            endSec = null;
          }
        }

        if (startSec == null) startSec = 0;

        return {
          subjectId: s.subjectId != null ? Number(s.subjectId) : null,
          subjectName:
            s.subjectName != null ? String(s.subjectName).trim() : null,
          subjectColor:
            s.subjectColor != null ? String(s.subjectColor).trim() : null,
          startSeconds: startSec,
          endSeconds: endSec,
        };
      })
    : [];
  return {
    sessions,
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
    if (__DEV__) {
      console.log('[Timer] saveDayToDb 성공', dayKey);
    }
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
    return normalizeLoadedPayload(data);
  } catch (e) {
    // 로그인되지 않은 상태(토큰 없음)에서 타이머 화면을 볼 때는
    // 인증 오류(401)는 자연스러운 상황이므로 조용히 무시한다.
    const status = e?.response?.status;
    if (status === 401) {
      if (__DEV__) {
        console.log(
          '[Timer] loadDayFromDb: 인증 토큰 없음으로 인해 서버 기록을 불러오지 않습니다.',
        );
      }
      return null;
    }
    console.error('[Timer] loadDayFromDb 실패', e?.response?.data || e.message);
    return null;
  }
}
