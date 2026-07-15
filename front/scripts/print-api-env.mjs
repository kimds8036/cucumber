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

function flagLabel(raw) {
  const v = String(raw || '')
    .toLowerCase()
    .trim();
  if (v === 'true') return '켜짐(ON)';
  if (v === 'false') return '꺼짐(OFF)';
  return '설정 안 됨 → 코드 기본값 사용';
}

function printClientFlag({ name, raw, onMeaning, offMeaning, storeWant }) {
  console.log('');
  console.log(`▶ ${name}`);
  console.log(`  현재 값: ${raw || '(없음)'}  →  ${flagLabel(raw)}`);
  console.log(`  켜짐(true): ${onMeaning}`);
  console.log(`  꺼짐(false)/미설정: ${offMeaning}`);
  if (storeWant) {
    console.log(`  스토어(AAB) 권장: ${storeWant}`);
  }
}

// EXPO_PUBLIC_* 는 빌드할 때 앱 안에 박힘 (나중에 Railway만 바꿔도 이미 만든 AAB는 안 바뀜)
console.log('');
console.log('========== 앱 기능 스위치 (비전공자용 요약) ==========');
console.log('이 값들은 「앱을 빌드하는 순간」에 들어갑니다.');
console.log('이미 만든 AAB/설치 파일은 다시 빌드해야 바뀝니다.');

const inicis = process.env.EXPO_PUBLIC_INICIS_ENABLED;
const signupTest = process.env.EXPO_PUBLIC_SIGNUP_TEST_MODE;
const adultTest = process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE;

printClientFlag({
  name: '본인인증(KG 이니시스) — EXPO_PUBLIC_INICIS_ENABLED',
  raw: inicis,
  onMeaning: '실제 이니시스 인증 화면이 열림 (정상 가입)',
  offMeaning:
    '「테스트 mock」으로 가짜 인증 통과 — 스토어에 올리면 치명적',
  storeWant: '반드시 켜짐(true)',
});

printClientFlag({
  name: '가입 단계 스킵(테스트) — EXPO_PUBLIC_SIGNUP_TEST_MODE',
  raw: signupTest,
  onMeaning: '생년월일·이니시스 등을 건너뛰고 테스트용으로만 진행 (개발용)',
  offMeaning: '가입을 처음부터 끝까지 정상 진행',
  storeWant: '반드시 꺼짐(false)',
});

printClientFlag({
  name: '성인 생년월일 허용(팀 테스트) — EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE',
  raw: adultTest,
  onMeaning: '성인 생년월일로도 가입 화면 진행 가능 (개발/내부 테스트용)',
  offMeaning: '중·고등학생 연령만 가입 (정식)',
  storeWant: '반드시 꺼짐(false)',
});

console.log('');
console.log('--- 서버(Railway)와의 관계 ---');
console.log(
  '앱 이니시스 스위치(위)와 Railway의 INICIS_ENABLED 는 별개입니다.',
);
console.log(
  '· 앱 OFF → 「테스트 mock」 (서버를 안 봄)',
);
console.log(
  '· 앱 ON + 서버 OFF → 「본인인증 서버에 연결할 수 없습니다」',
);
console.log('· 둘 다 ON → 실제 KG 이니시스');

if (appEnv === 'production') {
  console.log('');
  console.log('※ 스토어 AAB: npm run android:aab:prod 가 위 스위치를 직접 넣습니다.');
  console.log(
    '※ 상세: front/docs/빌드_EXPO_PUBLIC_체크리스트.md',
  );
}
console.log('======================================================');
