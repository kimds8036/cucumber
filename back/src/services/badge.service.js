import pool from '../config/database.js';
import {
  BADGE_BY_KEY,
  BADGE_CATALOG,
  INVITE_BADGE_THRESHOLD,
  serializeBadge,
} from '../constants/badges.js';

async function countSuccessfulInvites(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM user_invites WHERE inviter_id = ?`,
    [userId],
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

/** 타이머 세션이 있는 KST day_key 기준 최장 연속일 (오늘까지 이어진 스트릭) */
async function timerStreakDays(userId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT day_key AS d
     FROM study_sessions
     WHERE user_id = ? AND started_at IS NOT NULL
     ORDER BY day_key DESC
     LIMIT 60`,
    [userId],
  );
  const days = rows.map((r) => String(r.d).slice(0, 10)).filter(Boolean);
  if (!days.length) return 0;

  const set = new Set(days);
  const start = days[0];
  let streak = 0;
  let cursor = new Date(`${start}T12:00:00+09:00`);
  for (let i = 0; i < 60; i += 1) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getProgress(userId) {
  const [posts, invites, streak, attend] = await Promise.all([
    countUserPosts(userId),
    countSuccessfulInvites(userId),
    timerStreakDays(userId),
    countAttendanceDays(userId),
  ]);
  return {
    first_post: { current: posts, target: 1 },
    friends_invite_5: { current: invites, target: INVITE_BADGE_THRESHOLD },
    timer_streak_7: { current: streak, target: 7 },
    attend_100: { current: attend, target: 100 },
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
