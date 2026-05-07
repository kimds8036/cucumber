import { getTimerDayKey, getNextTimerDayKeyYmd } from './timerDayKey.js';

/** day_key 타임머일의 시작(해당 일 06:00 KST)을 UTC epoch ms 로 */
export function timerDayAnchorUtcMs(dayKeyStr) {
  const s =
    typeof dayKeyStr === 'string' ? String(dayKeyStr).trim().slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  return Date.parse(`${s}T06:00:00+09:00`);
}

export function getTimerDayKeyFromUtcMs(ms) {
  if (!Number.isFinite(ms)) return '';
  return getTimerDayKey(new Date(ms));
}

/** API/저장소용 숫자 ms 또는 ISO 파싱 */
export function parseClientInstant(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.trunc(value);
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

/** DB 바인드용 문자열(KST 표기 wall clock) DATETIME(3) */
export function utcMsToKstMysqlDatetime3(ms) {
  if (!Number.isFinite(ms)) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(ms));
    const p = (t) =>
      parts.find((x) => x.type === t)?.value ??
      (t === 'fractionalSecond' ? undefined : '00');
    const y = p('year');
    const mo = p('month');
    const da = p('day');
    const h = p('hour');
    const mi = p('minute');
    const sec = p('second');
    const frac = p('fractionalSecond') ?? '000';
    return `${y}-${mo}-${da} ${h}:${mi}:${sec}.${frac.padEnd(3, '0')}`;
  } catch {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(ms));
    const p = (t) =>
      parts.find((x) => x.type === t)?.value ?? '00';
    return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')}:${p('second')}.000`;
  }
}

export function isoFromMysqlKstNaiveString(dtStr) {
  if (dtStr == null || dtStr === '') return null;
  const t = String(dtStr).trim().replace(' ', 'T');
  if (!t) return null;
  return `${t}+09:00`;
}

/** legacy: POST 바디 기준 타이머일 + 초 → 절대 ms */
export function legacySecondsRangeToUtcMs(dayKeyPrimary, startSec, endSec) {
  const anchor = timerDayAnchorUtcMs(dayKeyPrimary);
  if (!Number.isFinite(anchor)) return { startMs: NaN, endMs: NaN };
  const s0 = anchor + Math.floor(Number(startSec) || 0) * 1000;
  const e0 =
    endSec == null
      ? null
      : anchor + Math.floor(Number(endSec) || 0) * 1000;
  return { startMs: s0, endMs: e0 };
}

/** 레거시 초 구간이 역전으로 들어온 경우(같은 타이머일 조상 anchor 기준) 두 절대 구간으로 쪼갠다. */
export function expandLegacyInvertedIntervalSessions(
  normalizedList,
  postDayKey,
) {
  const out = [];
  for (const s of normalizedList) {
    const startedAtMs = s.startedAtMs;
    const endedAtMs = s.endedAtMs;
    if (
      endedAtMs != null &&
      Number.isFinite(startedAtMs) &&
      endedAtMs < startedAtMs
    ) {
      const primaryDk =
        (typeof postDayKey === 'string' ? postDayKey.trim().slice(0, 10) : '') ||
        getTimerDayKeyFromUtcMs(startedAtMs);
      const anchor0 = timerDayAnchorUtcMs(primaryDk);
      const nextAnchor = anchor0 + 86400_000;
      const rawEndSec = Math.floor((endedAtMs - anchor0) / 1000);
      const safeEndSec = Math.min(86400, Math.max(0, rawEndSec));
      const nextDk = getNextTimerDayKeyYmd(primaryDk);
      out.push({
        ...s,
        id: null,
        startedAtMs,
        endedAtMs: nextAnchor,
      });
      if (nextDk) {
        out.push({
          ...s,
          id: null,
          startedAtMs: nextAnchor,
          endedAtMs: nextAnchor + safeEndSec * 1000,
        });
      }
      continue;
    }
    out.push(s);
  }
  return out;
}

/** 닫힌 구간 또는 진행중: 항상 endMs>=startMs 이거나 진행중(null). */
export function flattenSessionsForTimerIntervals(sanitizedSessionsList) {
  const rows = [];
  for (const s of sanitizedSessionsList) {
    const { startedAtMs, endedAtMs, id } = s;
    if (!Number.isFinite(startedAtMs)) continue;

    if (endedAtMs == null) {
      rows.push({
        targetDayKey: getTimerDayKeyFromUtcMs(startedAtMs),
        session: { ...s },
      });
      continue;
    }

    /** 닫힌 구간: 타이머일 경계별로 행 분할 — 동일 원본 세션이 여러 행일 때 서버 업데이트 id 충돌 방지 */
    const clips = [];
    let cursorMs = startedAtMs;
    const endClamp = endedAtMs;
    while (cursorMs < endClamp) {
      const dkHere = getTimerDayKeyFromUtcMs(cursorMs);
      const anchorHere = timerDayAnchorUtcMs(dkHere);
      if (!Number.isFinite(anchorHere)) break;
      const nextExclusiveMs = anchorHere + 86400_000;
      const segStart = Math.max(cursorMs, anchorHere);
      const segEnd = Math.min(endClamp, nextExclusiveMs);
      if (!(segEnd > segStart)) break;
      clips.push({ dk: dkHere, start: segStart, end: segEnd });
      cursorMs = segEnd;
    }
    const preserveIdOnFirst = clips.length <= 1;
    clips.forEach((c, idx) => {
      rows.push({
        targetDayKey: c.dk,
        session: {
          ...s,
          id: preserveIdOnFirst && idx === 0 ? id : null,
          startedAtMs: c.start,
          endedAtMs: c.end,
        },
      });
    });
  }
  return rows;
}
