import pool from '../config/database.js';
import { maskKoreanName } from '../utils/maskKoreanName.js';
import { resolveUserName } from './userPii.service.js';

const PUBLIC_STATUSES = ['none', 'fixed', 'planned', 'declined'];

export function normalizeAdminResponseStatus(raw) {
  const s = String(raw || 'none').trim();
  return PUBLIC_STATUSES.includes(s) ? s : 'none';
}

export function formatHonoreeDisplay(primaryHonoreeName, reporterCount) {
  const masked = maskKoreanName(primaryHonoreeName || '익명');
  const count = Math.max(1, Number(reporterCount) || 1);
  if (count <= 1) return masked;
  return `${masked} 외 ${count - 1}명`;
}

function mapPublicGroupRow(row) {
  const reporterCount = Number(row.reporter_count) || 1;
  return {
    id: row.id,
    category: row.category,
    content: row.content,
    honoreeDisplay: formatHonoreeDisplay(row.primary_honoree_name, reporterCount),
    reporterCount,
    adminResponse: row.admin_response || '',
    adminResponseStatus: row.admin_response_status || 'none',
    adminRespondedAt: row.admin_responded_at,
    createdAt: row.created_at,
  };
}

export async function listPublicDeveloperFeedback({ page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const [rows] = await pool.execute(
    `SELECT
       g.id,
       g.category,
       g.content,
       g.admin_response,
       g.admin_response_status,
       g.admin_responded_at,
       g.created_at,
       COUNT(df.id) AS reporter_count,
       (
         SELECT df2.honoree_name
         FROM developer_feedback df2
         WHERE df2.group_id = g.id
         ORDER BY df2.created_at ASC, df2.id ASC
         LIMIT 1
       ) AS primary_honoree_name
     FROM developer_feedback_groups g
     INNER JOIN developer_feedback df ON df.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC
     LIMIT ${limitNum} OFFSET ${offset}`,
  );

  return rows.map(mapPublicGroupRow);
}

export async function createDeveloperFeedbackSubmission(payload) {
  const category = String(payload?.category || 'other').trim() || 'other';
  const honoreeName = String(payload?.honoreeName || '').trim().slice(0, 10);
  const schoolPublic = Boolean(payload?.schoolPublic);
  const content = String(payload?.content || '').trim().slice(0, 50);
  const appVersion = String(payload?.appVersion || '').trim().slice(0, 24) || null;
  const deviceInfo = String(payload?.deviceInfo || '').trim().slice(0, 255) || null;
  const userId = payload?.userId ?? null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [groupResult] = await connection.execute(
      `INSERT INTO developer_feedback_groups (category, content)
       VALUES (?, ?)`,
      [category, content],
    );
    const groupId = groupResult.insertId;

    const [feedbackResult] = await connection.execute(
      `INSERT INTO developer_feedback
         (group_id, user_id, category, content, honoree_name, school_public, app_version, device_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        userId,
        category,
        content,
        honoreeName,
        schoolPublic ? 1 : 0,
        appVersion,
        deviceInfo,
      ],
    );

    await connection.commit();
    return { groupId, feedbackId: feedbackResult.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateDeveloperFeedbackGroupResponse(groupId, payload) {
  const id = Number(groupId);
  if (!Number.isFinite(id) || id < 1) return { error: '잘못된 ID입니다.' };

  const status = normalizeAdminResponseStatus(payload?.adminResponseStatus);
  const responseText = String(payload?.adminResponse || '').trim().slice(0, 500);
  const hasResponse = status !== 'none' || responseText.length > 0;

  const [result] = await pool.execute(
    `UPDATE developer_feedback_groups
     SET admin_response = ?,
         admin_response_status = ?,
         admin_responded_at = ?
     WHERE id = ?`,
    [
      responseText || null,
      status,
      hasResponse ? new Date() : null,
      id,
    ],
  );

  if (!result.affectedRows) return { error: '제보 묶음을 찾을 수 없습니다.' };
  return { id };
}

export async function mergeDeveloperFeedbackByIds(feedbackIds) {
  const ids = [...new Set(
    (Array.isArray(feedbackIds) ? feedbackIds : [])
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0),
  )];

  if (ids.length < 2) {
    return { error: '2건 이상 선택해 주세요.' };
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT id, group_id, category, content, created_at
     FROM developer_feedback
     WHERE id IN (${placeholders})
     ORDER BY created_at ASC, id ASC`,
    ids,
  );

  if (rows.length !== ids.length) {
    return { error: '선택한 제보 중 일부를 찾을 수 없습니다.' };
  }

  const primary = rows[0];
  const targetGroupId = primary.group_id;
  const orphanGroupIds = [...new Set(
    rows.map((row) => row.group_id).filter((gid) => gid !== targetGroupId),
  )];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE developer_feedback
       SET group_id = ?
       WHERE id IN (${placeholders})`,
      [targetGroupId, ...ids],
    );

    await connection.execute(
      `UPDATE developer_feedback_groups
       SET category = ?,
           content = LEFT(?, 500)
       WHERE id = ?`,
      [primary.category, primary.content, targetGroupId],
    );

    for (const orphanId of orphanGroupIds) {
      await connection.execute(
        `DELETE FROM developer_feedback_groups
         WHERE id = ?
           AND NOT EXISTS (
             SELECT 1 FROM developer_feedback df WHERE df.group_id = ?
           )`,
        [orphanId, orphanId],
      );
    }

    await connection.commit();
    return { groupId: targetGroupId, feedbackIds: ids };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listDeveloperFeedbackGroupsForAdmin({ limit = 80, q = '' } = {}) {
  const limitNum = Math.max(1, Math.min(200, Number(limit) || 80));
  const trimmedQ = String(q || '').trim();
  let havingSql = '';
  const params = [];

  if (trimmedQ) {
    if (/^g#?\d+$/i.test(trimmedQ)) {
      havingSql = 'HAVING g.id = ?';
      params.push(Number(trimmedQ.replace(/^g#?/i, '')));
    } else {
      havingSql = 'HAVING g.content LIKE ? OR primary_honoree_name LIKE ?';
      const like = `%${trimmedQ}%`;
      params.push(like, like);
    }
  }

  const [rows] = await pool.execute(
    `SELECT
       g.id,
       g.category,
       g.content,
       g.admin_response,
       g.admin_response_status,
       g.admin_responded_at,
       g.created_at,
       COUNT(df.id) AS reporter_count,
       (
         SELECT df2.honoree_name
         FROM developer_feedback df2
         WHERE df2.group_id = g.id
         ORDER BY df2.created_at ASC, df2.id ASC
         LIMIT 1
       ) AS primary_honoree_name
     FROM developer_feedback_groups g
     INNER JOIN developer_feedback df ON df.group_id = g.id
     GROUP BY g.id
     ${havingSql}
     ORDER BY g.created_at DESC
     LIMIT ${limitNum}`,
    params,
  );

  return rows.map((row) => {
    const reporterCount = Number(row.reporter_count) || 1;
    return {
      id: row.id,
      category: row.category,
      content: row.content,
      honoreeDisplay: formatHonoreeDisplay(row.primary_honoree_name, reporterCount),
      reporterCount,
      adminResponse: row.admin_response || '',
      adminResponseStatus: row.admin_response_status || 'none',
      adminRespondedAt: row.admin_responded_at,
      createdAt: row.created_at,
    };
  });
}

export async function getDeveloperFeedbackGroupDetailForAdmin(groupId) {
  const group = await getDeveloperFeedbackGroupForAdmin(groupId);
  if (!group) return null;

  const [memberRows] = await pool.execute(
    `SELECT
       df.id,
       df.content,
       df.honoree_name,
       df.school_public,
       df.created_at,
       df.user_id,
       u.username,
       u.name_enc AS user_name_enc
     FROM developer_feedback df
     LEFT JOIN users u ON u.id = df.user_id
     WHERE df.group_id = ?
     ORDER BY df.created_at ASC, df.id ASC`,
    [groupId],
  );

  const members = memberRows.map((row, index) => ({
    id: row.id,
    content: row.content,
    honoreeName: row.honoree_name || '',
    schoolPublic: Boolean(row.school_public),
    createdAt: row.created_at,
    userId: row.user_id,
    username: row.username,
    maskedName: maskKoreanName(resolveUserName(row) || ''),
    isPrimary: index === 0,
  }));

  const primary = members[0];
  return {
    ...group,
    honoreeDisplay: formatHonoreeDisplay(primary?.honoreeName, group.reporterCount),
    members,
  };
}

export async function getDeveloperFeedbackGroupForAdmin(groupId) {
  const id = Number(groupId);
  if (!Number.isFinite(id) || id < 1) return null;

  const [rows] = await pool.execute(
    `SELECT
       g.id,
       g.category,
       g.content,
       g.admin_response,
       g.admin_response_status,
       g.admin_responded_at,
       g.created_at,
       COUNT(df.id) AS reporter_count
     FROM developer_feedback_groups g
     INNER JOIN developer_feedback df ON df.group_id = g.id
     WHERE g.id = ?
     GROUP BY g.id
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    category: row.category,
    content: row.content,
    adminResponse: row.admin_response || '',
    adminResponseStatus: row.admin_response_status || 'none',
    adminRespondedAt: row.admin_responded_at,
    createdAt: row.created_at,
    reporterCount: Number(row.reporter_count) || 0,
  };
}
