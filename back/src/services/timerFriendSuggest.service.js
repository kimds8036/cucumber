import pool from '../config/database.js';
import { getBatchRedis } from './batchRedis.service.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

const MAX_SUGGESTIONS = 2;
const REDIS_TTL_SEC = 60 * 60 * 30; // 타이머 day 경계보다 넉넉히

function redisKey(userId, dayKey) {
  return `timer:friend_suggest:v1:${userId}:${dayKey}`;
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

async function getMySchoolId(userId) {
  const [[row]] = await pool.execute(
    `SELECT school_id FROM users WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
    [userId],
  );
  return row?.school_id || null;
}

/**
 * 친구·요청·차단 이력이 없는 사용자 중 후보 선정 (같은 학교 우선)
 */
async function pickCandidateIds(userId, limit, { schoolId = null, excludeIds = [] } = {}) {
  const take = clampSqlLimit(limit, { def: 2, min: 1, max: MAX_SUGGESTIONS });
  const exclude = excludeIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const excludeSql =
    exclude.length > 0
      ? `AND u.id NOT IN (${exclude.map(() => '?').join(',')})`
      : '';

  const params = [userId];
  if (schoolId) params.push(schoolId);
  params.push(userId, userId, userId, userId);
  params.push(...exclude);

  const schoolClause = schoolId ? 'AND u.school_id = ?' : '';

  const [rows] = await pool.execute(
    `SELECT u.id
     FROM users u
     WHERE u.is_deleted = FALSE
       AND u.student_verified = TRUE
       AND u.id <> ?
       ${schoolClause}
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

async function ensureDailyIds(userId) {
  const dayKey = getTimerDayKey();
  let ids = await loadStoredIds(userId, dayKey);
  if (Array.isArray(ids) && ids.length > 0) {
    return { dayKey, ids };
  }

  const schoolId = await getMySchoolId(userId);
  ids = await pickCandidateIds(userId, MAX_SUGGESTIONS, { schoolId });
  if (ids.length < MAX_SUGGESTIONS) {
    const more = await pickCandidateIds(userId, MAX_SUGGESTIONS - ids.length, {
      schoolId: null,
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
       u.name_enc,
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
  // 저장된 일일 순서 유지 + 더 이상 추천 불가(친구/요청/차단)면 제외
  return ids
    .map((id) => byId.get(Number(id)))
    .filter(Boolean)
    .map((r) => ({
      userId: Number(r.id),
      name: r.name || r.username || '학생',
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
