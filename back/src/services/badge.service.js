import pool from '../config/database.js';
import {
  ATTEND_BADGE_THRESHOLD,
  BADGE_BY_KEY,
  BADGE_CATALOG,
  FRIENDS_BADGE_THRESHOLD,
  TIMER_DAYS_BADGE_TARGET,
  serializeBadge,
} from '../constants/badges.js';

async function countAcceptedFriends(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS c
     FROM user_friendships
     WHERE status = 'accepted'
       AND (requester_id = ? OR addressee_id = ?)`,
    [userId, userId],
  );
  return Number(row?.c || 0);
}

async function countUserPosts(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND is_deleted = FALSE`,
    [userId],
  );
  return Number(row?.c || 0);
}

async function countAttendanceDays(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(DISTINCT attendance_date) AS c
     FROM attendances WHERE user_id = ? AND status = 'present'`,
    [userId],
  );
  return Number(row?.c || 0);
}

/** 타이머 세션이 있는 day_key 일수 (연속 여부 무관, DATE→문자열은 DATE_FORMAT) */
async function timerActiveDays(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(DISTINCT DATE_FORMAT(day_key, '%Y-%m-%d')) AS c
     FROM study_sessions
     WHERE user_id = ? AND started_at IS NOT NULL`,
    [userId],
  );
  return Number(row?.c || 0);
}

export async function getProgress(userId) {
  const [posts, friends, timerDays, attend] = await Promise.all([
    countUserPosts(userId),
    countAcceptedFriends(userId),
    timerActiveDays(userId),
    countAttendanceDays(userId),
  ]);
  return {
    first_post: { current: posts, target: 1 },
    friends_invite_5: { current: friends, target: FRIENDS_BADGE_THRESHOLD },
    timer_streak_7: { current: timerDays, target: TIMER_DAYS_BADGE_TARGET },
    attend_100: { current: attend, target: ATTEND_BADGE_THRESHOLD },
  };
}

function shouldUnlock(key, progress) {
  const p = progress[key];
  if (!p) return false;
  return Number(p.current) >= Number(p.target);
}

export async function evaluateAndUnlockBadges(userId) {
  if (!userId) return [];
  const progress = await getProgress(userId);
  const unlocked = [];
  for (const def of BADGE_CATALOG) {
    if (!shouldUnlock(def.key, progress)) continue;
    const [result] = await pool.execute(
      `INSERT IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)`,
      [userId, def.key],
    );
    if (result.affectedRows > 0) unlocked.push(def.key);
  }
  return unlocked;
}

export async function inspectBadgesForUser(userId) {
  const [[user]] = await pool.execute(
    `SELECT equipped_badge_key FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const equipped = user?.equipped_badge_key || null;
  const [ownedRows] = await pool.execute(
    `SELECT badge_key FROM user_badges WHERE user_id = ?`,
    [userId],
  );
  const owned = new Set(ownedRows.map((r) => r.badge_key));
  const progress = await getProgress(userId);

  return {
    equippedBadgeKey: owned.has(equipped) ? equipped : null,
    badges: BADGE_CATALOG.map((def) =>
      serializeBadge(def, {
        owned: owned.has(def.key),
        equipped: equipped === def.key && owned.has(def.key),
        progress: progress[def.key] || null,
      }),
    ),
  };
}

export async function listBadgesForUser(userId) {
  await evaluateAndUnlockBadges(userId);
  return inspectBadgesForUser(userId);
}

export async function equipBadge(userId, badgeKey) {
  if (badgeKey == null || badgeKey === '' || badgeKey === 'none') {
    await pool.execute(
      `UPDATE users SET equipped_badge_key = NULL WHERE id = ?`,
      [userId],
    );
    return { equippedBadgeKey: null };
  }
  if (!BADGE_BY_KEY[badgeKey]) {
    return { error: 'INVALID_BADGE', status: 400, message: '알 수 없는 배지입니다.' };
  }
  await evaluateAndUnlockBadges(userId);
  const [[owned]] = await pool.execute(
    `SELECT badge_key FROM user_badges WHERE user_id = ? AND badge_key = ? LIMIT 1`,
    [userId, badgeKey],
  );
  if (!owned) {
    return {
      error: 'LOCKED',
      status: 403,
      message: '아직 잠금 해제되지 않은 배지입니다.',
    };
  }
  await pool.execute(
    `UPDATE users SET equipped_badge_key = ? WHERE id = ?`,
    [badgeKey, userId],
  );
  return { equippedBadgeKey: badgeKey };
}

export function publicBadgePayload(equippedBadgeKey) {
  const def = BADGE_BY_KEY[equippedBadgeKey];
  if (!def) return null;
  return {
    key: def.key,
    icon: def.icon,
    color: def.color,
    title: def.title,
  };
}
