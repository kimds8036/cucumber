/**
 * gradlew bundleRelease — APP_ENV·NODE_ENV를 유지해 JS 번들에 production URL 반영
 * prebuild:android:prod 이후 실행
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from '@expo/env';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
load(root);

const appEnv = process.env.APP_ENV || 'production';
const env = {
  ...process.env,
  APP_ENV: appEnv,
  NODE_ENV: process.env.NODE_ENV || 'production',
};

/**
 * EXPO_PUBLIC_* 는 JS 번들에 인라인된다.
 * 스크립트에 빼먹으면 스토어 AAB에 mock 이니시스가 실릴 수 있음 (2026-07-16 사고).
 */
function assertStoreClientFlags(buildEnv) {
  const inicis = String(buildEnv.EXPO_PUBLIC_INICIS_ENABLED || '')
    .toLowerCase()
    .trim();
  const signupTest = String(buildEnv.EXPO_PUBLIC_SIGNUP_TEST_MODE || '')
    .toLowerCase()
    .trim();
  const adultTest = String(buildEnv.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || '')
    .toLowerCase()
    .trim();

  console.log('[aab] EXPO_PUBLIC_INICIS_ENABLED=', inicis || '(unset)');
  console.log('[aab] EXPO_PUBLIC_SIGNUP_TEST_MODE=', signupTest || '(unset)');
  console.log(
    '[aab] EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=',
    adultTest || '(unset)',
  );

  if (inicis !== 'true') {
    console.error(
      '[aab] FAIL: EXPO_PUBLIC_INICIS_ENABLED must be "true".\n' +
        '  Without it the app ships mock identity ("테스트 mock") instead of KG Inicis.\n' +
        '  Fix: android:aab:prod / eas.json production env / .env.production',
    );
    process.exit(1);
  }
  if (signupTest === 'true') {
    console.error(
      '[aab] FAIL: EXPO_PUBLIC_SIGNUP_TEST_MODE must not be "true" for store AAB.',
    );
    process.exit(1);
  }
  if (adultTest === 'true') {
    console.error(
      '[aab] FAIL: EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE must be false/unset for store AAB.',
    );
    process.exit(1);
  }
}

const androidDir = path.join(root, 'android');
const isWin = process.platform === 'win32';
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

if (!fs.existsSync(gradlew)) {
  console.error('[aab] android/ 없음. 먼저 npm run prebuild:android:prod 실행');
  process.exit(1);
}

console.log(`[aab] APP_ENV=${env.APP_ENV} NODE_ENV=${env.NODE_ENV}`);
assertStoreClientFlags(env);
console.log('[aab] gradlew bundleRelease …');

const result = spawnSync(gradlew, ['bundleRelease'], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: isWin,
});

if (result.status === 0) {
  const aab = path.join(
    androidDir,
    'app',
    'build',
    'outputs',
    'bundle',
    'release',
    'app-release.aab',
  );
  console.log(`[aab] 완료 → ${aab}`);
}

process.exit(result.status ?? 1);
