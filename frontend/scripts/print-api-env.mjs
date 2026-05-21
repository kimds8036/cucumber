/**
 * 빌드 전 API URL 확인
 * npm run env:print:dev | env:print:prod
 */
import { load } from '@expo/env';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
load(root);

const apiEnvModule = pathToFileURL(path.join(root, 'config', 'apiEnv.js')).href;
const { resolveApiBaseUrl, resolveAppEnv, API_URLS } = await import(apiEnvModule);

const appEnv = resolveAppEnv();
const apiBaseUrl = resolveApiBaseUrl();

console.log('--- API 환경 (빌드 시 app.config.js와 동일 규칙) ---');
console.log('APP_ENV (resolved):', appEnv);
console.log('apiBaseUrl:', apiBaseUrl);
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || '(없음)');
console.log('develop URL:', API_URLS.develop);
console.log('production URL:', API_URLS.production);

if (appEnv === 'production' && !apiBaseUrl.includes('cucumber-production')) {
  console.warn('⚠️  production 빌드인데 production Railway URL이 아닙니다.');
  process.exit(1);
}
if (appEnv === 'development' && !apiBaseUrl.includes('cucumber-develop')) {
  console.warn('⚠️  develop 빌드인데 develop Railway URL이 아닙니다.');
  process.exit(1);
}

console.log('✓ URL 일치');
