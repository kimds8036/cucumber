import pool from '../config/database.js';
import { inspectBadgesForUser } from './badge.service.js';
import { resolveUserName } from './userPii.service.js';
import { getMergedTimetableForUserId } from '../routes/timetable.js';

const WEEKDAYS = ['월', '화', '수', '목', '금'];

function timetableToGrid(cells) {
  const map = cells && typeof cells === 'object' ? cells : {};
  let maxPeriod = 0;
  for (const key of Object.keys(map)) {
    const m = String(key).match(/^[월화수목금]-(\d+)$/);
    if (!m) continue;
    const p = Number(m[1]);
    if (p > maxPeriod) maxPeriod = p;
  }
  if (maxPeriod < 1) {
    return { days: WEEKDAYS, rows: [], cellCount: 0 };
  }
  const rows = [];
  for (let p = 1; p <= maxPeriod; p += 1) {
    rows.push({
      period: p,
      cells: WEEKDAYS.map((d) => {
        const v = map[`${d}-${p}`];
        return v == null ? '' : String(v);
      }),
    });
  }
  return {
    days: WEEKDAYS,
    rows,
    cellCount: Object.keys(map).length,
  };
}

export async function inspectOpsUser(queryRaw) {
  const q = String(queryRaw || '').trim().replace(/^@/, '');
  if (!q) {
    return { error: 'QUERY_REQUIRED', status: 400, message: '아이디 또는 사용자 번호를 입력하세요.' };
  }

  const numericId = /^\d+$/.test(q) ? Number(q) : null;
  let row = null;
  if (numericId) {
    const [[byId]] = await pool.execute(
      `SELECT
         u.id, u.username, u.name_enc, u.school_id, u.grade, u.class_number,
         sch.name AS school_name
       FROM users u
       LEFT JOIN schools sch ON sch.school_id = u.school_id
       WHERE u.id = ? AND u.is_deleted = FALSE
       LIMIT 1`,
      [numericId],
    );
    row = byId || null;
  }
  if (!row) {
    const [[byName]] = await pool.execute(
      `SELECT
         u.id, u.username, u.name_enc, u.school_id, u.grade, u.class_number,
         sch.name AS school_name
       FROM users u
       LEFT JOIN schools sch ON sch.school_id = u.school_id
       WHERE u.username = ? AND u.is_deleted = FALSE
       LIMIT 1`,
      [q],
    );
    row = byName || null;
  }
  if (!row) {
    return { error: 'NOT_FOUND', status: 404, message: '해당 사용자를 찾지 못했습니다.' };
  }

  const userId = row.id;
  const [badgePack, friendRow, counts, timetablePack] = await Promise.all([
    inspectBadgesForUser(userId),
    pool.execute(
      `SELECT COUNT(*) AS c
       FROM user_friendships
       WHERE status = 'accepted'
         AND (requester_id = ? OR addressee_id = ?)`,
      [userId, userId],
    ).then(([rows]) => rows[0]),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE user_id = ? AND is_deleted = FALSE) AS posts,
         (SELECT COUNT(*) FROM comments WHERE user_id = ? AND is_deleted = FALSE) AS comments`,
      [userId, userId],
    ).then(([rows]) => rows[0]),
    getMergedTimetableForUserId(userId),
  ]);

  const grid = timetableToGrid(timetablePack?.cells);
  const ownedCount = (badgePack.badges || []).filter((b) => b.owned).length;
  const lockedCount = (badgePack.badges || []).length - ownedCount;

  return {
    user: {
      id: userId,
      username: row.username,
      displayName: resolveUserName(row) || null,
      schoolName: row.school_name || null,
      grade: row.grade,
      classNumber: row.class_number,
    },
    stats: {
      friendCount: Number(friendRow?.c || 0),
      postCount: Number(counts?.posts || 0),
      commentCount: Number(counts?.comments || 0),
    },
    badges: {
      ownedCount,
      lockedCount,
      equippedBadgeKey: badgePack.equippedBadgeKey,
      items: badgePack.badges,
    },
    timetable: {
      ...grid,
      source: timetablePack?.source || { neis: false, override: false },
      overrideUpdatedAt: timetablePack?.overrideUpdatedAt || null,
    },
  };
}
