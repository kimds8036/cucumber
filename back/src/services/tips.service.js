import pool from '../config/database.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    body: row.body,
    status: row.status,
    isPinned: Boolean(Number(row.is_pinned)),
    createdByAdminId: row.created_by_admin_id
      ? Number(row.created_by_admin_id)
      : null,
    updatedByAdminId: row.updated_by_admin_id
      ? Number(row.updated_by_admin_id)
      : null,
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : null,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
  };
}

function mapPublic(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    body: row.body,
  };
}

/** 앱: 활성 팁 + 고정(최대 1) */
export async function listActiveTipsForApp() {
  const [rows] = await pool.execute(
    `SELECT id, body, is_pinned
     FROM tips
     WHERE status = 'active'
     ORDER BY is_pinned DESC, id DESC`,
  );
  const pinnedRow = rows.find((r) => Number(r.is_pinned) === 1) || null;
  return {
    pinned: mapPublic(pinnedRow),
    items: rows.map(mapPublic),
  };
}

export async function listTipsForAdmin({
  status = null,
  limit = 100,
  offset = 0,
} = {}) {
  const lim = clampSqlLimit(limit, { def: 100, min: 1, max: 200 });
  const off = Math.max(0, Math.floor(Number(offset) || 0));
  const params = [];
  let where = '1=1';
  if (status === 'draft' || status === 'active') {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT id, body, status, is_pinned,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM tips
     WHERE ${where}
     ORDER BY is_pinned DESC, updated_at DESC, id DESC
     LIMIT ${lim} OFFSET ${off}`,
    params,
  );
  return rows.map(mapRow);
}

export async function getTipByIdForAdmin(id) {
  const tipId = Number(id);
  if (!Number.isFinite(tipId) || tipId < 1) return null;
  const [rows] = await pool.execute(
    `SELECT id, body, status, is_pinned,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM tips
     WHERE id = ?
     LIMIT 1`,
    [tipId],
  );
  return mapRow(rows[0]);
}

async function clearOtherPins(excludeId, conn) {
  const db = conn || pool;
  if (excludeId != null) {
    await db.execute(
      `UPDATE tips SET is_pinned = 0 WHERE is_pinned = 1 AND id <> ?`,
      [excludeId],
    );
  } else {
    await db.execute(`UPDATE tips SET is_pinned = 0 WHERE is_pinned = 1`);
  }
}

export async function createTip({
  body,
  status = 'draft',
  isPinned = false,
  adminUserId = null,
}) {
  const normalizedStatus = status === 'active' ? 'active' : 'draft';
  const wantPin = Boolean(isPinned) && normalizedStatus === 'active';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (wantPin) await clearOtherPins(null, conn);
    const [result] = await conn.execute(
      `INSERT INTO tips (body, status, is_pinned, created_by_admin_id, updated_by_admin_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(body || '').trim(),
        normalizedStatus,
        wantPin ? 1 : 0,
        adminUserId,
        adminUserId,
      ],
    );
    await conn.commit();
    return getTipByIdForAdmin(result.insertId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateTip(id, {
  body,
  status,
  isPinned,
  adminUserId = null,
} = {}) {
  const existing = await getTipByIdForAdmin(id);
  if (!existing) return null;

  const nextBody =
    body != null ? String(body).trim() : existing.body;
  const nextStatus =
    status === 'active' || status === 'draft' ? status : existing.status;
  let nextPinned =
    isPinned != null ? Boolean(isPinned) : existing.isPinned;
  // 초안은 고정 불가
  if (nextStatus !== 'active') nextPinned = false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (nextPinned) await clearOtherPins(existing.id, conn);
    await conn.execute(
      `UPDATE tips
       SET body = ?, status = ?, is_pinned = ?, updated_by_admin_id = ?
       WHERE id = ?`,
      [nextBody, nextStatus, nextPinned ? 1 : 0, adminUserId, existing.id],
    );
    await conn.commit();
    return getTipByIdForAdmin(existing.id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteTip(id) {
  const tipId = Number(id);
  if (!Number.isFinite(tipId) || tipId < 1) return false;
  const [result] = await pool.execute(`DELETE FROM tips WHERE id = ?`, [tipId]);
  return result.affectedRows > 0;
}
