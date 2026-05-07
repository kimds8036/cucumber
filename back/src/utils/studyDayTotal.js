/**
 * study_sessions 행 변경 후 해당 (user_id, day_key) study_days 재집계
 * – 타이머 라우트·세션 가드 배치 등에서 공통 사용
 */
export async function upsertStudyDayTotalForUserKey(
  connection,
  userId,
  dayKey,
) {
  const [[userRow]] = await connection.execute(
    `SELECT school_id FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const snapshotSchoolId = userRow?.school_id ?? null;
  const [sessionAggRows] = await connection.execute(
    `SELECT COALESCE(SUM(
      CASE
        WHEN ended_at IS NULL THEN 0
        ELSE GREATEST(
          0,
          TIMESTAMPDIFF(MICROSECOND, started_at, ended_at) DIV 1000
        )
      END
    ), 0) AS total_ms
     FROM study_sessions
     WHERE user_id = ? AND day_key = ?`,
    [userId, dayKey],
  );
  const computedElapsedMs = Number(sessionAggRows?.[0]?.total_ms || 0);
  await connection.execute(
    `INSERT INTO study_days (user_id, day_key, total_elapsed_ms, school_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_elapsed_ms = VALUES(total_elapsed_ms),
       updated_at = CURRENT_TIMESTAMP,
       school_id = IFNULL(study_days.school_id, VALUES(school_id))`,
    [userId, dayKey, computedElapsedMs, snapshotSchoolId],
  );
}

/** { user_id, day_key }[] 고유 재집계 */
export async function rebuildStudyDayTotalsForSessionPairs(connection, pairs) {
  const seen = new Set();
  for (const p of pairs) {
    const userId = Number(p.user_id);
    const dk =
      typeof p.day_key === 'string'
        ? p.day_key.slice(0, 10)
        : String(p.day_key ?? '').slice(0, 10);
    if (!Number.isFinite(userId) || !/^\d{4}-\d{2}-\d{2}$/.test(dk))
      continue;
    const key = `${userId}:${dk}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await upsertStudyDayTotalForUserKey(connection, userId, dk);
  }
}
