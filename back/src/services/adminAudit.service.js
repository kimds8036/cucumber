import pool from '../config/database.js';

export async function writeAuditLog({
  adminUserId,
  actionType,
  targetType,
  targetId,
  note,
  extra,
  connection = null,
}) {
  const exec = connection
    ? connection.execute.bind(connection)
    : pool.execute.bind(pool);
  await exec(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, extra)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      adminUserId,
      actionType,
      targetType,
      targetId,
      note || null,
      extra ? JSON.stringify(extra) : null,
    ],
  );
}
