import pool from '../config/database.js';

export async function getBatchCursor(jobName, cursorKey) {
  try {
    const [[row]] = await pool.execute(
      `SELECT job_name, cursor_key, last_id, last_at, mode, note, updated_at
       FROM batch_job_cursors
       WHERE job_name = ? AND cursor_key = ?
       LIMIT 1`,
      [jobName, cursorKey],
    );
    return row || null;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return null;
    throw err;
  }
}

function toMysqlDateTime(value) {
  if (value == null) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 23).replace('T', ' ');
  }
  return value;
}

export async function saveBatchCursor(jobName, cursorKey, { lastId = null, lastAt = null, mode = null, note = null } = {}) {
  try {
    await pool.execute(
      `INSERT INTO batch_job_cursors (job_name, cursor_key, last_id, last_at, mode, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         last_id = VALUES(last_id),
         last_at = VALUES(last_at),
         mode = VALUES(mode),
         note = VALUES(note)`,
      [jobName, cursorKey, lastId, toMysqlDateTime(lastAt), mode, note],
    );
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return;
    throw err;
  }
}
