import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// PUT /api/timetable — 사용자 override 시간표를 통째로 받는다.
//   - timetable: { "월-1": "수학", ... } 형태의 평면 객체
//   - 키 개수와 값 길이 한도만 1차 게이트로 강제. 키 형식 검사는 별도 PR.
const TIMETABLE_MAX_KEYS = 200;
const TIMETABLE_VALUE_MAX = 50;
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
const baseCache = new Map();
const userOverrideCache = new Map();
const DAYS = ['월', '화', '수', '목', '금'];

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

function getSemester(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 8 ? 1 : 2;
}

function normalizeSchoolLevel(level, schoolType) {
  const l = String(level || '').trim();
  const t = String(schoolType || '').trim();
  if (l.includes('중') || t.includes('중')) return 'middle';
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
  return `${user.school_id}:${user.grade}:${user.class_number}:${schoolLevel}:${weekKey}`;
}

async function fetchBaseTimetableByUser(user) {
  const schoolLevel = normalizeSchoolLevel(user.school_level, user.school_type);
  const { fromYmd, toYmd, weekKey } = getWeekRange();
  const key = getCacheKey(user, schoolLevel, weekKey);
  const cached = baseCache.get(key);
  if (cached && Date.now() - cached.ts < BASE_TTL_MS) return cached.timetable;

  if (!NEIS_API_KEY || !user.edu_office_code || !user.admin_standard_code || !user.grade || !user.class_number) {
    return {};
  }

  const endpoint = schoolLevel === 'middle' ? NEIS_MIDDLE_URL : NEIS_HIGH_URL;
  const rootKey = schoolLevel === 'middle' ? 'misTimetable' : 'hisTimetable';
  const qs = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '1000',
    ATPT_OFCDC_SC_CODE: String(user.edu_office_code),
    SD_SCHUL_CODE: String(user.admin_standard_code),
    GRADE: String(user.grade),
    CLASS_NM: String(user.class_number),
    TI_FROM_YMD: fromYmd,
    TI_TO_YMD: toYmd,
    SEM: String(getSemester()),
  });

  const res = await fetch(`${endpoint}?${qs.toString()}`);
  const json = await res.json();
  const resultCode = json?.[rootKey]?.[0]?.head?.[1]?.RESULT?.CODE;
  if (resultCode && resultCode !== 'INFO-000') return {};
  const rows = json?.[rootKey]?.[1]?.row || [];
  const timetable = parseNeisRows(rows);
  baseCache.set(key, { ts: Date.now(), timetable });
  return timetable;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      `SELECT
         u.school_id,
         u.grade,
         u.class_number,
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
    const baseTimetable = await fetchBaseTimetableByUser(user);
    const override = userOverrideCache.get(userId) || {};
    const timetable = mergeTimetable(baseTimetable, override);
    return res.json({
      success: true,
      data: {
        timetable,
        source: {
          neis: Object.keys(baseTimetable).length > 0,
          override: Object.keys(override).length > 0,
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
    userOverrideCache.set(userId, timetable);

    return res.json({
      success: true,
      message: '시간표 수정사항이 저장되었습니다.',
      data: { timetable },
    });
  } catch (error) {
    console.error('시간표 저장 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시간표 저장 중 오류가 발생했습니다.',
    });
  }
});

export default router;

