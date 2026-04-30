import pool from '../config/database.js';

export async function isBlockedBy({ blockerUserId, targetUserId }) {
  if (!blockerUserId || !targetUserId) return false;
  const [rows] = await pool.execute(
    `SELECT id
     FROM user_blocks
     WHERE user_id = ? AND blocked_user_id = ?
     LIMIT 1`,
    [blockerUserId, targetUserId],
  );
  return rows.length > 0;
}
