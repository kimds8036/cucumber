/**
 * 기존 plaintext PII → 암호화 컬럼 백필
 *
 * cd back && npm run migrate:pii-encrypt
 * cd back && npm run migrate:pii-encrypt -- --target=develop
 */

import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';
import { runAllPiiBackfills } from './piiBackfill.js';

async function main() {
  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const connection = await createDbConnection(target);

  try {
    await connection.beginTransaction();
    const result = await runAllPiiBackfills(connection);
    await connection.commit();

    console.log(`✅ [${target}] PII 백필 완료`);
    console.log(`   users: ${result.users}`);
    console.log(`   phone_verifications: ${result.phoneVerifications}`);
    console.log(`   signup_student_id_submissions: ${result.signupStudentIdSubmissions}`);
    console.log(`   signup_certificate_submissions: ${result.signupCertificateSubmissions}`);
    console.log(`   signup_verification_tokens: ${result.signupVerificationTokens}`);
    console.log(`   account_recovery_tokens: ${result.accountRecoveryTokens}`);
    console.log(`   personal_mails: ${result.personalMails}`);
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
