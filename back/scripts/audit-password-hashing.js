/**
 * users.password bcrypt 형식 점검 (평문·약한 해시 샘플 탐지)
 * 사용: node back/scripts/audit-password-hashing.js
 */
import pool from '../src/config/database.js';
import { getBcryptSaltRounds } from '../src/utils/auth.js';

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

async function main() {
  const rounds = getBcryptSaltRounds();
  console.log(`[audit] BCRYPT_SALT_ROUNDS (effective): ${rounds}`);

  const [rows] = await pool.execute(
    `SELECT id, username, password FROM users WHERE is_deleted = FALSE LIMIT 5000`,
  );

  let invalid = 0;
  let weakRounds = 0;
  const samples = [];

  for (const row of rows) {
    const pw = String(row.password || '');
    if (!BCRYPT_RE.test(pw)) {
      invalid += 1;
      if (samples.length < 5) {
        samples.push({ id: row.id, username: row.username, reason: 'not_bcrypt' });
      }
      continue;
    }
    const cost = Number(pw.split('$')[2]);
    if (!Number.isFinite(cost) || cost < 8) {
      weakRounds += 1;
      if (samples.length < 5) {
        samples.push({ id: row.id, username: row.username, reason: `weak_cost_${cost}` });
      }
    }
  }

  console.log(`[audit] checked: ${rows.length}`);
  console.log(`[audit] non-bcrypt: ${invalid}`);
  console.log(`[audit] weak rounds (<8): ${weakRounds}`);
  if (samples.length) {
    console.log('[audit] samples:', samples);
  }

  if (invalid > 0) {
    process.exitCode = 1;
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
