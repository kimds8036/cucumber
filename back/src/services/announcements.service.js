import pool from '../config/database.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    content: row.content,
    status: row.status,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
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

/** 앱: 게시된 공지만 */
export async function listPublishedAnnouncements({ limit = 50, offset = 0 } = {}) {
  const lim = clampSqlLimit(limit, { def: 50, min: 1, max: 100 });
  const off = Math.max(0, Math.floor(Number(offset) || 0));
  const [rows] = await pool.execute(
    `SELECT id, title, content, status, published_at,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM announcements
     WHERE status = 'published' AND published_at IS NOT NULL
     ORDER BY published_at DESC, id DESC
     LIMIT ${lim} OFFSET ${off}`,
  );
  return rows.map(mapRow);
}

export async function getPublishedAnnouncementById(id) {
  const announcementId = Number(id);
  if (!Number.isFinite(announcementId) || announcementId < 1) return null;
  const [rows] = await pool.execute(
    `SELECT id, title, content, status, published_at,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM announcements
     WHERE id = ? AND status = 'published' AND published_at IS NOT NULL
     LIMIT 1`,
    [announcementId],
  );
  return mapRow(rows[0]);
}

/** 관리자: 전체 목록 */
export async function listAnnouncementsForAdmin({
  status = null,
  limit = 50,
  offset = 0,
} = {}) {
  const lim = clampSqlLimit(limit, { def: 50, min: 1, max: 200 });
  const off = Math.max(0, Math.floor(Number(offset) || 0));
  const params = [];
  let where = '1=1';
  if (status === 'draft' || status === 'published') {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT id, title, content, status, published_at,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM announcements
     WHERE ${where}
     ORDER BY COALESCE(published_at, created_at) DESC, id DESC
     LIMIT ${lim} OFFSET ${off}`,
    params,
  );
  return rows.map(mapRow);
}

export async function getAnnouncementByIdForAdmin(id) {
  const announcementId = Number(id);
  if (!Number.isFinite(announcementId) || announcementId < 1) return null;
  const [rows] = await pool.execute(
    `SELECT id, title, content, status, published_at,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
     FROM announcements
     WHERE id = ?
     LIMIT 1`,
    [announcementId],
  );
  return mapRow(rows[0]);
}

export async function createAnnouncement({
  title,
  content,
  status = 'draft',
  adminUserId,
}) {
  const safeTitle = String(title || '').trim().slice(0, 200);
  const safeContent = String(content || '').trim();
  const nextStatus = status === 'published' ? 'published' : 'draft';
  if (!safeTitle || !safeContent) {
    throw Object.assign(new Error('제목과 내용을 입력해 주세요.'), { status: 400 });
  }

  const [result] = await pool.execute(
    `INSERT INTO announcements
       (title, content, status, published_at, created_by_admin_id, updated_by_admin_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      safeTitle,
      safeContent,
      nextStatus,
      nextStatus === 'published' ? new Date() : null,
      adminUserId || null,
      adminUserId || null,
    ],
  );
  return getAnnouncementByIdForAdmin(result.insertId);
}

export async function updateAnnouncement(id, {
  title,
  content,
  status,
  adminUserId,
}) {
  const existing = await getAnnouncementByIdForAdmin(id);
  if (!existing) return null;

  const safeTitle =
    title != null ? String(title).trim().slice(0, 200) : existing.title;
  const safeContent =
    content != null ? String(content).trim() : existing.content;
  if (!safeTitle || !safeContent) {
    throw Object.assign(new Error('제목과 내용을 입력해 주세요.'), { status: 400 });
  }

  let nextStatus = existing.status;
  if (status === 'draft' || status === 'published') {
    nextStatus = status;
  }

  const wasPublished = existing.status === 'published' && existing.publishedAt;
  const publishNow = nextStatus === 'published' && !wasPublished;
  const unpublish = nextStatus === 'draft';

  await pool.execute(
    `UPDATE announcements
     SET title = ?,
         content = ?,
         status = ?,
         published_at = CASE
           WHEN ? THEN NOW()
           WHEN ? THEN NULL
           ELSE published_at
         END,
         updated_by_admin_id = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      safeTitle,
      safeContent,
      nextStatus,
      publishNow ? 1 : 0,
      unpublish ? 1 : 0,
      adminUserId || null,
      existing.id,
    ],
  );

  return getAnnouncementByIdForAdmin(existing.id);
}

export async function deleteAnnouncement(id) {
  const announcementId = Number(id);
  if (!Number.isFinite(announcementId) || announcementId < 1) return false;
  const [result] = await pool.execute(
    `DELETE FROM announcements WHERE id = ?`,
    [announcementId],
  );
  return (result.affectedRows || 0) > 0;
}
