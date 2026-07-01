import { loadBackEnv } from './dbEnv.js';

/**
 * 관리자 시드 계정 — 반드시 .env / Railway Variables 에만 둠 (소스에 비밀번호 금지).
 *
 * ADMIN_SEED_1_USERNAME, ADMIN_SEED_1_PASSWORD, ADMIN_SEED_1_NAME
 * ADMIN_SEED_2_USERNAME, ...
 */
export function loadAdminSeedAccounts() {
  loadBackEnv();
  const accounts = [];

  for (let i = 1; i <= 10; i += 1) {
    const username = process.env[`ADMIN_SEED_${i}_USERNAME`]?.trim();
    const password = process.env[`ADMIN_SEED_${i}_PASSWORD`];
    const name =
      process.env[`ADMIN_SEED_${i}_NAME`]?.trim() || `관리자 ${i}`;

    if (!username && !password) continue;
    if (!username || !password) {
      throw new Error(
        `ADMIN_SEED_${i}_USERNAME 와 ADMIN_SEED_${i}_PASSWORD 는 쌍으로 설정해야 합니다.`,
      );
    }
    accounts.push({ username, password, name });
  }

  if (accounts.length === 0) {
    throw new Error(
      '관리자 시드 계정이 없습니다. ADMIN_SEED_1_USERNAME / ADMIN_SEED_1_PASSWORD 를 설정하세요.',
    );
  }

  return accounts;
}
