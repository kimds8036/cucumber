/**
 * 006_schema_normalization.sql 후처리 (동적 FK 정리·중복 데이터 보정)
 */

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE ?`,
    [columnName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(`SHOW TABLES LIKE ?`, [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function dropForeignKeysOnColumns(connection, tableName, columnNames) {
  const [rows] = await connection.query(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
       AND COLUMN_NAME IN (${columnNames.map(() => '?').join(',')})`,
    [tableName, ...columnNames],
  );

  const seen = new Set();
  for (const row of rows) {
    const name = row.CONSTRAINT_NAME;
    if (seen.has(name)) continue;
    seen.add(name);
    try {
      await connection.execute(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``);
    } catch (err) {
      if (err.errno !== 1091) throw err;
    }
  }
  return seen.size;
}

async function dedupeUserDevices(connection) {
  if (!(await tableExists(connection, 'user_devices'))) return 0;

  const [result] = await connection.execute(
    `DELETE ud FROM user_devices ud
     INNER JOIN user_devices newer
       ON newer.user_id = ud.user_id
      AND newer.device_id = ud.device_id
      AND (
        newer.last_login_at > ud.last_login_at
        OR (newer.last_login_at = ud.last_login_at AND newer.id > ud.id)
        OR (newer.last_login_at IS NULL AND ud.last_login_at IS NULL AND newer.id > ud.id)
      )
     WHERE ud.device_id IS NOT NULL AND ud.device_id != ''`,
  );
  return result.affectedRows || 0;
}

async function cleanupPersonalMailRoomOrphans(connection) {
  if (!(await tableExists(connection, 'personal_mail_rooms'))) return 0;

  const [result] = await connection.execute(
    `DELETE pmr FROM personal_mail_rooms pmr
     LEFT JOIN personal_mails pm ON pm.id = pmr.root_mail_id
     WHERE pm.id IS NULL`,
  );
  return result.affectedRows || 0;
}

async function cleanupPersonalMailRoomUserOrphans(connection) {
  const [result] = await connection.execute(
    `DELETE pmr FROM personal_mail_rooms pmr
     LEFT JOIN users u1 ON u1.id = pmr.user1_id
     LEFT JOIN users u2 ON u2.id = pmr.user2_id
     WHERE u1.id IS NULL OR u2.id IS NULL`,
  );
  return result.affectedRows || 0;
}

async function cleanupPersonalMailRoomLastMailOrphans(connection) {
  const [result] = await connection.execute(
    `UPDATE personal_mail_rooms pmr
     LEFT JOIN personal_mails pm ON pm.id = pmr.last_mail_id
     SET pmr.last_mail_id = NULL
     WHERE pmr.last_mail_id IS NOT NULL AND pm.id IS NULL`,
  );
  return result.affectedRows || 0;
}

async function renameAdminFkColumn(connection, tableName, oldName, newName) {
  if (!(await columnExists(connection, tableName, oldName))) {
    if (await columnExists(connection, tableName, newName)) return 'skipped';
    return 'missing';
  }

  await dropForeignKeysOnColumns(connection, tableName, [oldName]);

  const [indexes] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
  for (const idx of indexes) {
    if (idx.Column_name !== oldName || idx.Key_name === 'PRIMARY') continue;
    try {
      await connection.execute(`ALTER TABLE \`${tableName}\` DROP INDEX \`${idx.Key_name}\``);
    } catch (err) {
      if (err.errno !== 1091) throw err;
    }
  }

  await connection.execute(
    `ALTER TABLE \`${tableName}\`
     CHANGE COLUMN \`${oldName}\` \`${newName}\` INT NULL`,
  );
  return 'renamed';
}

const ADMIN_FK_RENAMES = [
  ['inquiries', 'answered_by', 'answered_by_admin_id'],
  ['reports', 'reviewed_by', 'reviewed_by_admin_id'],
  ['report_appeals', 'reviewed_by', 'reviewed_by_admin_id'],
  ['signup_certificate_submissions', 'reviewed_by', 'reviewed_by_admin_id'],
  ['signup_student_id_submissions', 'reviewed_by', 'reviewed_by_admin_id'],
  ['reports_archive', 'reviewed_by', 'reviewed_by_admin_id'],
];

async function addAdminUserForeignKeys(connection) {
  const specs = [
    ['inquiries', 'answered_by_admin_id', 'fk_inquiries_answered_by_admin'],
    ['reports', 'reviewed_by_admin_id', 'fk_reports_reviewed_by_admin'],
    ['report_appeals', 'reviewed_by_admin_id', 'fk_report_appeals_reviewed_by_admin'],
    ['signup_certificate_submissions', 'reviewed_by_admin_id', 'fk_signup_cert_reviewed_by_admin'],
    ['signup_student_id_submissions', 'reviewed_by_admin_id', 'fk_signup_sid_reviewed_by_admin'],
  ];

  for (const [table, column, fkName] of specs) {
    if (!(await columnExists(connection, table, column))) continue;
    try {
      await connection.execute(
        `ALTER TABLE \`${table}\`
         ADD CONSTRAINT \`${fkName}\`
         FOREIGN KEY (\`${column}\`) REFERENCES admin_users(id) ON DELETE SET NULL`,
      );
    } catch (err) {
      if (![1826, 1061, 1022, 121].includes(err.errno)) throw err;
    }

    const idxName = `idx_${table}_${column}`.slice(0, 64);
    try {
      await connection.execute(
        `CREATE INDEX \`${idxName}\` ON \`${table}\` (\`${column}\`)`,
      );
    } catch (err) {
      if (err.errno !== 1061) throw err;
    }
  }

  if (await columnExists(connection, 'reports_archive', 'reviewed_by_admin_id')) {
    try {
      await connection.execute(
        `CREATE INDEX idx_reports_archive_reviewed_by_admin ON reports_archive (reviewed_by_admin_id)`,
      );
    } catch (err) {
      if (err.errno !== 1061) throw err;
    }
  }
}

async function normalizePersonalMailsForeignKeys(connection) {
  if (!(await tableExists(connection, 'personal_mails'))) return 0;

  const dropped = await dropForeignKeysOnColumns(connection, 'personal_mails', [
    'root_mail_id',
    'parent_mail_id',
  ]);

  const specs = [
    ['fk_personal_mails_root_mail', 'root_mail_id'],
    ['fk_personal_mails_parent_mail', 'parent_mail_id'],
  ];

  for (const [fkName, column] of specs) {
    try {
      await connection.execute(
        `ALTER TABLE personal_mails
         ADD CONSTRAINT \`${fkName}\`
         FOREIGN KEY (\`${column}\`) REFERENCES personal_mails(id) ON DELETE SET NULL`,
      );
    } catch (err) {
      if (![1826, 1022, 121].includes(err.errno)) throw err;
    }
  }

  return dropped;
}

async function addPersonalMailRoomForeignKeys(connection) {
  if (!(await tableExists(connection, 'personal_mail_rooms'))) return;

  const specs = [
    ['fk_pmr_root_mail', 'root_mail_id', 'personal_mails', 'id', 'CASCADE'],
    ['fk_pmr_root_author', 'root_author_id', 'users', 'id', 'CASCADE'],
    ['fk_pmr_user1', 'user1_id', 'users', 'id', 'CASCADE'],
    ['fk_pmr_user2', 'user2_id', 'users', 'id', 'CASCADE'],
    ['fk_pmr_last_mail', 'last_mail_id', 'personal_mails', 'id', 'SET NULL'],
  ];

  for (const [fkName, column, refTable, refColumn, onDelete] of specs) {
    try {
      await connection.execute(
        `ALTER TABLE personal_mail_rooms
         ADD CONSTRAINT \`${fkName}\`
         FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\`(\`${refColumn}\`) ON DELETE ${onDelete}`,
      );
    } catch (err) {
      if (![1826, 1022, 121].includes(err.errno)) throw err;
    }
  }
}

async function addUserDevicesUniqueKey(connection) {
  if (!(await tableExists(connection, 'user_devices'))) return;

  const removed = await dedupeUserDevices(connection);
  try {
    await connection.execute(
      `ALTER TABLE user_devices
       ADD UNIQUE KEY uq_user_devices_user_device (user_id, device_id)`,
    );
  } catch (err) {
    if (err.errno !== 1061) throw err;
  }
  return removed;
}

async function dropOcrVerifications(connection) {
  if (!(await tableExists(connection, 'ocr_verifications'))) return false;
  await connection.execute('DROP TABLE ocr_verifications');
  return true;
}

export async function applySchemaNormalization006(connection) {
  const summary = [];

  for (const [table, oldName, newName] of ADMIN_FK_RENAMES) {
    if (!(await tableExists(connection, table))) continue;
    const result = await renameAdminFkColumn(connection, table, oldName, newName);
    if (result === 'renamed') summary.push(`${table}.${oldName}→${newName}`);
  }

  await addAdminUserForeignKeys(connection);

  const pmDropped = await normalizePersonalMailsForeignKeys(connection);
  if (pmDropped > 0) summary.push(`personal_mails FK ${pmDropped}개 정리`);

  const roomOrphans = await cleanupPersonalMailRoomOrphans(connection);
  const userOrphans = await cleanupPersonalMailRoomUserOrphans(connection);
  await cleanupPersonalMailRoomLastMailOrphans(connection);
  if (roomOrphans + userOrphans > 0) {
    summary.push(`personal_mail_rooms orphan ${roomOrphans + userOrphans}건 삭제`);
  }
  await addPersonalMailRoomForeignKeys(connection);

  const devicesDeduped = await addUserDevicesUniqueKey(connection);
  if (devicesDeduped > 0) summary.push(`user_devices 중복 ${devicesDeduped}건 제거`);

  if (await dropOcrVerifications(connection)) summary.push('ocr_verifications 제거');

  return summary;
}
