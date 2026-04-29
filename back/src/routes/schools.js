import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getBatchRedis } from '../services/batchRedis.service.js';
import {
  buildSafeSchoolSearchTerm,
  buildSchoolSearchSql,
  schoolSearchParams,
} from '../utils/schoolSearch.js';

const router = express.Router();
const NEIS_BASE_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
const NEIS_API_KEY = process.env.NEIS_API_KEY || process.env.NEIS_KEY || '';
const DEFAULT_STUDY_GRASS_DAYS = 27 * 7;
const MAX_STUDY_GRASS_DAYS = 365;

const MEAL_CODES = ['1', '2', '3'];
const MEAL_CODE_TO_TYPE = {
  '1': 'breakfast',
  '2': 'lunch',
  '3': 'dinner',
};

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

const KST_TIMEZONE = 'Asia/Seoul';

const getKstParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
  };
};

const toKstYmd = (date = new Date()) => {
  const p = getKstParts(date);
  return `${String(p.year)}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
};

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseStudyGrassDaysParam = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_STUDY_GRASS_DAYS;
  return Math.min(Math.max(Math.floor(n), 1), MAX_STUDY_GRASS_DAYS);
};

async function fetchStudyGrassSeries({ schoolId, days }) {
  const redis = await getBatchRedis();
  const dateKeys = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    dateKeys.push(toDateKey(d));
  }

  const pipeline = redis.pipeline();
  dateKeys.forEach((dayKey) => {
    pipeline.hgetall(`study:grass:school:${schoolId}:${dayKey}`);
  });
  const rows = await pipeline.exec();

  const series = dateKeys.map((dayKey, idx) => {
    const row = rows?.[idx]?.[1];
    const hasData = row && Object.keys(row).length > 0;
    return {
      dayKey,
      totalElapsedMs: hasData ? Number(row.total_elapsed_ms || 0) : null,
      activeUserCount: hasData ? Number(row.active_user_count || 0) : null,
      hasData,
    };
  });

  return {
    schoolId,
    days,
    series,
  };
}

const mealPriorityAfterNow = (now) => {
  const h = getKstParts(now).hour;
  if (h < 10) return ['1', '2', '3'];
  if (h < 14) return ['2', '3', '1'];
  if (h < 20) return ['3', '1', '2'];
  return ['1', '2', '3'];
};

const cleanMenuText = (raw) =>
  String(raw || '')
    .replace(/\([^)]*\)/g, '')           // 괄호 제거
    .replace(/[＃#♯]/g, '')              // 샵류 제거
    .replace(/[·*＊✱✳✴]/g, ' ')         // 별표류 제거
    .replace(/[\\／/]/g, ' ')            // 백슬래시/슬래시류 제거
    .replace(/^[^\p{L}\p{N}가-힣]+/u, '') // 맨 앞 특수문자 제거
    .replace(/[^\p{L}\p{N}가-힣]+$/u, '') // 맨 뒤 특수문자 제거
    .replace(/\s+/g, ' ')
    .trim();

const parseNeisRows = (rows = []) => {
  const map = new Map();
  const availableCodes = new Set();
  rows.forEach((row) => {
    const ymd = String(row?.MLSV_YMD || '').trim();
    const code = String(row?.MMEAL_SC_CODE || '').trim();
    if (!ymd || !MEAL_CODES.includes(code)) return;
    const menus = String(row?.DDISH_NM || '')
      .split(/<br\s*\/?>/i)
      .map(cleanMenuText)
      .filter(Boolean);
    availableCodes.add(code);
    map.set(`${ymd}_${code}`, {
      ymd,
      mealCode: code,
      mealType: MEAL_CODE_TO_TYPE[code],
      menus,
      calories: String(row?.CAL_INFO || '').trim() || null,
    });
  });
  return { map, availableCodes };
};

const sortNextMeals = (meals, now, priorityNow) => {
  const todayYmd = toYmd(now);
  const todayRank = new Map(priorityNow.map((code, idx) => [code, idx]));
  const defaultRank = { '1': 0, '2': 1, '3': 2 };
  meals.sort((a, b) => {
    if (a.ymd !== b.ymd) return a.ymd.localeCompare(b.ymd);
    const rankA =
      a.ymd === todayYmd
        ? (todayRank.get(a.mealCode) ?? 99)
        : (defaultRank[a.mealCode] ?? 99);
    const rankB =
      b.ymd === todayYmd
        ? (todayRank.get(b.mealCode) ?? 99)
        : (defaultRank[b.mealCode] ?? 99);
    return rankA - rankB;
  });
  return meals;
};

const currentMealCodeByHour = (now) => {
  const h = getKstParts(now).hour;
  if (h < 10) return '1'; // 조식 시간대
  if (h < 14) return '2'; // 중식 시간대
  if (h < 20) return '3'; // 석식 시간대
  return null; // 오늘 급식 종료 후
};

const fetchNeisRows = async ({ eduOfficeCode, schoolCode, fromYmd, toYmd }) => {
  if (!NEIS_API_KEY) {
    throw new Error('NEIS_API_KEY가 설정되지 않았습니다.');
  }
  const params = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '1000',
    ATPT_OFCDC_SC_CODE: eduOfficeCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_FROM_YMD: fromYmd,
    MLSV_TO_YMD: toYmd,
  });
  const response = await fetch(`${NEIS_BASE_URL}?${params.toString()}`);
  const json = await response.json();
  const resultCode = json?.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT?.CODE;
  if (resultCode && resultCode !== 'INFO-000') {
    return [];
  }
  return json?.mealServiceDietInfo?.[1]?.row || [];
};

const getSchoolCodesById = async (schoolId) => {
  const [[row]] = await pool.execute(
    `SELECT school_id, edu_office_code, admin_standard_code
     FROM schools
     WHERE school_id = ?`,
    [schoolId],
  );
  return row || null;
};

const getMySchoolCodes = async (userId) => {
  const [[row]] = await pool.execute(
    `SELECT u.school_id, s.edu_office_code, s.admin_standard_code
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.school_id
     WHERE u.id = ?`,
    [userId],
  );
  return row || null;
};

/** schools.stats_updated_at 이 NULL일 때만 사용 (배치 미실행 등) */
async function fetchSchoolCountsLive(schoolId) {
  const [[userRow]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM users WHERE school_id = ? AND is_deleted = FALSE`,
    [schoolId],
  );
  const [[postRow]] = await pool.execute(
    `SELECT COUNT(*) AS c
     FROM posts
     WHERE board_type = 'school' AND school_id = ? AND is_deleted = FALSE`,
    [schoolId],
  );
  const [[mailRow]] = await pool.execute(
    `SELECT COUNT(*) AS c
     FROM school_mails
     WHERE school_id = ? AND is_deleted = FALSE`,
    [schoolId],
  );
  return {
    studentCount: Number(userRow?.c ?? 0),
    postCount: Number(postRow?.c ?? 0),
    mailCount: Number(mailRow?.c ?? 0),
  };
}

// GET /api/schools/search?query=xxx&limit=5
router.get('/search', async (req, res) => {
  try {
    const query = String(req.query?.query || '').trim();

    if (!query) {
      return res.json({ success: true, data: { schools: [] } });
    }

    const safe = buildSafeSchoolSearchTerm(query);
    if (!safe) {
      return res.json({ success: true, data: { schools: [] } });
    }

    const limitRaw = Number(req.query?.limit ?? 5);
    const [rows] = await pool.execute(
      buildSchoolSearchSql(limitRaw),
      schoolSearchParams(safe),
    );

    const schools = rows.map((s) => ({
      id: s.school_id,
      name: s.name,
      region: s.region || '',
    }));

    res.json({ success: true, data: { schools } });
  } catch (error) {
    console.error('학교 검색 오류:', error);
    res.status(500).json({ success: false, message: '학교 검색 중 오류가 발생했습니다.' });
  }
});

// 내 학교 정보 및 통계
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자 + 학교 기본 정보
    const [rows] = await pool.execute(
      `SELECT 
         u.school_id,
         s.name AS school_name,
         s.address,
         s.region,
         s.total_students,
         s.total_posts,
         s.total_school_mails,
         s.stats_updated_at,
         s.edu_office_code,
         s.admin_standard_code
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0 || !rows[0].school_id) {
      return res.status(404).json({
        success: false,
        message: '사용자의 학교 정보를 찾을 수 없습니다.',
      });
    }

    const schoolId = rows[0].school_id;

    let studentCount;
    let postCount;
    let mailCount;
    if (rows[0].stats_updated_at != null) {
      studentCount = Number(rows[0].total_students ?? 0);
      postCount = Number(rows[0].total_posts ?? 0);
      mailCount = Number(rows[0].total_school_mails ?? 0);
    } else {
      const live = await fetchSchoolCountsLive(schoolId);
      studentCount = live.studentCount;
      postCount = live.postCount;
      mailCount = live.mailCount;
    }

    res.json({
      success: true,
      data: {
        id: schoolId,
        name: rows[0].school_name,
        address: rows[0].address,
        region: rows[0].region,
        studentCount,
        postCount,
        mailCount,
        eduOfficeCode: rows[0].edu_office_code || '',
        adminStandardCode: rows[0].admin_standard_code || '',
      },
    });
  } catch (error) {
    console.error('내 학교 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 학교 정보 조회 중 오류가 발생했습니다.',
    });
  }
});

router.get('/me/study-grass', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const school = await getMySchoolCodes(userId);
    if (!school?.school_id) {
      return res.status(404).json({
        success: false,
        message: '사용자의 학교 정보를 찾을 수 없습니다.',
      });
    }
    const days = parseStudyGrassDaysParam(req.query?.days);
    const data = await fetchStudyGrassSeries({
      schoolId: school.school_id,
      days,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('내 학교 공부 잔디밭 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '내 학교 공부 잔디밭 조회 중 오류가 발생했습니다.',
    });
  }
});

router.get('/me/meals/next', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requested = Number(req.query?.count ?? 3);
    const count = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 10) : 3;
    const school = await getMySchoolCodes(userId);
    if (!school?.school_id) {
      return res.status(404).json({ success: false, message: '사용자의 학교 정보를 찾을 수 없습니다.' });
    }
    if (!school.edu_office_code || !school.admin_standard_code) {
      return res.json({ success: true, data: { schoolId: school.school_id, meals: [] } });
    }

    const today = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    const rows = await fetchNeisRows({
      eduOfficeCode: school.edu_office_code,
      schoolCode: school.admin_standard_code,
      fromYmd: toYmd(today),
      toYmd: toYmd(to),
    });
    const { map, availableCodes } = parseNeisRows(rows);
    const codes = MEAL_CODES.filter((c) => availableCodes.has(c));
    if (!codes.length) {
      return res.json({ success: true, data: { schoolId: school.school_id, meals: [] } });
    }

    const now = new Date();
    const priorityNow = mealPriorityAfterNow(now);
    const todayYmd = toKstYmd(now);
    const currentMealCode = currentMealCodeByHour(now);
    const meals = [];
    for (let d = 0; d <= 14 && meals.length < count; d += 1) {
      const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const ymd = toKstYmd(date);
      const order = d === 0 ? priorityNow : MEAL_CODES;
      for (const code of order) {
        if (!codes.includes(code)) continue;
        // 오늘은 이미 지난 끼니(조/중/석)를 제외한다.
        // 20시 이후(currentMealCode=null)는 오늘 급식을 모두 제외하고 다음 날짜부터 노출한다.
        if (ymd === todayYmd && !currentMealCode) continue;
        if (ymd === todayYmd && currentMealCode && Number(code) < Number(currentMealCode)) continue;
        const item = map.get(`${ymd}_${code}`);
        if (!item || !item.menus.length) continue;
        meals.push(item);
        if (meals.length >= count) break;
      }
    }
    sortNextMeals(meals, now, priorityNow);
    return res.json({ success: true, data: { schoolId: school.school_id, meals } });
  } catch (error) {
    console.error('내 학교 다음 급식 조회 오류:', error);
    return res.status(500).json({ success: false, message: '내 학교 급식 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/:schoolId/meals/next', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const requested = Number(req.query?.count ?? 3);
    const count = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 10) : 3;
    const school = await getSchoolCodesById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: '학교를 찾을 수 없습니다.' });
    }
    if (!school.edu_office_code || !school.admin_standard_code) {
      return res.json({ success: true, data: { schoolId, meals: [] } });
    }
    const today = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    const rows = await fetchNeisRows({
      eduOfficeCode: school.edu_office_code,
      schoolCode: school.admin_standard_code,
      fromYmd: toYmd(today),
      toYmd: toYmd(to),
    });
    const { map, availableCodes } = parseNeisRows(rows);
    const codes = MEAL_CODES.filter((c) => availableCodes.has(c));
    if (!codes.length) {
      return res.json({ success: true, data: { schoolId, meals: [] } });
    }
    const now = new Date();
    const priorityNow = mealPriorityAfterNow(now);
    const todayYmd = toKstYmd(now);
    const currentMealCode = currentMealCodeByHour(now);
    const meals = [];
    for (let d = 0; d <= 14 && meals.length < count; d += 1) {
      const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const ymd = toKstYmd(date);
      const order = d === 0 ? priorityNow : MEAL_CODES;
      for (const code of order) {
        if (!codes.includes(code)) continue;
        // 오늘은 이미 지난 끼니(조/중/석)를 제외한다.
        // 20시 이후(currentMealCode=null)는 오늘 급식을 모두 제외하고 다음 날짜부터 노출한다.
        if (ymd === todayYmd && !currentMealCode) continue;
        if (ymd === todayYmd && currentMealCode && Number(code) < Number(currentMealCode)) continue;
        const item = map.get(`${ymd}_${code}`);
        if (!item || !item.menus.length) continue;
        meals.push(item);
        if (meals.length >= count) break;
      }
    }
    sortNextMeals(meals, now, priorityNow);
    return res.json({ success: true, data: { schoolId, meals } });
  } catch (error) {
    console.error('학교 다음 급식 조회 오류:', error);
    return res.status(500).json({ success: false, message: '학교 급식 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/me/meals/calendar', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const fromYmd = String(req.query?.fromYmd || '').trim();
    const toYmdValue = String(req.query?.toYmd || '').trim();
    if (!/^\d{8}$/.test(fromYmd) || !/^\d{8}$/.test(toYmdValue)) {
      return res.status(400).json({ success: false, message: 'fromYmd/toYmd는 YYYYMMDD 형식이어야 합니다.' });
    }
    const school = await getMySchoolCodes(userId);
    if (!school?.school_id) {
      return res.status(404).json({ success: false, message: '사용자의 학교 정보를 찾을 수 없습니다.' });
    }
    if (!school.edu_office_code || !school.admin_standard_code) {
      return res.json({ success: true, data: { schoolId: school.school_id, mealsByDate: {} } });
    }
    const rows = await fetchNeisRows({
      eduOfficeCode: school.edu_office_code,
      schoolCode: school.admin_standard_code,
      fromYmd,
      toYmd: toYmdValue,
    });
    const mealsByDate = {};
    rows.forEach((row) => {
      const ymd = String(row?.MLSV_YMD || '').trim();
      const code = String(row?.MMEAL_SC_CODE || '').trim();
      if (!ymd || !MEAL_CODES.includes(code)) return;
      const type = MEAL_CODE_TO_TYPE[code];
      if (!mealsByDate[ymd]) mealsByDate[ymd] = { meals: {}, calories: {} };
      mealsByDate[ymd].meals[type] = String(row?.DDISH_NM || '')
        .split(/<br\s*\/?>/i)
        .map(cleanMenuText)
        .filter(Boolean);
      mealsByDate[ymd].calories[type] = String(row?.CAL_INFO || '').trim() || null;
    });
    return res.json({ success: true, data: { schoolId: school.school_id, mealsByDate } });
  } catch (error) {
    console.error('내 학교 급식 달력 조회 오류:', error);
    return res.status(500).json({ success: false, message: '급식 달력 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/:schoolId/meals/calendar', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const fromYmd = String(req.query?.fromYmd || '').trim();
    const toYmdValue = String(req.query?.toYmd || '').trim();
    if (!/^\d{8}$/.test(fromYmd) || !/^\d{8}$/.test(toYmdValue)) {
      return res.status(400).json({ success: false, message: 'fromYmd/toYmd는 YYYYMMDD 형식이어야 합니다.' });
    }
    const school = await getSchoolCodesById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: '학교를 찾을 수 없습니다.' });
    }
    if (!school.edu_office_code || !school.admin_standard_code) {
      return res.json({ success: true, data: { schoolId, mealsByDate: {} } });
    }
    const rows = await fetchNeisRows({
      eduOfficeCode: school.edu_office_code,
      schoolCode: school.admin_standard_code,
      fromYmd,
      toYmd: toYmdValue,
    });
    const mealsByDate = {};
    rows.forEach((row) => {
      const ymd = String(row?.MLSV_YMD || '').trim();
      const code = String(row?.MMEAL_SC_CODE || '').trim();
      if (!ymd || !MEAL_CODES.includes(code)) return;
      const type = MEAL_CODE_TO_TYPE[code];
      if (!mealsByDate[ymd]) mealsByDate[ymd] = { meals: {}, calories: {} };
      mealsByDate[ymd].meals[type] = String(row?.DDISH_NM || '')
        .split(/<br\s*\/?>/i)
        .map(cleanMenuText)
        .filter(Boolean);
      mealsByDate[ymd].calories[type] = String(row?.CAL_INFO || '').trim() || null;
    });
    return res.json({ success: true, data: { schoolId, mealsByDate } });
  } catch (error) {
    console.error('학교 급식 달력 조회 오류:', error);
    return res.status(500).json({ success: false, message: '급식 달력 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/:schoolId/study-grass', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const school = await getSchoolCodesById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: '학교를 찾을 수 없습니다.',
      });
    }
    const days = parseStudyGrassDaysParam(req.query?.days);
    const data = await fetchStudyGrassSeries({ schoolId, days });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('학교 공부 잔디밭 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학교 공부 잔디밭 조회 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/schools/:schoolId - 특정 학교 기본 정보 + 게시글/우편함 개수
// school_id 가 VARCHAR(50)이므로 숫자 변환 없이 문자열 그대로 사용
router.get('/:schoolId', async (req, res) => {
  const { schoolId } = req.params;

  try {
    const [[schoolRow]] = await pool.execute(
      `SELECT school_id, name, address,
              total_students, total_posts, total_school_mails, stats_updated_at,
              edu_office_code, admin_standard_code
       FROM schools
       WHERE school_id = ?`,
      [schoolId],
    );

    if (!schoolRow) {
      return res.status(404).json({
        success: false,
        message: '학교를 찾을 수 없습니다.',
      });
    }

    let studentCount;
    let postCount;
    let mailCount;
    if (schoolRow.stats_updated_at != null) {
      studentCount = Number(schoolRow.total_students ?? 0);
      postCount = Number(schoolRow.total_posts ?? 0);
      mailCount = Number(schoolRow.total_school_mails ?? 0);
    } else {
      const live = await fetchSchoolCountsLive(schoolId);
      studentCount = live.studentCount;
      postCount = live.postCount;
      mailCount = live.mailCount;
    }

    res.json({
      success: true,
      data: {
        schoolId: schoolRow.school_id,
        name: schoolRow.name,
        location: schoolRow.address || '',
        studentCount,
        postCount,
        mailCount,
        eduOfficeCode: schoolRow.edu_office_code || '',
        adminStandardCode: schoolRow.admin_standard_code || '',
      },
    });
  } catch (error) {
    console.error('학교 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '학교 정보 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;

