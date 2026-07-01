/**
 * 기존 plaintext PII → 암호화 컬럼 백필 (047 마이그레이션 이후 1회 실행)
 *
 * cd back && npm run migrate:pii-encrypt
 * cd back && npm run migrate:pii-encrypt -- --target=develop
 */

import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';
import { isPiiCryptoConfigured } from '../utils/piiCrypto.js';
import {
  packPhoneOnly,
  packUserPii,
  resolvePiiField,
} from '../services/userPii.service.js';
import { normalizeLocalKrPhone } from '../utils/phone.js';

async function backfillUsers(connection) {
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
         birth_date_enc = ?, name = NULL, phone = NULL, birth_date = NULL
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

async function backfillPhoneVerifications(connection) {
  const [rows] = await connection.execute(
    `SELECT id, phone FROM phone_verifications WHERE phone_lookup IS NULL AND phone IS NOT NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const packed = packPhoneOnly(row.phone);
    await connection.execute(
      `UPDATE phone_verifications SET phone_enc = ?, phone_lookup = ?, phone = NULL WHERE id = ?`,
      [packed.phone_enc, packed.phone_lookup, row.id],
    );
    updated += 1;
  }
  return updated;
}

async function backfillTable(connection, table) {
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
         name_enc = ?, phone_enc = ?, phone_lookup = ?, birth_date_enc = ?,
         name = NULL, phone = NULL, birth_date = NULL
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

async function backfillRecoveryTokens(connection) {
  const [rows] = await connection.execute(
    `SELECT id, phone FROM account_recovery_tokens WHERE phone_lookup IS NULL AND phone IS NOT NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const packed = packPhoneOnly(row.phone);
    await connection.execute(
      `UPDATE account_recovery_tokens SET phone_enc = ?, phone_lookup = ?, phone = NULL WHERE id = ?`,
      [packed.phone_enc, packed.phone_lookup, row.id],
    );
    updated += 1;
  }
  return updated;
}

async function main() {
  if (!isPiiCryptoConfigured()) {
    throw new Error(
      'PII_ENCRYPTION_KEY(또는 OTP_ENCRYPTION_KEY)가 설정되지 않았습니다.',
    );
  }

  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const connection = await createDbConnection(target);

  try {
    await connection.beginTransaction();
    const users = await backfillUsers(connection);
    const phoneVerif = await backfillPhoneVerifications(connection);
    const studentIds = await backfillTable(
      connection,
      'signup_student_id_submissions',
    );
    const certificates = await backfillTable(
      connection,
      'signup_certificate_submissions',
    );
    const tokens = await backfillTable(connection, 'signup_verification_tokens');
    const recovery = await backfillRecoveryTokens(connection);
    await connection.commit();

    console.log(`✅ [${target}] PII 백필 완료`);
    console.log(`   users: ${users}`);
    console.log(`   phone_verifications: ${phoneVerif}`);
    console.log(`   signup_student_id_submissions: ${studentIds}`);
    console.log(`   signup_certificate_submissions: ${certificates}`);
    console.log(`   signup_verification_tokens: ${tokens}`);
    console.log(`   account_recovery_tokens: ${recovery}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('❌ migrate-pii-encrypt 실패:', error?.message || error);
  process.exit(1);
});
