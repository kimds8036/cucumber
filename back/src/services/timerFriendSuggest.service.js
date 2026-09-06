import pool from '../config/database.js';
import { getBatchRedis } from './batchRedis.service.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

const MAX_SUGGESTIONS = 2;
const REDIS_TTL_SEC = 60 * 60 * 30; // 타이머 day 경계보다 넉넉히

function redisKey(userId, dayKey) {
  // v2: 같은학년 → 같은 학교급 우선 알고리즘
  return `timer:friend_suggest:v2:${userId}:${dayKey}`;
}

/** 중학교 / 고등학교 밴드 */
function schoolBandFromRow(row) {
  const bundle = `${row?.school_level || ''} ${row?.school_type || ''}`;
  if (/고등/.test(bundle)) return 'high';
  if (/중학/.test(bundle)) return 'middle';
  return null;
}

function bandSqlClause(band, alias = 's') {
  if (band === 'high') {
    return `(${alias}.school_level LIKE '%고등%' OR ${alias}.school_type LIKE '%고등%')`;
  }
  if (band === 'middle') {
    return `(${alias}.school_level LIKE '%중학%' OR ${alias}.school_type LIKE '%중학%')`;
  }
  return null;
}

async function loadStoredIds(userId, dayKey) {
  try {
    const redis = await getBatchRedis();
    const raw = await redis.get(redisKey(userId, dayKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    return null;
  }
}

async function saveStoredIds(userId, dayKey, ids) {
  try {
    const redis = await getBatchRedis();
    await redis.set(
      redisKey(userId, dayKey),
      JSON.stringify(ids.slice(0, MAX_SUGGESTIONS)),
      'EX',
      REDIS_TTL_SEC,
    );
  } catch (e) {
    console.warn('[timerFriendSuggest] redis save', e?.message || e);
  }
}

async function getMySuggestProfile(userId) {
  const [[row]] = await pool.execute(
    `SELECT u.school_id, u.grade, s.school_level, s.school_type
     FROM users u
     LEFT JOIN schools s ON s.school_id = u.school_id
     WHERE u.id = ? AND u.is_deleted = FALSE
     LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  return {
    schoolId: row.school_id || null,
    grade: row.grade != null ? Number(row.grade) : null,
    schoolBand: schoolBandFromRow(row),
  };
}

/**
 * 친구·요청·차단 이력이 없는 사용자 중 후보 선정
 * filters: { schoolId, grade, schoolBand, excludeIds }
 */
async function pickCandidateIds(userId, limit, filters = {}) {
  const take = clampSqlLimit(limit, { def: 1, min: 1, max: MAX_SUGGESTIONS });
  const exclude = (filters.excludeIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const excludeSql =
    exclude.length > 0
      ? `AND u.id NOT IN (${exclude.map(() => '?').join(',')})`
      : '';

  const params = [userId];
  const extraClauses = [];

  if (filters.schoolId) {
    extraClauses.push('AND u.school_id = ?');
    params.push(filters.schoolId);
  }
  if (filters.grade != null && Number.isFinite(Number(filters.grade))) {
    extraClauses.push('AND u.grade = ?');
    params.push(Number(filters.grade));
  }

  const needSchoolJoin = Boolean(filters.schoolBand);
  const bandClause = bandSqlClause(filters.schoolBand);
  if (bandClause) {
    extraClauses.push(`AND ${bandClause}`);
  }

  params.push(userId, userId, userId, userId);
  params.push(...exclude);

  const joinSql = needSchoolJoin
    ? 'LEFT JOIN schools s ON s.school_id = u.school_id'
    : '';

  const [rows] = await pool.execute(
    `SELECT u.id
     FROM users u
     ${joinSql}
     WHERE u.is_deleted = FALSE
       AND u.student_verified = TRUE
       AND u.id <> ?
       ${extraClauses.join('\n       ')}
       AND NOT EXISTS (
         SELECT 1 FROM user_friendships uf
         WHERE (uf.requester_id = ? AND uf.addressee_id = u.id)
            OR (uf.requester_id = u.id AND uf.addressee_id = ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks ub
         WHERE (ub.user_id = ? AND ub.blocked_user_id = u.id)
            OR (ub.user_id = u.id AND ub.blocked_user_id = ?)
       )
       ${excludeSql}
     ORDER BY RAND()
     LIMIT ${take}`,
    params,
  );
  return rows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
}

/** 1명: 같은 학년 → 같은 중/고 학교급. 없으면 [] */
async function pickPriorityId(userId, profile) {
  if (!profile) return [];

  if (profile.schoolId && profile.grade != null && Number.isFinite(profile.grade)) {
    const sameGrade = await pickCandidateIds(userId, 1, {
      schoolId: profile.schoolId,
      grade: profile.grade,
    });
    if (sameGrade.length) return sameGrade;
  }

  if (profile.schoolBand) {
    const sameBand = await pickCandidateIds(userId, 1, {
      schoolBand: profile.schoolBand,
    });
    if (sameBand.length) return sameBand;
  }

  return [];
}

async function ensureDailyIds(userId) {
  const dayKey = getTimerDayKey();
  let ids = await loadStoredIds(userId, dayKey);
  if (Array.isArray(ids) && ids.length > 0) {
    return { dayKey, ids };
  }

  const profile = await getMySuggestProfile(userId);
  const priority = await pickPriorityId(userId, profile);
  ids = [...priority];

  const remaining = MAX_SUGGESTIONS - ids.length;
  if (remaining > 0) {
    // 나머지(또는 우선순위 실패 시 둘 다) 랜덤
    const more = await pickCandidateIds(userId, remaining, {
      excludeIds: ids,
    });
    ids = [...ids, ...more].slice(0, MAX_SUGGESTIONS);
  }

  if (ids.length > 0) {
    await saveStoredIds(userId, dayKey, ids);
  }
  return { dayKey, ids };
}

async function hydrateEligibleSuggestions(userId, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT
       u.id,
       u.username,
       u.color_id,
       c.hex_code AS profile_color_hex,
       c.color_number AS profile_color_number
     FROM users u
     LEFT JOIN colors c ON c.id = u.color_id
     WHERE u.id IN (${placeholders})
       AND u.is_deleted = FALSE
       AND u.student_verified = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM user_friendships uf
         WHERE (uf.requester_id = ? AND uf.addressee_id = u.id)
            OR (uf.requester_id = u.id AND uf.addressee_id = ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks ub
         WHERE (ub.user_id = ? AND ub.blocked_user_id = u.id)
            OR (ub.user_id = u.id AND ub.blocked_user_id = ?)
       )`,
    [...ids, userId, userId, userId, userId],
  );

  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  return ids
    .map((id) => byId.get(Number(id)))
    .filter(Boolean)
    .map((r) => ({
      userId: Number(r.id),
      username: r.username ? `@${r.username}` : '',
      colorId: r.color_id,
      profileColor: {
        id: r.color_id,
        hexCode: r.profile_color_hex,
        colorNumber: r.profile_color_number,
      },
      isSuggestion: true,
    }));
}

/** 타이머 친구 바용 추천 — 하루 최대 2명, 같은 day_key 동안 고정 */
export async function listTimerFriendSuggestions(userId) {
  if (!userId) return [];
  const { ids } = await ensureDailyIds(userId);
  if (!ids.length) return [];
  return hydrateEligibleSuggestions(userId, ids);
}
