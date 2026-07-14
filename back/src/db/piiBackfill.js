import { isPiiCryptoConfigured } from '../utils/piiCrypto.js';
import {
  packNameOnly,
  packPhoneOnly,
  packUserPii,
} from '../services/userPii.service.js';

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

export async function backfillUsers(connection) {
  if (!(await columnExists(connection, 'users', 'name'))) return 0;

  const [rows] = await connection.execute(
    `SELECT id, name, phone, birth_date, name_enc, phone_lookup
     FROM users
     WHERE name_enc IS NULL OR phone_lookup IS NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    if (!row.name && !row.phone && !row.birth_date) continue;
    const pii = packUserPii({
      name: row.name,
      phone: row.phone,
      birthDate: row.birth_date,
    });
    await connection.execute(
      `UPDATE users SET
         name_enc = ?, name_lookup = ?, phone_enc = ?, phone_lookup = ?,
         birth_date_enc = ?
       WHERE id = ?`,
      [
        pii.name_enc,
        pii.name_lookup,
        pii.phone_enc,
        pii.phone_lookup,
        pii.birth_date_enc,
        row.id,
      ],
    );
    updated += 1;
  }
  return updated;
}

export async function backfillPhoneVerifications(connection) {
  if (!(await columnExists(connection, 'phone_verifications', 'phone'))) return 0;

  const [rows] = await connection.execute(
    `SELECT id, phone FROM phone_verifications WHERE phone_lookup IS NULL AND phone IS NOT NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const packed = packPhoneOnly(row.phone);
    await connection.execute(
      `UPDATE phone_verifications SET phone_enc = ?, phone_lookup = ? WHERE id = ?`,
      [packed.phone_enc, packed.phone_lookup, row.id],
    );
    updated += 1;
  }
  return updated;
}

export async function backfillTable(connection, table) {
  if (!(await columnExists(connection, table, 'name'))) return 0;

  const [rows] = await connection.execute(
    `SELECT id, name, phone, birth_date FROM ${table} WHERE name_enc IS NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    if (!row.name && !row.phone && !row.birth_date) continue;
    const pii = packUserPii({
      name: row.name,
      phone: row.phone,
      birthDate: row.birth_date,
    });
    await connection.execute(
      `UPDATE ${table} SET
         name_enc = ?, phone_enc = ?, phone_lookup = ?, birth_date_enc = ?
       WHERE id = ?`,
      [
        pii.name_enc,
        pii.phone_enc,
        pii.phone_lookup,
        pii.birth_date_enc,
        row.id,
      ],
    );
    updated += 1;
  }
  return updated;
}

export async function backfillRecoveryTokens(connection) {
  if (!(await columnExists(connection, 'account_recovery_tokens', 'phone'))) return 0;

  const [rows] = await connection.execute(
    `SELECT id, phone FROM account_recovery_tokens WHERE phone_lookup IS NULL AND phone IS NOT NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const packed = packPhoneOnly(row.phone);
    await connection.execute(
      `UPDATE account_recovery_tokens SET phone_enc = ?, phone_lookup = ? WHERE id = ?`,
      [packed.phone_enc, packed.phone_lookup, row.id],
    );
    updated += 1;
  }
  return updated;
}

export async function backfillPersonalMailRecipientNames(connection) {
  if (!(await columnExists(connection, 'personal_mails', 'recipient_name'))) return 0;
  if (!(await columnExists(connection, 'personal_mails', 'recipient_name_enc'))) return 0;

  const [rows] = await connection.execute(
    `SELECT id, recipient_name FROM personal_mails
     WHERE recipient_name_enc IS NULL
       AND recipient_name IS NOT NULL
       AND TRIM(recipient_name) != ''`,
  );
  let updated = 0;
  for (const row of rows) {
    const packed = packNameOnly(row.recipient_name);
    if (!packed.name_enc) continue;
    await connection.execute(
      `UPDATE personal_mails
       SET recipient_name_enc = ?, recipient_name_lookup = ?
       WHERE id = ?`,
      [packed.name_enc, packed.name_lookup, row.id],
    );
    updated += 1;
  }
  return updated;
}

export async function runAllPiiBackfills(connection) {
  if (!isPiiCryptoConfigured()) {
    throw new Error(
      'PII_ENCRYPTION_KEY(또는 OTP_ENCRYPTION_KEY)가 설정되지 않았습니다.',
    );
  }

  return {
    users: await backfillUsers(connection),
    phoneVerifications: await backfillPhoneVerifications(connection),
    signupStudentIdSubmissions: await backfillTable(
      connection,
      'signup_student_id_submissions',
    ),
    signupCertificateSubmissions: await backfillTable(
      connection,
      'signup_certificate_submissions',
    ),
    signupVerificationTokens: await backfillTable(
      connection,
      'signup_verification_tokens',
    ),
    accountRecoveryTokens: await backfillRecoveryTokens(connection),
    personalMails: await backfillPersonalMailRecipientNames(connection),
  };
}
