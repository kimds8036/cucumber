/**
 * 016 — 기존 board_type=national 게시글 → student 이관
 * (학교 보드 school 은 변경하지 않음)
 */

/**
 * @returns {Promise<string[]>}
 */
export async function applyPostsNationalToStudent016(connection) {
  const summary = [];

  const [result] = await connection.execute(
    `UPDATE posts
     SET board_type = 'student'
     WHERE board_type = 'national'
       AND (is_deleted = FALSE OR is_deleted IS NULL)`,
  );

  const affected = Number(result?.affectedRows ?? 0);
  summary.push(`national→student:${affected}`);
  return summary;
}
