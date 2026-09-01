import pool from '../config/database.js';
import { maskKoreanName } from '../utils/maskKoreanName.js';
import { resolveUserName } from './userPii.service.js';

async function loadHonoreesByEntryIds(entryIds) {
  if (!entryIds.length) return new Map();
  const placeholders = entryIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT id, entry_id, user_id, display_name, school_name, sort_order
     FROM hall_of_fame_honorees
     WHERE entry_id IN (${placeholders})
     ORDER BY sort_order ASC, id ASC`,
    entryIds,
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.entry_id) || [];
    list.push({
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      schoolName: row.school_name,
      sortOrder: row.sort_order,
    });
    map.set(row.entry_id, list);
  }
  return map;
}

async function loadFeedbackIdsByEntryIds(entryIds) {
  if (!entryIds.length) return new Map();
  const placeholders = entryIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT entry_id, feedback_id
     FROM hall_of_fame_entry_feedback
     WHERE entry_id IN (${placeholders})`,
    entryIds,
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.entry_id) || [];
    list.push(row.feedback_id);
    map.set(row.entry_id, list);
  }
  return map;
}

export async function listPublishedHallOfFame() {
  const [entries] = await pool.execute(
    `SELECT id, summary, sort_order
     FROM hall_of_fame_entries
     WHERE is_published = TRUE
     ORDER BY sort_order DESC, id DESC`,
  );
  if (!entries.length) return [];

  const entryIds = entries.map((e) => e.id);
  const honoreeMap = await loadHonoreesByEntryIds(entryIds);

  return entries.map((entry) => ({
    id: entry.id,
    summary: entry.summary,
    honorees: (honoreeMap.get(entry.id) || []).map((h) => ({
      displayName: h.displayName,
      schoolName: h.schoolName,
    })),
  }));
}

export async function listAdminHallOfFame() {
  const [entries] = await pool.execute(
    `SELECT id, summary, sort_order, is_published, created_at, updated_at
     FROM hall_of_fame_entries
     ORDER BY sort_order DESC, id DESC`,
  );
  if (!entries.length) return [];

  const entryIds = entries.map((e) => e.id);
  const [honoreeMap, feedbackMap] = await Promise.all([
    loadHonoreesByEntryIds(entryIds),
    loadFeedbackIdsByEntryIds(entryIds),
  ]);

  return entries.map((entry) => ({
    id: entry.id,
    summary: entry.summary,
    sortOrder: entry.sort_order,
    isPublished: Boolean(entry.is_published),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    honorees: honoreeMap.get(entry.id) || [],
    feedbackIds: feedbackMap.get(entry.id) || [],
  }));
}

export async function getAdminHallOfFameEntry(entryId) {
  const [[entry]] = await pool.execute(
    `SELECT id, summary, sort_order, is_published, created_at, updated_at
     FROM hall_of_fame_entries WHERE id = ? LIMIT 1`,
    [entryId],
  );
  if (!entry) return null;

  const honoreeMap = await loadHonoreesByEntryIds([entry.id]);
  const feedbackMap = await loadFeedbackIdsByEntryIds([entry.id]);

  return {
    id: entry.id,
    summary: entry.summary,
    sortOrder: entry.sort_order,
    isPublished: Boolean(entry.is_published),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    honorees: honoreeMap.get(entry.id) || [],
    feedbackIds: feedbackMap.get(entry.id) || [],
  };
}

export async function resolveHonoreeFromUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id < 1) return null;
  const [[row]] = await pool.execute(
    `SELECT u.name_enc, s.name AS school_name
     FROM users u
     LEFT JOIN schools s ON s.school_id = u.school_id
     WHERE u.id = ? AND u.is_deleted = FALSE
     LIMIT 1`,
    [id],
  );
  if (!row) return null;
  const plainName = resolveUserName(row) || '';
  return {
    userId: id,
    displayName: maskKoreanName(plainName),
    schoolName: row.school_name || '—',
  };
}

async function normalizeHonorees(honorees = []) {
  const result = [];
  for (let i = 0; i < honorees.length; i += 1) {
    const raw = honorees[i] || {};
    let displayName = String(raw.displayName || '').trim();
    let schoolName = String(raw.schoolName || '').trim() || '—';
    const userId = raw.userId != null ? Number(raw.userId) : null;

    if (userId && (!displayName || displayName === '—')) {
      const resolved = await resolveHonoreeFromUser(userId);
      if (resolved) {
        displayName = resolved.displayName;
        if (!raw.schoolName) schoolName = resolved.schoolName;
      }
    }

    if (!displayName) continue;

    result.push({
      userId: Number.isFinite(userId) && userId > 0 ? userId : null,
      displayName: displayName.slice(0, 32),
      schoolName: schoolName.slice(0, 128),
      sortOrder: Number(raw.sortOrder) || i,
    });
  }
  return result;
}

async function replaceHonorees(connection, entryId, honorees) {
  await connection.execute(
    'DELETE FROM hall_of_fame_honorees WHERE entry_id = ?',
    [entryId],
  );
  for (const h of honorees) {
    await connection.execute(
      `INSERT INTO hall_of_fame_honorees
         (entry_id, user_id, display_name, school_name, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [entryId, h.userId, h.displayName, h.schoolName, h.sortOrder],
    );
  }
}

async function replaceFeedbackLinks(connection, entryId, feedbackIds = []) {
  await connection.execute(
    'DELETE FROM hall_of_fame_entry_feedback WHERE entry_id = ?',
    [entryId],
  );
  const unique = [...new Set(feedbackIds.map((id) => Number(id)).filter((id) => id > 0))];
  for (const feedbackId of unique) {
    await connection.execute(
      `INSERT INTO hall_of_fame_entry_feedback (entry_id, feedback_id)
       VALUES (?, ?)`,
      [entryId, feedbackId],
    );
  }
}

export async function createHallOfFameEntry(payload) {
  const summary = String(payload?.summary || '').trim();
  if (summary.length < 2) {
    return { error: '반영 내용 요약을 입력해 주세요.' };
  }

  const honorees = await normalizeHonorees(payload?.honorees || []);
  if (!honorees.length) {
    return { error: '등재자를 1명 이상 추가해 주세요.' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO hall_of_fame_entries (summary, sort_order, is_published)
       VALUES (?, ?, ?)`,
      [
        summary.slice(0, 500),
        Number(payload?.sortOrder) || 0,
        payload?.isPublished ? 1 : 0,
      ],
    );
    const entryId = result.insertId;
    await replaceHonorees(connection, entryId, honorees);
    await replaceFeedbackLinks(connection, entryId, payload?.feedbackIds || []);
    await connection.commit();
    return { id: entryId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateHallOfFameEntry(entryId, payload) {
  const id = Number(entryId);
  if (!Number.isFinite(id) || id < 1) return { error: '잘못된 ID입니다.' };

  const summary = String(payload?.summary || '').trim();
  if (summary.length < 2) {
    return { error: '반영 내용 요약을 입력해 주세요.' };
  }

  const honorees = await normalizeHonorees(payload?.honorees || []);
  if (!honorees.length) {
    return { error: '등재자를 1명 이상 추가해 주세요.' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [upd] = await connection.execute(
      `UPDATE hall_of_fame_entries
       SET summary = ?, sort_order = ?, is_published = ?
       WHERE id = ?`,
      [
        summary.slice(0, 500),
        Number(payload?.sortOrder) || 0,
        payload?.isPublished ? 1 : 0,
        id,
      ],
    );
    if (!upd.affectedRows) {
      await connection.rollback();
      return { error: '항목을 찾을 수 없습니다.' };
    }
    await replaceHonorees(connection, id, honorees);
    await replaceFeedbackLinks(connection, id, payload?.feedbackIds || []);
    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteHallOfFameEntry(entryId) {
  const id = Number(entryId);
  if (!Number.isFinite(id) || id < 1) return false;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'DELETE FROM hall_of_fame_entries WHERE id = ?',
      [id],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      return false;
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listDeveloperFeedbackForAdmin({ limit = 50, q = '' } = {}) {
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const trimmedQ = String(q || '').trim();
  let whereSql = '1=1';
  const params = [];

  if (trimmedQ) {
    if (/^#?\d+$/.test(trimmedQ)) {
      whereSql += ' AND df.id = ?';
      params.push(Number(trimmedQ.replace(/^#/, '')));
    } else if (/^@?\w+/.test(trimmedQ)) {
      whereSql += ' AND u.username LIKE ?';
      params.push(`%${trimmedQ.replace(/^@+/, '')}%`);
    } else {
      whereSql += ' AND df.content LIKE ?';
      params.push(`%${trimmedQ}%`);
    }
  }

  const [rows] = await pool.execute(
    `SELECT
       df.id,
       df.category,
       df.content,
       df.created_at,
       df.user_id,
       u.username,
       u.name_enc AS user_name_enc,
       s.name AS school_name,
       (SELECT GROUP_CONCAT(hef.entry_id)
        FROM hall_of_fame_entry_feedback hef
        WHERE hef.feedback_id = df.id) AS linked_entry_ids
     FROM developer_feedback df
     LEFT JOIN users u ON u.id = df.user_id
     LEFT JOIN schools s ON s.school_id = u.school_id
     WHERE ${whereSql}
     ORDER BY df.created_at DESC
     LIMIT ${limitNum}`,
    params,
  );

  return rows.map((row) => {
    const plainName = resolveUserName(row) || '';
    return {
      id: row.id,
      category: row.category,
      content: row.content,
      createdAt: row.created_at,
      userId: row.user_id,
      username: row.username,
      userName: plainName,
      maskedName: maskKoreanName(plainName),
      schoolName: row.school_name || '—',
      linkedEntryIds: String(row.linked_entry_ids || '')
        .split(',')
        .filter(Boolean)
        .map((v) => Number(v)),
    };
  });
}
