import pool from '../config/database.js';

function clipError(message) {
  const text = String(message || '').trim();
  if (!text) return null;
  return text.slice(0, 500);
}

export async function persistBatchRun(context, status, extra = {}, error = null) {
  if (!context?.jobName) return;
  const elapsedMs = Math.max(0, Date.now() - Number(context.startedAt || Date.now()));
  const startedSec = Number(context.startedAt || Date.now()) / 1000;
  const summary = extra && Object.keys(extra).length ? extra : null;
  try {
    await pool.execute(
      `INSERT INTO batch_job_runs
         (job_name, status, started_at, finished_at, elapsed_ms, summary_json, error_message)
       VALUES (?, ?, FROM_UNIXTIME(?), UTC_TIMESTAMP(3), ?, ?, ?)`,
      [
        context.jobName,
        status,
        startedSec,
        elapsedMs,
        summary ? JSON.stringify(summary) : null,
        status === 'failed' ? clipError(error?.message) : null,
      ],
    );
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return;
    console.warn('[BatchJob] persist run failed', err?.message || err);
  }
}

export async function listRecentBatchRuns({ limit = 40, jobName = null } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 40, 1), 100);
  try {
    if (jobName) {
      const [rows] = await pool.execute(
        `SELECT id, job_name, status, started_at, finished_at, elapsed_ms, summary_json, error_message
         FROM batch_job_runs
         WHERE job_name = ?
         ORDER BY id DESC
         LIMIT ?`,
        [jobName, lim],
      );
      return rows;
    }
    const [rows] = await pool.execute(
      `SELECT id, job_name, status, started_at, finished_at, elapsed_ms, summary_json, error_message
       FROM batch_job_runs
       ORDER BY id DESC
       LIMIT ?`,
      [lim],
    );
    return rows;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}

export async function listBatchCursors() {
  try {
    const [rows] = await pool.execute(
      `SELECT job_name, cursor_key, last_id, last_at, mode, note, updated_at
       FROM batch_job_cursors
       ORDER BY job_name, cursor_key`,
    );
    return rows;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}
