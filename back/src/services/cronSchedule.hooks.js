import {
  JOB_KEYS,
  cancelReservationSafe,
  enqueueReservationSafe,
  personalMailScope,
  schoolStatsScope,
  timerGuardScope,
} from './batchReservation.service.js';
import { DEFAULT_PERSONAL_MAIL_RETURN_HOURS } from '../constants/personalMail.js';

const SCHOOL_DEBOUNCE_MS = Number(process.env.CRON_RESERVE_SCHOOL_DEBOUNCE_MS || 45_000);
const TIMER_DEBOUNCE_MS = Number(process.env.CRON_RESERVE_TIMER_DEBOUNCE_MS || 60_000);

function personalMailReturnHours() {
  const hours = parseInt(process.env.PERSONAL_MAIL_RETURN_HOURS || '', 10);
  if (Number.isFinite(hours) && hours > 0) return hours;
  const days = parseInt(process.env.PERSONAL_MAIL_RETURN_DAYS || '', 10);
  if (Number.isFinite(days) && days > 0) return days * 24;
  return DEFAULT_PERSONAL_MAIL_RETURN_HOURS;
}

/** 학교 학생/글/우편 수 변동 → school-stats 예약 */
export function scheduleSchoolStats(schoolId) {
  const id = String(schoolId || '').trim();
  if (!id) return;
  enqueueReservationSafe({
    jobKey: JOB_KEYS.SCHOOL_STATS,
    scopeKey: schoolStatsScope(id),
    debounceMs: Number.isFinite(SCHOOL_DEBOUNCE_MS) ? SCHOOL_DEBOUNCE_MS : 45_000,
    priority: 10,
  });
}

/** 개인우편 발송 → 반송 기한에 맞춰 예약 */
export function schedulePersonalMailReturn(mailId, { sentAt = null } = {}) {
  const id = Number(mailId);
  if (!Number.isFinite(id) || id <= 0) return;

  const hours = personalMailReturnHours();
  const base = sentAt ? new Date(sentAt) : new Date();
  const notBefore = new Date(base.getTime() + hours * 60 * 60 * 1000);

  enqueueReservationSafe({
    jobKey: JOB_KEYS.PERSONAL_MAIL_RETURN,
    scopeKey: personalMailScope(id),
    notBefore,
    priority: 8,
    payload: { mailId: id },
  });
}

/** 타이머 세션이 열려 있으면 가드 예약, 없으면 취소 */
export function scheduleTimerSessionGuard(userId, { hasOpenSession = true } = {}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return;
  const scope = timerGuardScope(uid);
  if (!hasOpenSession) {
    cancelReservationSafe(JOB_KEYS.TIMER_SESSION_GUARD, scope);
    return;
  }
  const staleMin = Number(process.env.CRON_TIMER_STALE_MINUTES || 60) || 60;
  enqueueReservationSafe({
    jobKey: JOB_KEYS.TIMER_SESSION_GUARD,
    scopeKey: scope,
    debounceMs: Number.isFinite(TIMER_DEBOUNCE_MS) ? TIMER_DEBOUNCE_MS : 60_000,
    notBefore: new Date(Date.now() + staleMin * 60 * 1000),
    priority: 6,
    payload: { userId: uid },
  });
}
