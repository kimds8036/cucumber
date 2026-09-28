import pool from '../config/database.js';
import { withdrawUserAccount } from './accountWithdrawal.service.js';

/**
 * 관리자 soft 탈퇴 — 앱 탈퇴와 동일(PII 익명화·세션 무효화).
 */
export async function adminSoftWithdrawUser(userId) {
  return withdrawUserAccount(userId);
}

/**
 * 테스트/잘못 생성된 계정 hard delete.
 * 먼저 soft 탈퇴(미탈퇴 시) 후 users 행을 제거한다. SUPER 전용.
 */
export async function adminHardDeleteUser(userId, { confirmUsername } = {}) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('INVALID_USER');
    err.code = 'INVALID_USER';
    throw err;
  }

  const expected = String(confirmUsername || '').trim();
  if (!expected) {
    const err = new Error('아이디 확인 값이 필요합니다.');
    err.code = 'CONFIRM_REQUIRED';
    throw err;
  }

  const [checkRows] = await pool.execute(
    `SELECT id, username, is_deleted FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!checkRows.length) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  if (String(checkRows[0].username) !== expected) {
    const err = new Error('아이디 확인이 일치하지 않습니다.');
    err.code = 'CONFIRM_MISMATCH';
    throw err;
  }

  if (!checkRows[0].is_deleted) {
    await withdrawUserAccount(id);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, username FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id],
    );
    if (!rows.length) {
      await connection.commit();
      return { userId: id, username: expected, hardDeleted: true };
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await connection.execute(
        `UPDATE identity_verifications SET linked_user_id = NULL WHERE linked_user_id = ?`,
        [id],
      );
      await connection.execute(`DELETE FROM users WHERE id = ?`, [id]);
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    await connection.commit();
    return { userId: id, username: rows[0].username, hardDeleted: true };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    connection.release();
  }
}
