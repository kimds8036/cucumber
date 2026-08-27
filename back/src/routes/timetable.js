import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { detectTimetableAnomalies } from '../utils/timetableAnomaly.js';

const router = express.Router();

// PUT /api/timetable — 사용자 override 시간표를 통째로 받는다.
//   - timetable: { "월-1": "수학", ... } 형태의 평면 객체
//   - 키 개수와 값 길이 한도만 1차 게이트로 강제. 키 형식 검사는 별도 PR.
const TIMETABLE_MAX_KEYS = 200;
const TIMETABLE_VALUE_MAX = 50;
const PERIOD_MAX_COUNT = 12;
const HHMM_RE = /^\d{1,2}:\d{2}$/;
const updateTimetableValidators = [
  body('timetable').exists({ checkNull: true }).withMessage('유효한 시간표 데이터가 필요합니다.')
    .bail()
    .custom((v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) {
        throw new Error('timetable 은 객체여야 합니다.');
      }
      const keys = Object.keys(v);
      if (keys.length > TIMETABLE_MAX_KEYS) {
        throw new Error(`timetable 항목이 너무 많습니다. (≤ ${TIMETABLE_MAX_KEYS})`);
      }
      for (const k of keys) {
        const val = v[k];
        if (val == null) continue;
        if (typeof val !== 'string') {
          throw new Error('timetable 값은 문자열이어야 합니다.');
        }
        if (val.length > TIMETABLE_VALUE_MAX) {
          throw new Error(`timetable 값은 ${TIMETABLE_VALUE_MAX}자 이내여야 합니다.`);
        }
      }
      return true;
    }),
];
const NEIS_MIDDLE_URL = 'https://open.neis.go.kr/hub/misTimetable';
const NEIS_HIGH_URL = 'https://open.neis.go.kr/hub/hisTimetable';
const NEIS_API_KEY = process.env.NEIS_API_KEY || process.env.NEIS_KEY || '';
const BASE_TTL_MS = 24 * 60 * 60 * 1000;
/** 반 매칭·SEM 로직 변경 시 bump — 잘못된 NEIS 캐시 무효화 */
const TIMETABLE_CACHE_VERSION = 'v3';
const baseCache = new Map();
const DAYS = ['월', '화', '수', '목', '금'];

function parseJsonColumn(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadUserOverride(userId) {
  const [rows] = await pool.execute(
    'SELECT timetable_json, updated_at FROM user_timetable_overrides WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows.length) return { timetable: {}, updatedAt: null };
  const timetable = parseJsonColumn(rows[0].timetable_json);
  return {
    timetable:
      timetable && typeof timetable === 'object' && !Array.isArray(timetable)
        ? timetable
        : {},
    updatedAt: rows[0].updated_at,
  };
}

async function saveUserOverride(userId, timetable) {
  await pool.execute(
    `INSERT INTO user_timetable_overrides (user_id, timetable_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       timetable_json = VALUES(timetable_json),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(timetable)],
  );
}

async function loadUserPeriodTimes(userId) {
  const [rows] = await pool.execute(
    'SELECT periods_json, updated_at FROM user_period_time_settings WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows.length) return { periods: null, updatedAt: null };
  const periods = parseJsonColumn(rows[0].periods_json);
  return {
    periods: Array.isArray(periods) ? periods : null,
    updatedAt: rows[0].updated_at,
  };
}

async function saveUserPeriodTimes(userId, periods) {
  await pool.execute(
    `INSERT INTO user_period_time_settings (user_id, periods_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       periods_json = VALUES(periods_json),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(periods)],
  );
}

function validatePeriodTimesPayload(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return '교시를 하나 이상 추가해 주세요.';
  }
  if (periods.length > PERIOD_MAX_COUNT) {
    return `교시는 ${PERIOD_MAX_COUNT}개 이하여야 합니다.`;
  }
  const sorted = [...periods].sort(
    (a, b) => Number(a.periodNumber) - Number(b.periodNumber),
  );
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i];
    const num = Number(p.periodNumber);
    if (!Number.isFinite(num) || num < 1) {
      return '교시 번호가 올바르지 않습니다.';
    }
    if (!HHMM_RE.test(String(p.startTime || '')) || !HHMM_RE.test(String(p.endTime || ''))) {
      return `${num}교시 시각 형식이 올바르지 않습니다.`;
    }
    const [sh, sm] = String(p.startTime).split(':').map(Number);
    const [eh, em] = String(p.endTime).split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) {
      return `${num}교시 종료는 시작보다 늦어야 합니다.`;
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const [ph, pm] = String(prev.endTime).split(':').map(Number);
      const prevEnd = ph * 60 + pm;
      if (startMin < prevEnd) {
        return `${num}교시는 ${prev.periodNumber}교시 종료(${prev.endTime}) 이후부터 시작할 수 있습니다.`;
      }
    }
  }
  return null;
}

const updatePeriodTimesValidators = [
  body('periods')
    .exists({ checkNull: true })
    .withMessage('교시 시간 데이터가 필요합니다.')
    .bail()
    .isArray({ min: 1, max: PERIOD_MAX_COUNT })
    .withMessage(`periods는 1~${PERIOD_MAX_COUNT}개 배열이어야 합니다.`),
];

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getWeekRange(now = new Date()) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { fromYmd: toYmd(monday), toYmd: toYmd(friday), weekKey: toYmd(monday) };
}

/**
 * NEIS 시간표 허브: 중학 misTimetable / 고등 hisTimetable
 */
function normalizeSchoolLevel(level, schoolType, schoolName = '') {
  const l = String(level || '').trim();
  const t = String(schoolType || '').trim();
  const n = String(schoolName || '').trim();
  const bundle = `${l}\u0000${t}\u0000${n}`;

  if (/고등학교/.test(bundle) || /\b고등\b/.test(bundle)) return 'high';
  if (/중학교/.test(bundle)) return 'middle';

  if (l.includes('중') && !l.includes('고')) return 'middle';
  if (t.includes('중') && !t.includes('고')) return 'middle';
  if (n.includes('중학교')) return 'middle';

  return 'high';
}

function pickSubjectField(row) {
  const candidates = [row?.ITRT_CNTNT, row?.SUBJECT_NM, row?.content];
  for (const v of candidates) {
    const s = String(v || '').trim();
    if (s) return s;
  }
  return '';
}

/** NEIS CLASS_NM / users.class_number → 반 번호(정수 문자열). 파싱 불가 시 null. */
function parseHomeroomNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const banSuffix = s.match(/(\d+)\s*반\s*$/);
  if (banSuffix) {
    const n = Number.parseInt(banSuffix[1], 10);
    return Number.isFinite(n) ? String(n) : null;
  }

  if (/^\d+$/.test(s)) {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : null;
  }

  return null;
}

/** 미리보기 격자용: 반 번호 완전 일치만 허용 (빈 학급명·endsWith 매칭 없음). */
function classNmMatches(userClass, rowClassNm) {
  const userNum = parseHomeroomNumber(userClass);
  const rowNum = parseHomeroomNumber(rowClassNm);
  if (userNum == null || rowNum == null) return false;
  return userNum === rowNum;
}

/** 학년 전체 NEIS row 중 사용자 반에 맞는 row만 격자용으로 쓴다. 매칭 실패 시 빈 배열. */
function filterRowsForUserTimetable(rows = [], classNumber) {
  if (!rows.length) return [];
  if (classNumber == null || String(classNumber).trim() === '') return [];
  if (parseHomeroomNumber(classNumber) == null) return [];

  const withClass = rows.filter((r) => String(r?.CLASS_NM ?? '').trim());
  if (withClass.length === 0) return [];

  return withClass.filter((r) => classNmMatches(classNumber, r.CLASS_NM));
}

function parseNeisRows(rows = []) {
  const cells = {};
  rows.forEach((row) => {
    const period = Number(row?.PERIO);
    const subject = pickSubjectField(row);
    if (!Number.isFinite(period) || period < 1 || period > 9 || !subject) return;

    const ymd = String(row?.ALL_TI_YMD || '');
    if (!/^\d{8}$/.test(ymd)) return;
    const y = Number(ymd.slice(0, 4));
    const m = Number(ymd.slice(4, 6));
    const d = Number(ymd.slice(6, 8));
    const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
    if (!DAYS.includes(dayLabel)) return;
    cells[`${dayLabel}-${period}`] = subject;
  });
  return cells;
}

function extractSubjectsFromRows(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const subject = pickSubjectField(row);
    if (!subject) continue;
    const key = subject.trim().toLowerCase();
    if (!map.has(key)) map.set(key, subject.trim());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'ko'));
}

function mergeTimetable(base = {}, override = {}) {
  const merged = { ...base };
  Object.keys(override || {}).forEach((k) => {
    const v = override[k];
    if (v == null || String(v).trim() === '') delete merged[k];
    else merged[k] = v;
  });
  return merged;
}

function getCacheKey(user, schoolLevel, weekKey) {
  return `${user.school_id}:${user.grade}:${schoolLevel}:${weekKey}:${TIMETABLE_CACHE_VERSION}`;
}

function normalizeNeisRowArray(rowField) {
  if (!rowField) return [];
  return Array.isArray(rowField) ? rowField : [rowField];
}

async function fetchNeisRowsForUser(user, schoolLevel, fromYmd, toYmd, semester) {
  const endpoint = schoolLevel === 'middle' ? NEIS_MIDDLE_URL : NEIS_HIGH_URL;
  const rootKey = schoolLevel === 'middle' ? 'misTimetable' : 'hisTimetable';
  const pageSize = 1000;
  const allRows = [];

  for (let page = 1; page <= 20; page += 1) {
    const qs = new URLSearchParams({
      KEY: NEIS_API_KEY,
      Type: 'json',
      pIndex: String(page),
      pSize: String(pageSize),
      ATPT_OFCDC_SC_CODE: String(user.edu_office_code),
      SD_SCHUL_CODE: String(user.admin_standard_code),
      GRADE: String(user.grade),
      TI_FROM_YMD: fromYmd,
      TI_TO_YMD: toYmd,
      SEM: String(semester),
    });

    const res = await fetch(`${endpoint}?${qs.toString()}`);
    const json = await res.json();
    const resultCode = json?.[rootKey]?.[0]?.head?.[1]?.RESULT?.CODE;
    if (resultCode && resultCode !== 'INFO-000') break;
    const rows = normalizeNeisRowArray(json?.[rootKey]?.[1]?.row);
    if (!rows.length) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
  }

  return allRows;
}

async function fetchBaseTimetableByUser(user) {
  const schoolLevel = normalizeSchoolLevel(
    user.school_level,
    user.school_type,
    user.school_name,
  );
  const { fromYmd, toYmd, weekKey } = getWeekRange();
  const { resolveNeisSemester } = await import('../services/schoolSemester.service.js');
  const preferredSem = await resolveNeisSemester(user.school_id);
  const key = `${getCacheKey(user, schoolLevel, weekKey)}:sem${preferredSem}`;
  const cached = baseCache.get(key);
  if (cached && Date.now() - cached.ts < BASE_TTL_MS) {
    return { timetable: cached.timetable, subjects: cached.subjects || [] };
  }

  if (!NEIS_API_KEY || !user.edu_office_code || !user.admin_standard_code || !user.grade) {
    return { timetable: {}, subjects: [] };
  }

  const rootKey = schoolLevel === 'middle' ? 'misTimetable' : 'hisTimetable';

  if (process.env.TIMETABLE_DEBUG_NEIS === '1') {
    console.log('[NEIS timetable]', {
      schoolLevel,
      hub: rootKey,
      school_level: user.school_level,
      school_type: user.school_type,
      school_name: user.school_name,
      grade: user.grade,
      SEM: preferredSem,
      TI_FROM_YMD: fromYmd,
      TI_TO_YMD: toYmd,
      scope: 'school+grade (no CLASS_NM)',
    });
  }

  let rows = await fetchNeisRowsForUser(
    user,
    schoolLevel,
    fromYmd,
    toYmd,
    preferredSem,
  );
  // 선호 SEM이 비면 반대 학기 한 번 더 (개학 직전 SEM 어긋남 대비)
  if (!rows.length) {
    const otherSem = preferredSem === 1 ? 2 : 1;
    rows = await fetchNeisRowsForUser(user, schoolLevel, fromYmd, toYmd, otherSem);
  }
  const subjects = extractSubjectsFromRows(rows);
  const gridRows = filterRowsForUserTimetable(rows, user.class_number);
  const timetable = parseNeisRows(gridRows);
  const empty = Object.keys(timetable).length === 0 && subjects.length === 0;
  // 빈 결과는 ~15분만 캐시 (NEIS가 늦게 올라오는 경우 대비)
  const ts = empty ? Date.now() - (BASE_TTL_MS - 15 * 60 * 1000) : Date.now();
  baseCache.set(key, { ts, timetable, subjects });
  return { timetable, subjects };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      `SELECT
         u.school_id,
         u.grade,
         u.class_number,
         s.name AS school_name,
         s.school_level,
         s.school_type,
         s.edu_office_code,
         s.admin_standard_code
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    const user = rows[0];
    const { timetable: baseTimetable, subjects: baseSubjects } =
      await fetchBaseTimetableByUser(user);
    const { timetable: override } = await loadUserOverride(userId);
    const timetable = mergeTimetable(baseTimetable, override);
    const anomalies = detectTimetableAnomalies(timetable);
    return res.json({
      success: true,
      data: {
        timetable,
        subjects: baseSubjects,
        ...(anomalies.hasHolidayOrExam ? { anomalies } : {}),
        source: {
          neis: Object.keys(baseTimetable).length > 0 || baseSubjects.length > 0,
          override: Object.keys(override).length > 0,
          scope: 'school_grade',
        },
      },
    });
  } catch (error) {
    console.error('시간표 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시간표 조회 중 오류가 발생했습니다.',
    });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const saved = await loadUserOverride(userId);
    return res.json({
      success: true,
      data: {
        timetable: saved.timetable,
        updatedAt: saved.updatedAt
          ? new Date(saved.updatedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('저장 시간표 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '저장된 시간표 조회 중 오류가 발생했습니다.',
    });
  }
});

router.get('/period-times', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const saved = await loadUserPeriodTimes(userId);
    return res.json({
      success: true,
      data: {
        periods: saved.periods,
        updatedAt: saved.updatedAt
          ? new Date(saved.updatedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('교시 시간 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '교시 시간 조회 중 오류가 발생했습니다.',
    });
  }
});

router.put('/period-times', authenticate, validate(updatePeriodTimesValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { periods } = req.body;
    const validationError = validatePeriodTimesPayload(periods);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }
    const normalized = [...periods]
      .map((p) => ({
        periodNumber: Number(p.periodNumber),
        startTime: String(p.startTime),
        endTime: String(p.endTime),
      }))
      .sort((a, b) => a.periodNumber - b.periodNumber);
    await saveUserPeriodTimes(userId, normalized);
    const saved = await loadUserPeriodTimes(userId);
    return res.json({
      success: true,
      message: '교시 시간이 저장되었습니다.',
      data: {
        periods: saved.periods,
        updatedAt: saved.updatedAt
          ? new Date(saved.updatedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('교시 시간 저장 오류:', error);
    return res.status(500).json({
      success: false,
      message: '교시 시간 저장 중 오류가 발생했습니다.',
    });
  }
});

router.put('/', authenticate, validate(updateTimetableValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timetable } = req.body;

    if (!timetable || typeof timetable !== 'object') {
      return res.status(400).json({
        success: false,
        message: '유효한 시간표 데이터가 필요합니다.',
      });
    }
    await saveUserOverride(userId, timetable);
    const saved = await loadUserOverride(userId);

    return res.json({
      success: true,
      message: '시간표 수정사항이 저장되었습니다.',
      data: {
        timetable,
        updatedAt: saved.updatedAt
          ? new Date(saved.updatedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('시간표 저장 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시간표 저장 중 오류가 발생했습니다.',
    });
  }
});

/** 관리자 모니터링용 — 학생 앱 GET /timetable 과 동일 병합 결과 */
export async function getMergedTimetableForUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT
       u.school_id,
       u.grade,
       u.class_number,
       s.name AS school_name,
       s.school_level,
       s.school_type,
       s.edu_office_code,
       s.admin_standard_code
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.school_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows.length) return null;
  const user = rows[0];
  const { timetable: baseTimetable, subjects: baseSubjects } =
    await fetchBaseTimetableByUser(user);
  const { timetable: override, updatedAt } = await loadUserOverride(userId);
  const timetable = mergeTimetable(baseTimetable, override);
  return {
    cells: timetable,
    subjects: baseSubjects,
    source: {
      neis: Object.keys(baseTimetable).length > 0 || baseSubjects.length > 0,
      override: Object.keys(override).length > 0,
    },
    overrideUpdatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}

export default router;
