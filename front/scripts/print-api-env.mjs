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
const { resolveApiBaseUrl, resolveAppEnv, API_URLS } = await import(
  apiEnvModule
);

const appEnv = resolveAppEnv();
const apiBaseUrl = resolveApiBaseUrl();

console.log('--- API 환경 (빌드 시 app.config.js와 동일 규칙) ---');
console.log('APP_ENV (resolved):', appEnv);
console.log('apiBaseUrl:', apiBaseUrl);
console.log(
  'EXPO_PUBLIC_API_URL:',
  process.env.EXPO_PUBLIC_API_URL || '(없음)',
);
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

// EXPO_PUBLIC_* 안내 (번들에 인라인 — 스크립트·eas.json·.env 와 일치 필요)
console.log('--- EXPO_PUBLIC 클라이언트 플래그 (참고) ---');
const pub = (k) => process.env[k] || '(unset)';
console.log('EXPO_PUBLIC_INICIS_ENABLED:', pub('EXPO_PUBLIC_INICIS_ENABLED'));
console.log('EXPO_PUBLIC_SIGNUP_TEST_MODE:', pub('EXPO_PUBLIC_SIGNUP_TEST_MODE'));
console.log(
  'EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE:',
  pub('EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE'),
);
if (appEnv === 'production') {
  console.log(
    '※ AAB는 package.json android:aab:prod 가 EXPO_PUBLIC_* 를 명시해야 함.',
  );
  console.log(
    '※ Railway INICIS_ENABLED 는 서버 플래그(별개). 앱 mock 문구는 보통 클라이언트 OFF.',
  );
}
