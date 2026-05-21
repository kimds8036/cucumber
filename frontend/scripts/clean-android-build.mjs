/**
 * Android 네이티브·캐시 삭제 (환경 URL 꼬임 방지)
 * 사용: node scripts/clean-android-build.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  path.join(root, 'android'),
  path.join(root, '.expo'),
  path.join(root, 'node_modules', '.cache'),
];

for (const dir of targets) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[clean] removed ${path.relative(root, dir)}`);
  }
}

console.log('[clean] done');
