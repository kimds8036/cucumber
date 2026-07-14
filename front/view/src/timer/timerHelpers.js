/**
 * 타이머 순수 함수·상수 — TimerContent / TimerLiveViews / useTimerDay 공유
 */
import {
  getTimerDayKey,
  normalizeSessionsArray,
  timerDayBoundaryMs,
} from '../../../utils/timerStorage';

export const DEFAULT_SUBJECTS = [];
export const DEFAULT_TASKS = [];

/** 레이아웃 위치 확인용 — 확인 끝나면 false 로 변경 */
export const DEBUG_TIMER_LAYOUT_BORDERS = false;
export const tdb = (color) =>
  DEBUG_TIMER_LAYOUT_BORDERS ? { borderWidth: 1, borderColor: color } : null;

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const TIMETABLE_GRAY = '#A6DA95';
export const TIMER_DAY_START_HOUR = 6;
export const TIMER_HEARTBEAT_MS = 60 * 1000;
export const TIMER_BACKGROUND_AUTO_CLOSE_MS = 15 * 60 * 1000;
export const TIMER_RECOVER_OPEN_SESSION_MAX_SECONDS = 60 * 60;
export const TIMER_RUNNING_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
export const TIMER_TIMEZONE = 'Asia/Seoul';
export const TIMER_SECONDS_PER_DAY = 24 * 60 * 60;
export const TIMER_DAY_END_SECONDS = 24 * 60 * 60;

export function getKstDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

export const getMinutesFromSixAM = (d) => {
  const kst = getKstDateParts(d);
  const secFromSix =
    (kst.hour * 3600 +
      kst.minute * 60 +
      kst.second -
      TIMER_DAY_START_HOUR * 3600 +
      TIMER_SECONDS_PER_DAY) %
    TIMER_SECONDS_PER_DAY;
  return Math.floor(secFromSix / 60);
};

export const getSecondsFromSixAM = (d) => {
  const kst = getKstDateParts(d);
  return (
    (kst.hour * 3600 +
      kst.minute * 60 +
      kst.second -
      TIMER_DAY_START_HOUR * 3600 +
      TIMER_SECONDS_PER_DAY) %
    TIMER_SECONDS_PER_DAY
  );
};

export function normalizeClockSeconds(
  value,
  fallback = null,
  { allowDayEnd = false } = {},
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n >= 1e12) return getSecondsFromSixAM(new Date(n));
  if (n >= 1e9) return getSecondsFromSixAM(new Date(n * 1000));
  const max = allowDayEnd ? TIMER_DAY_END_SECONDS : TIMER_SECONDS_PER_DAY - 1;
  if (n < 0) {
    return fallback != null ? fallback : getSecondsFromSixAM(new Date());
  }
  if (n > max) return max;
  return Math.floor(n);
}

export function toTimerDayTimelineSeconds(rawSeconds) {
  return normalizeClockSeconds(rawSeconds, 0);
}

export function toTimerDayEndAwareSeconds(rawSeconds) {
  return normalizeClockSeconds(rawSeconds, TIMER_DAY_END_SECONDS, {
    allowDayEnd: true,
  });
}

export function sessionToDerivedTimelineSeconds(session, viewingDayKey) {
  const a = timerDayBoundaryMs(viewingDayKey);
  if (!Number.isFinite(a) || session?.startedAtMs == null) return null;
  const ss = Number(session.startedAtMs);
  if (!Number.isFinite(ss)) return null;
  const dayLenMs = TIMER_SECONDS_PER_DAY * 1000;
  const b = a + dayLenMs;

  const open =
    session.endedAtMs == null || !Number.isFinite(Number(session.endedAtMs));

  if (open) {
    const vs = Math.max(ss, a);
    if (vs >= b) return null;
    return {
      ...session,
      startSeconds: Math.floor((vs - a) / 1000),
      endSeconds: null,
    };
  }

  const ee = Number(session.endedAtMs);
  const vs = Math.max(ss, a);
  const ve = Math.min(ee, b);
  if (!(ve > vs)) return null;

  let endFloor = Math.floor((ve - a) / 1000);
  if (endFloor > TIMER_DAY_END_SECONDS) endFloor = TIMER_DAY_END_SECONDS;
  return {
    ...session,
    startSeconds: Math.floor((vs - a) / 1000),
    endSeconds: endFloor,
  };
}

export function getOpenSession(sessions) {
  if (!Array.isArray(sessions)) return null;
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (sessions[i]?.endedAtMs == null) return sessions[i];
  }
  return null;
}

export function getOpenSessionStartedAtMs(sessions) {
  const open = getOpenSession(sessions);
  const ms = Number(open?.startedAtMs);
  return Number.isFinite(ms) ? ms : null;
}

export function getSessionDurationMs(session, nowSecRaw = null) {
  if (
    session?.startedAtMs != null &&
    Number.isFinite(Number(session.startedAtMs))
  ) {
    const start = Number(session.startedAtMs);
    const end =
      session?.endedAtMs != null && Number.isFinite(Number(session.endedAtMs))
        ? Number(session.endedAtMs)
        : Date.now();
    return Math.max(0, end - start);
  }
  const start = toTimerDayTimelineSeconds(session?.startSeconds);
  const endRaw = session?.endSeconds != null ? session.endSeconds : nowSecRaw;
  const end =
    session?.endSeconds != null
      ? toTimerDayEndAwareSeconds(endRaw)
      : toTimerDayTimelineSeconds(endRaw);
  const adjustedEnd = end < start ? end + 86400 : end;
  return Math.max(0, adjustedEnd - start) * 1000;
}

export function resolveSessionColor(session, subjects = []) {
  const linkedColor =
    session?.subjectId != null
      ? subjects.find((x) => x.id === session.subjectId)?.color
      : null;
  return linkedColor || session?.subjectColor || TIMETABLE_GRAY;
}

export function pushSlotSegmentForRange(
  segments,
  session,
  displaySubjects,
  slotStart,
  slotEnd,
  rangeStart,
  rangeEnd,
) {
  if (rangeEnd <= slotStart || rangeStart >= slotEnd) return;
  const overlapStart = Math.max(rangeStart, slotStart);
  const overlapEnd = Math.min(rangeEnd, slotEnd);
  const widthFraction = (overlapEnd - overlapStart) / 600;
  if (widthFraction <= 0) return;
  const color = resolveSessionColor(session, displaySubjects);
  if (!color) return;
  segments.push({
    color,
    widthFraction,
    startFraction: (overlapStart - slotStart) / 600,
  });
}

export function appendSessionSegmentsForSlot(
  segments,
  session,
  slotStart,
  slotEnd,
  nowSec,
  displaySubjects,
) {
  const startSec = toTimerDayTimelineSeconds(session?.startSeconds);
  const endSecRaw = session?.endSeconds != null ? session.endSeconds : nowSec;
  const closed = session?.endSeconds != null;
  const endSec = closed
    ? toTimerDayEndAwareSeconds(endSecRaw)
    : toTimerDayTimelineSeconds(endSecRaw);

  if (closed) {
    if (endSec < startSec) {
      pushSlotSegmentForRange(
        segments,
        session,
        displaySubjects,
        slotStart,
        slotEnd,
        startSec,
        TIMER_SECONDS_PER_DAY,
      );
      pushSlotSegmentForRange(
        segments,
        session,
        displaySubjects,
        slotStart,
        slotEnd,
        0,
        endSec,
      );
      return;
    }
    pushSlotSegmentForRange(
      segments,
      session,
      displaySubjects,
      slotStart,
      slotEnd,
      startSec,
      endSec,
    );
    return;
  }
  if (endSec < startSec) {
    pushSlotSegmentForRange(
      segments,
      session,
      displaySubjects,
      slotStart,
      slotEnd,
      startSec,
      TIMER_SECONDS_PER_DAY,
    );
    pushSlotSegmentForRange(
      segments,
      session,
      displaySubjects,
      slotStart,
      slotEnd,
      0,
      endSec,
    );
  } else {
    pushSlotSegmentForRange(
      segments,
      session,
      displaySubjects,
      slotStart,
      slotEnd,
      startSec,
      endSec,
    );
  }
}

export function injectSubjectSnapshotsIntoSessions(sessions = [], subjects = []) {
  const subjectMetaMap = new Map(
    (subjects || [])
      .filter((s) => s?.id != null)
      .map((s) => [
        Number(s.id),
        { name: s?.name || null, color: s?.color || null },
      ]),
  );
  return (sessions || []).map((session) => {
    const subjectMeta =
      session?.subjectId != null
        ? subjectMetaMap.get(Number(session.subjectId))
        : null;
    return {
      ...session,
      subjectName: session?.subjectName ?? subjectMeta?.name ?? null,
      subjectColor: session?.subjectColor ?? subjectMeta?.color ?? null,
    };
  });
}

export function buildSnapshotCompleteSessions(
  sessions = [],
  subjects = [],
  persistDayKey = null,
) {
  const subjectMetaMap = new Map(
    (subjects || [])
      .filter((s) => s?.id != null)
      .map((s) => [
        Number(s.id),
        { name: s?.name || null, color: s?.color || null },
      ]),
  );
  return (sessions || []).map((session) => {
    const subjectMeta =
      session?.subjectId != null
        ? subjectMetaMap.get(Number(session.subjectId))
        : null;
    const sm =
      session?.startedAtMs != null &&
      Number.isFinite(Number(session.startedAtMs))
        ? Number(session.startedAtMs)
        : null;
    const em =
      session?.endedAtMs != null && Number.isFinite(Number(session.endedAtMs))
        ? Number(session.endedAtMs)
        : null;

    let startedIso;
    let endedIso = null;
    if (sm != null) {
      startedIso = new Date(sm).toISOString();
      endedIso = em == null ? null : new Date(em).toISOString();
    } else {
      const dk =
        (typeof persistDayKey === 'string' && persistDayKey.trim()) ||
        getTimerDayKey(new Date());
      const anchor = timerDayBoundaryMs(dk);
      const s0 = normalizeClockSeconds(session?.startSeconds, 0);
      const e0 =
        session?.endSeconds == null
          ? null
          : normalizeClockSeconds(session?.endSeconds, null, {
              allowDayEnd: true,
            });
      const startMsSynth = anchor + s0 * 1000;
      startedIso = new Date(startMsSynth).toISOString();
      endedIso = e0 == null ? null : new Date(anchor + e0 * 1000).toISOString();
    }

    return {
      subjectId: session?.subjectId != null ? Number(session.subjectId) : null,
      subjectName: session?.subjectName ?? subjectMeta?.name ?? null,
      subjectColor: session?.subjectColor ?? subjectMeta?.color ?? null,
      startedAt: startedIso,
      endedAt: endedIso,
    };
  });
}

export function dateFromDayKey(dayKey) {
  return new Date(dayKey + 'T06:00:00');
}

export function formatHMS(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function lightenHex(hex, amount = 0.85) {
  if (!hex) return '#F7F7F7';
  const clean = String(hex).replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#F7F7F7';

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const mix = (v) => Math.round(v + (255 - v) * amount);
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function normalizeDayPayload(data, dayKeyForSessions) {
  const dk =
    typeof dayKeyForSessions === 'string' && dayKeyForSessions.trim() !== ''
      ? dayKeyForSessions.trim().slice(0, 10)
      : getTimerDayKey(new Date());

  const sessions = normalizeSessionsArray(data?.sessions ?? [], dk);

  return {
    sessions,
    totalElapsedMs: Number(data?.totalElapsedMs) || 0,
    subjects: Array.isArray(data?.subjects) ? data.subjects : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
  };
}

export function getPayloadSignature(payload) {
  return JSON.stringify({
    sessions: payload?.sessions ?? [],
    totalElapsedMs: Number(payload?.totalElapsedMs) || 0,
    subjects: payload?.subjects ?? [],
    tasks: payload?.tasks ?? [],
  });
}

export function getPersistPayloadSignature(snapshot) {
  const dayKey =
    snapshot?.timerDayKey != null
      ? String(snapshot.timerDayKey).slice(0, 10)
      : getTimerDayKey(new Date());
  const sessionsPayload = buildSnapshotCompleteSessions(
    snapshot?.sessions ?? [],
    snapshot?.subjects ?? [],
    dayKey,
  );
  return getPayloadSignature({
    sessions: sessionsPayload,
    totalElapsedMs: Number(snapshot?.totalElapsedMs) || 0,
    subjects: snapshot?.subjects ?? [],
    tasks: snapshot?.tasks ?? [],
  });
}
