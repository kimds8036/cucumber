import pool from '../config/database.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

export async function writeUserSanction(connection, {
  userId,
  sanctionType,
  reason,
  adminUserId,
  expiresAt = null,
}) {
  await connection.execute(
    `INSERT INTO user_sanctions (user_id, sanction_type, reason, admin_user_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, sanctionType, reason || null, adminUserId, expiresAt],
  );
}

export async function getUserSanctionHistory(userId, limit = 20) {
  const lim = clampSqlLimit(limit, { def: 20, min: 1, max: 100 });
  const [rows] = await pool.query(
    `SELECT s.id, s.sanction_type, s.reason, s.admin_user_id, s.expires_at, s.created_at,
            a.username AS admin_username
     FROM user_sanctions s
     LEFT JOIN admin_users a ON a.id = s.admin_user_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC
     LIMIT ${lim}`,
    [userId],
  );
  return rows;
}
