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

const androidDir = path.join(root, 'android');
const isWin = process.platform === 'win32';
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

if (!fs.existsSync(gradlew)) {
  console.error('[aab] android/ 없음. 먼저 npm run prebuild:android:prod 실행');
  process.exit(1);
}

console.log(`[aab] APP_ENV=${env.APP_ENV} NODE_ENV=${env.NODE_ENV}`);
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
