/**
 * 조회자(viewer)가 차단한 작성자의 콘텐츠 제외 — user_blocks.user_id = 차단한 사람
 */
export function appendUserBlockFilter(
  conditions,
  params,
  viewerUserId,
  authorColumn = 'p.user_id',
) {
  const viewer = Number(viewerUserId);
  if (!Number.isFinite(viewer) || viewer <= 0) return;
  conditions.push(`NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE ub.user_id = ? AND ub.blocked_user_id = ${authorColumn}
  )`);
  params.push(viewer);
}
