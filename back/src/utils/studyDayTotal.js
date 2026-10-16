/**
 * study_sessions 행 변경 후 해당 (user_id, day_key) study_days 재집계.
 * 같은 started_at 이 여러 행이면 가장 긴 공부 구간만 센다.
 */
export async function sumClosedStudyMs(connection, userId, dayKey) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(dur_ms), 0) AS total_ms
     FROM (
       SELECT MAX(
         CASE
           WHEN ended_at IS NULL OR session_kind = 'break' THEN 0
           ELSE GREATEST(
             0,
             TIMESTAMPDIFF(MICROSECOND, started_at, ended_at) DIV 1000
           )
         END
       ) AS dur_ms
       FROM study_sessions
       WHERE user_id = ? AND day_key = ?
       GROUP BY started_at
     ) grouped`,
    [userId, dayKey],
  );
  return Number(rows?.[0]?.total_ms || 0);
}

/** 같은 날, 여러 사용자의 닫힌 공부 시간. 같은 시작 시각은 한 번만. */
export async function sumClosedStudyMsByUser(connection, userIds, dayKey) {
  const ids = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  const totals = new Map();
  if (ids.length === 0) return totals;
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT user_id, COALESCE(SUM(dur_ms), 0) AS total_ms
     FROM (
       SELECT user_id, started_at, MAX(
         CASE
           WHEN ended_at IS NULL OR session_kind = 'break' THEN 0
           ELSE GREATEST(
             0,
             TIMESTAMPDIFF(MICROSECOND, started_at, ended_at) DIV 1000
           )
         END
       ) AS dur_ms
       FROM study_sessions
       WHERE day_key = ? AND user_id IN (${placeholders})
       GROUP BY user_id, started_at
     ) grouped
     GROUP BY user_id`,
    [dayKey, ...ids],
  );
  for (const row of rows) {
    totals.set(String(row.user_id), Number(row.total_ms) || 0);
  }
  return totals;
}

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
  const computedElapsedMs = await sumClosedStudyMs(connection, userId, dayKey);
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
