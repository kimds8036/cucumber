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

async function maxCommentId(executor, table) {
  const allowed = { comments: true, school_mail_comments: true };
  if (!allowed[table]) {
    throw new Error(`unsupported comment table: ${table}`);
  }
  const [[row]] = await executor.execute(
    `SELECT COALESCE(MAX(id), 0) AS maxId FROM ${table}`,
  );
  return Number(row?.maxId || 0);
}

/**
 * comments.id 구간만 훑어 해당 게시글 comment_count 보정.
 * 삭제만 있고 새 id가 없는 드리프트는 주기적 전체 reconcile이 담당한다.
 */
export async function reconcilePostCommentCountsSince(executor, afterId) {
  const toId = await maxCommentId(executor, 'comments');
  const fromId = Math.max(0, Number(afterId) || 0);
  if (toId <= fromId) {
    return { postsUpdated: 0, fromId, toId, mode: 'incremental' };
  }
  const [result] = await executor.execute(
    `
    UPDATE posts p
    INNER JOIN (
      SELECT DISTINCT post_id FROM comments WHERE id > ? AND id <= ?
    ) t ON t.post_id = p.id
    SET p.comment_count = (
      SELECT COUNT(*) FROM comments c
      WHERE c.post_id = p.id AND c.is_deleted = FALSE
    )
    WHERE p.is_deleted = FALSE
    `,
    [fromId, toId],
  );
  return {
    postsUpdated: result.affectedRows ?? 0,
    fromId,
    toId,
    mode: 'incremental',
  };
}

export async function reconcileSchoolMailCommentCountsSince(executor, afterId) {
  const toId = await maxCommentId(executor, 'school_mail_comments');
  const fromId = Math.max(0, Number(afterId) || 0);
  if (toId <= fromId) {
    return { mailsUpdated: 0, fromId, toId, mode: 'incremental' };
  }
  const [result] = await executor.execute(
    `
    UPDATE school_mails sm
    INNER JOIN (
      SELECT DISTINCT mail_id FROM school_mail_comments WHERE id > ? AND id <= ?
    ) t ON t.mail_id = sm.id
    SET sm.comment_count = (
      SELECT COUNT(*) FROM school_mail_comments smc
      WHERE smc.mail_id = sm.id AND smc.is_deleted = FALSE
    )
    WHERE sm.is_deleted = FALSE
    `,
    [fromId, toId],
  );
  return {
    mailsUpdated: result.affectedRows ?? 0,
    fromId,
    toId,
    mode: 'incremental',
  };
}

export async function maxPostCommentId(executor = pool) {
  return maxCommentId(executor, 'comments');
}

export async function maxSchoolMailCommentId(executor = pool) {
  return maxCommentId(executor, 'school_mail_comments');
}
