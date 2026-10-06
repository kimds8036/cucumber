/**
 * Android 네이티브·캐시 삭제 (환경 URL 꼬임 방지)
 * 사용: node scripts/clean-android-build.mjs
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(root, 'android');

function stopProjectGradle() {
  const gradlewName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  const gradlew = path.join(androidDir, gradlewName);
  if (!fs.existsSync(gradlew)) return;

  console.log('[clean] stopping Gradle daemon');
  const result = spawnSync(`"${gradlew}" --stop`, {
    cwd: androidDir,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
  });
  if (result.status !== 0) {
    console.warn(`[clean] gradlew --stop exited ${result.status ?? 'unknown'}`);
  }
}

function removeDir(dir) {
  fs.rmSync(dir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 300,
  });
  console.log(`[clean] removed ${path.relative(root, dir)}`);
}

stopProjectGradle();

const targets = [
  androidDir,
  path.join(root, '.expo'),
  path.join(root, 'node_modules', '.cache'),
];

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;
  try {
    removeDir(dir);
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error;
    console.error(
      `[clean] ${path.relative(root, dir)} is in use (${error.code}). Close Android Studio or any terminal whose folder is inside it, then run this again.`,
    );
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log('[clean] done');
}
