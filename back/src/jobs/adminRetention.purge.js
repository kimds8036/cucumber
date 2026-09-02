import pool from '../config/database.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';

const LOCK_KEY = 'batch:lock:admin-retention';
const LOCK_TTL = 600;

const AUDIT_RETENTION_DAYS = Number(process.env.ADMIN_AUDIT_RETENTION_DAYS || 365);
const REPORT_ARCHIVE_DAYS = Number(process.env.ADMIN_REPORT_ARCHIVE_DAYS || 90);
const FCM_INACTIVE_RETENTION_DAYS = Number(
  process.env.FCM_INACTIVE_RETENTION_DAYS || 90,
);
const BATCH_LIMIT = clampSqlLimit(process.env.ADMIN_RETENTION_BATCH_LIMIT || 2000, {
  def: 2000,
  min: 100,
  max: 5000,
});

async function purgeAuditLogs() {
  const [result] = await pool.query(
    `DELETE FROM admin_audit_logs
     WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT ${BATCH_LIMIT}`,
    [AUDIT_RETENTION_DAYS],
  );
  return result.affectedRows || 0;
}

/** 비활성 FCM 토큰: updated_at 기준 N일 경과 행 hard delete */
async function purgeInactiveFcmTokens() {
  const days = Number.isFinite(FCM_INACTIVE_RETENTION_DAYS)
    ? Math.max(7, Math.floor(FCM_INACTIVE_RETENTION_DAYS))
    : 90;
  const [result] = await pool.query(
    `DELETE FROM fcm_tokens
     WHERE is_active = FALSE
       AND COALESCE(updated_at, created_at) < DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT ${BATCH_LIMIT}`,
    [days],
  );
  return result.affectedRows || 0;
}

async function archiveOldReports() {
  const connection = await pool.getConnection();
  let archived = 0;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, reporter_id, target_type, target_id, reason, description, status,
              reviewed_by_admin_id, reviewed_at, review_note, is_malicious, penalty_applied, created_at
       FROM reports
       WHERE status IN ('resolved', 'rejected')
         AND reviewed_at IS NOT NULL
         AND reviewed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY reviewed_at ASC
       LIMIT ${BATCH_LIMIT}`,
      [REPORT_ARCHIVE_DAYS],
    );

    for (const r of rows) {
      await connection.execute(
        `INSERT IGNORE INTO reports_archive
           (id, reporter_id, target_type, target_id, reason, description, status,
            reviewed_by_admin_id, reviewed_at, review_note, is_malicious, penalty_applied, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          r.reporter_id,
          r.target_type,
          r.target_id,
          r.reason,
          r.description,
          r.status,
          r.reviewed_by_admin_id,
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
  const context = createBatchExecutionContext('admin-retention');
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }
  try {
    const purgedLogs = await purgeAuditLogs();
    const archivedReports = await archiveOldReports();
    const purgedFcmTokens = await purgeInactiveFcmTokens();
    logBatchSuccess(context, { purgedLogs, archivedReports, purgedFcmTokens });
    return { skipped: false, purgedLogs, archivedReports, purgedFcmTokens };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}
