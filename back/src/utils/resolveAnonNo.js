/**
 * 게시글별 익명 번호 발급.
 * - 게시글 작성자: null (번호·카운터 모두 미사용)
 * - 기존 참여자: 고정 anon_no 재사용
 * - 신규: posts.anon_seq 증가 후 post_anon_aliases INSERT
 * 호출부는 같은 트랜잭션(conn) + posts FOR UPDATE 잠금 전제.
 */
export async function resolveAnonNo(conn, postId, userId) {
  const pid = Number(postId);
  const uid = Number(userId);
  const [[post]] = await conn.query(
    'SELECT user_id, anon_seq FROM posts WHERE id = ? FOR UPDATE',
    [pid],
  );
  if (!post) {
    const err = new Error('POST_NOT_FOUND');
    err.code = 'POST_NOT_FOUND';
    throw err;
  }
  if (Number(post.user_id) === uid) return null;

  const [[existing]] = await conn.query(
    'SELECT anon_no FROM post_anon_aliases WHERE post_id = ? AND user_id = ?',
    [pid, uid],
  );
  if (existing) return Number(existing.anon_no);

  const next = Number(post.anon_seq) + 1;
  await conn.query('UPDATE posts SET anon_seq = ? WHERE id = ?', [next, pid]);
  await conn.query(
    'INSERT INTO post_anon_aliases (post_id, user_id, anon_no) VALUES (?, ?, ?)',
    [pid, uid, next],
  );
  return next;
}
