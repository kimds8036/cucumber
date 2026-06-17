/**
 * 게시글·학교우편 댓글 수(comment_count) 일관성 유지.
 * 삭제는 반드시 softDelete* 함수를 통해 처리하고, 주기적 reconcile로 보정한다.
 */

import pool from '../config/database.js';

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number|string} commentId
 * @returns {Promise<{ deleted: boolean, postId?: number }>}
 */
export async function softDeletePostComment(connection, commentId) {
  const [rows] = await connection.execute(
    `SELECT id, post_id FROM comments WHERE id = ? AND is_deleted = FALSE`,
    [commentId],
  );
  if (rows.length === 0) {
    return { deleted: false };
  }

  const postId = rows[0].post_id;

  await connection.execute(
    `UPDATE comments SET is_deleted = TRUE WHERE id = ? AND is_deleted = FALSE`,
    [commentId],
  );
  await connection.execute(
    `UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`,
    [postId],
  );

  return { deleted: true, postId };
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number|string} commentId
 * @returns {Promise<{ deleted: boolean, mailId?: number }>}
 */
export async function softDeleteSchoolMailComment(connection, commentId) {
  const [rows] = await connection.execute(
    `SELECT id, mail_id FROM school_mail_comments WHERE id = ? AND is_deleted = FALSE`,
    [commentId],
  );
  if (rows.length === 0) {
    return { deleted: false };
  }

  const mailId = rows[0].mail_id;

  await connection.execute(
    `UPDATE school_mail_comments SET is_deleted = TRUE WHERE id = ? AND is_deleted = FALSE`,
    [commentId],
  );
  await connection.execute(
    `UPDATE school_mails SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`,
    [mailId],
  );

  return { deleted: true, mailId };
}

/**
 * posts.comment_count를 실제 댓글 수와 맞춘다.
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} executor
 */
export async function reconcilePostCommentCounts(executor) {
  const [result] = await executor.execute(`
    UPDATE posts p
    SET comment_count = (
      SELECT COUNT(*) FROM comments c
      WHERE c.post_id = p.id AND c.is_deleted = FALSE
    )
    WHERE p.is_deleted = FALSE
  `);
  return { postsUpdated: result.affectedRows ?? 0 };
}

/**
 * school_mails.comment_count를 실제 댓글 수와 맞춘다.
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} executor
 */
export async function reconcileSchoolMailCommentCounts(executor) {
  const [result] = await executor.execute(`
    UPDATE school_mails sm
    SET comment_count = (
      SELECT COUNT(*) FROM school_mail_comments smc
      WHERE smc.mail_id = sm.id AND smc.is_deleted = FALSE
    )
    WHERE sm.is_deleted = FALSE
  `);
  return { mailsUpdated: result.affectedRows ?? 0 };
}

/** @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} [executor] */
export async function reconcileAllCommentCounts(executor = pool) {
  const postResult = await reconcilePostCommentCounts(executor);
  const mailResult = await reconcileSchoolMailCommentCounts(executor);
  return { ...postResult, ...mailResult };
}
