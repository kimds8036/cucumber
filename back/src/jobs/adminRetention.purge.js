import pool from '../config/database.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';

const LOCK_KEY = 'batch:lock:admin-retention';
const LOCK_TTL = 600;

const AUDIT_RETENTION_DAYS = Number(process.env.ADMIN_AUDIT_RETENTION_DAYS || 365);
const REPORT_ARCHIVE_DAYS = Number(process.env.ADMIN_REPORT_ARCHIVE_DAYS || 90);
const BATCH_LIMIT = 2000;

async function purgeAuditLogs() {
  const [result] = await pool.execute(
    `DELETE FROM admin_audit_logs
     WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT ?`,
    [AUDIT_RETENTION_DAYS, BATCH_LIMIT],
  );
  return result.affectedRows || 0;
}

async function archiveOldReports() {
  const connection = await pool.getConnection();
  let archived = 0;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, reporter_id, target_type, target_id, reason, description, status,
              reviewed_by, reviewed_at, review_note, is_malicious, penalty_applied, created_at
       FROM reports
       WHERE status IN ('resolved', 'rejected')
         AND reviewed_at IS NOT NULL
         AND reviewed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY reviewed_at ASC
       LIMIT ?`,
      [REPORT_ARCHIVE_DAYS, BATCH_LIMIT],
    );

    for (const r of rows) {
      await connection.execute(
        `INSERT IGNORE INTO reports_archive
           (id, reporter_id, target_type, target_id, reason, description, status,
            reviewed_by, reviewed_at, review_note, is_malicious, penalty_applied, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          r.reporter_id,
          r.target_type,
          r.target_id,
          r.reason,
          r.description,
          r.status,
          r.reviewed_by,
          r.reviewed_at,
          r.review_note,
          r.is_malicious,
          r.penalty_applied,
          r.created_at,
        ],
      );
      await connection.execute(`DELETE FROM reports WHERE id = ?`, [r.id]);
      archived += 1;
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return archived;
}

export async function runAdminRetentionJob() {
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) return { skipped: true };
  try {
    const purgedLogs = await purgeAuditLogs();
    const archivedReports = await archiveOldReports();
    return { skipped: false, purgedLogs, archivedReports };
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}
