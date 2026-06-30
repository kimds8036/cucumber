import pool from '../config/database.js';

/**
 * 제재·비밀번호 변경 등으로 모든 JWT·Refresh 무효화
 */
export async function incrementTokenVersion(userId, connection = null) {
  const db = connection || pool;
  await db.execute(
    'UPDATE users SET token_version = token_version + 1 WHERE id = ?',
    [Number(userId)],
  );
}

export async function getUserTokenVersion(userId, connection = null) {
  const db = connection || pool;
  const [rows] = await db.execute(
    'SELECT token_version FROM users WHERE id = ? LIMIT 1',
    [Number(userId)],
  );
  return Number(rows[0]?.token_version ?? 0);
}
