/**
 * 로컬 Xcode Archive → IPA (클라우드 EAS 카운트 없음)
 *
 * 사용:
 *   npm run ios:ipa:prod
 *   npm run ios:ipa:prod -- --upload
 *   IOS_BUILD_NUMBER=31 npm run ios:ipa:prod
 *
 * 산출물:
 *   front/build/ios/YouthPaper.xcarchive
 *   front/build/ios/ipa/*.ipa
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from '@expo/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
load(root);

const TEAM_ID = process.env.IOS_TEAM_ID || 'J7QWZFS9HR';
const SCHEME = process.env.IOS_SCHEME || 'YouthPaper';
const WORKSPACE = path.join(root, 'ios', 'YouthPaper.xcworkspace');
const OUT_DIR = path.join(root, 'build', 'ios');
const ARCHIVE_PATH = path.join(OUT_DIR, 'YouthPaper.xcarchive');
const EXPORT_DIR = path.join(OUT_DIR, 'ipa');
const EXPORT_PLIST = path.join(OUT_DIR, 'ExportOptions.plist');

const args = process.argv.slice(2);
const wantUpload = args.includes('--upload');
const skipPod = args.includes('--skip-pod');
const buildNumberArg = (() => {
  const i = args.indexOf('--build-number');
  if (i >= 0 && args[i + 1]) return String(args[i + 1]).trim();
  return (process.env.IOS_BUILD_NUMBER || '').trim();
})();
const marketingVersionArg = (() => {
  const i = args.indexOf('--version');
  if (i >= 0 && args[i + 1]) return String(args[i + 1]).trim();
  return (process.env.IOS_VERSION || '').trim();
})();

function fail(msg) {
  console.error(`[ipa] FAIL: ${msg}`);
  process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
  console.log(`[ipa] $ ${cmd} ${cmdArgs.join(' ')}`);
  const result = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd || root,
    env: opts.env || process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    fail(`${cmd} 실패 (exit ${result.status ?? 'null'})`);
  }
  return result;
}

function assertMac() {
  if (process.platform !== 'darwin') {
    fail('macOS + Xcode 에서만 실행할 수 있습니다.');
  }
}

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

  console.log('[ipa] EXPO_PUBLIC_INICIS_ENABLED=', inicis || '(unset)');
  console.log('[ipa] EXPO_PUBLIC_SIGNUP_TEST_MODE=', signupTest || '(unset)');
  console.log(
    '[ipa] EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=',
    adultTest || '(unset)',
  );

  if (inicis !== 'true') {
    fail(
      'EXPO_PUBLIC_INICIS_ENABLED must be "true".\n' +
        '  Fix: npm run ios:ipa:prod / .env.production',
    );
  }
  if (signupTest === 'true') {
    fail('EXPO_PUBLIC_SIGNUP_TEST_MODE must not be "true" for store IPA.');
  }
  if (adultTest === 'true') {
    fail(
      'EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE must be false/unset for store IPA.',
    );
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeExportOptions() {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>export</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
  <key>stripSwiftSymbols</key>
  <true/>
</dict>
</plist>
`;
  fs.writeFileSync(EXPORT_PLIST, plist, 'utf8');
  console.log(`[ipa] ExportOptions → ${EXPORT_PLIST}`);
}

function setPlistValue(plistPath, key, value) {
  if (!fs.existsSync(plistPath)) return false;
  run('/usr/libexec/PlistBuddy', [
    '-c',
    `Set :${key} ${value}`,
    plistPath,
  ]);
  return true;
}

function getPlistValue(plistPath, key) {
  if (!fs.existsSync(plistPath)) return '';
  const r = spawnSync(
    '/usr/libexec/PlistBuddy',
    ['-c', `Print :${key}`, plistPath],
    { encoding: 'utf8' },
  );
  return (r.stdout || '').trim();
}

function syncPbxprojVersions(marketing, build) {
  const pbx = path.join(root, 'ios', 'YouthPaper.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(pbx)) return;
  let text = fs.readFileSync(pbx, 'utf8');
  if (marketing) {
    text = text.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${marketing};`,
    );
  }
  if (build) {
    text = text.replace(
      /CURRENT_PROJECT_VERSION = [^;]+;/g,
      `CURRENT_PROJECT_VERSION = ${build};`,
    );
  }
  fs.writeFileSync(pbx, text);
  console.log('[ipa] project.pbxproj MARKETING/CURRENT 동기화');
}

/** 메인 앱·위젯 확장 Version/Build 를 반드시 동일하게 맞춤 (ASC 90473 방지) */
function maybeBumpVersions() {
  const appPlist = path.join(root, 'ios', 'YouthPaper', 'Info.plist');
  const widgetPlist = path.join(
    root,
    'ios',
    'YouthPaperWidgets',
    'Info.plist',
  );

  const marketing =
    marketingVersionArg ||
    getPlistValue(appPlist, 'CFBundleShortVersionString') ||
    '1.5.16';
  const build = buildNumberArg || getPlistValue(appPlist, 'CFBundleVersion');

  console.log(`[ipa] Version(동기화) → ${marketing}`);
  setPlistValue(appPlist, 'CFBundleShortVersionString', marketing);
  setPlistValue(widgetPlist, 'CFBundleShortVersionString', marketing);

  if (build) {
    console.log(`[ipa] Build(동기화) → ${build}`);
    setPlistValue(appPlist, 'CFBundleVersion', build);
    setPlistValue(widgetPlist, 'CFBundleVersion', build);
  } else {
    console.warn(
      '[ipa] WARN: IOS_BUILD_NUMBER / --build-number 없음.\n' +
        '  App Store Connect에 이미 올린 빌드보다 큰 번호인지 확인하세요.',
    );
  }

  syncPbxprojVersions(marketing, build || undefined);

  return { marketing, build };
}

function findIpa() {
  if (!fs.existsSync(EXPORT_DIR)) return null;
  const files = fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith('.ipa'))
    .map((f) => path.join(EXPORT_DIR, f));
  return files[0] || null;
}

function uploadIpa(ipaPath) {
  const apiKey = (process.env.ASC_API_KEY_ID || '').trim();
  const apiIssuer = (process.env.ASC_API_ISSUER || '').trim();
  if (!apiKey || !apiIssuer) {
    fail(
      '--upload 에는 ASC_API_KEY_ID + ASC_API_ISSUER 환경변수가 필요합니다.\n' +
        '  App Store Connect → Users and Access → Integrations → App Store Connect API\n' +
        '  .p8 키는 ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8',
    );
  }

  console.log('[ipa] App Store Connect 업로드 중…');
  run('xcrun', [
    'altool',
    '--upload-app',
    '--type',
    'ios',
    '-f',
    ipaPath,
    '--apiKey',
    apiKey,
    '--apiIssuer',
    apiIssuer,
  ]);
}

assertMac();

if (!fs.existsSync(WORKSPACE)) {
  fail(
    `ios 워크스페이스 없음: ${WORKSPACE}\n` +
      '  front/ios 가 있는지 확인하세요. (prebuild --clean 은 위젯 설정이 날아갈 수 있음)',
  );
}

const env = {
  ...process.env,
  APP_ENV: process.env.APP_ENV || 'production',
  NODE_ENV: process.env.NODE_ENV || 'production',
  EXPO_PUBLIC_SIGNUP_TEST_MODE:
    process.env.EXPO_PUBLIC_SIGNUP_TEST_MODE || 'false',
  EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE:
    process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || 'false',
  EXPO_PUBLIC_INICIS_ENABLED:
    process.env.EXPO_PUBLIC_INICIS_ENABLED || 'true',
};

console.log(`[ipa] APP_ENV=${env.APP_ENV} NODE_ENV=${env.NODE_ENV}`);
assertStoreClientFlags(env);

ensureDir(OUT_DIR);
ensureDir(EXPORT_DIR);
writeExportOptions();
const { marketing, build } = maybeBumpVersions();

if (!skipPod) {
  console.log('[ipa] pod install …');
  run('pod', ['install'], { cwd: path.join(root, 'ios'), env });
}

console.log('[ipa] Archive …');
const archiveArgs = [
  '-workspace',
  WORKSPACE,
  '-scheme',
  SCHEME,
  '-configuration',
  'Release',
  '-destination',
  'generic/platform=iOS',
  '-archivePath',
  ARCHIVE_PATH,
  'archive',
  'DEVELOPMENT_TEAM=' + TEAM_ID,
];
if (marketing) archiveArgs.push(`MARKETING_VERSION=${marketing}`);
if (build) archiveArgs.push(`CURRENT_PROJECT_VERSION=${build}`);
run('xcodebuild', archiveArgs, { env });

console.log('[ipa] Export IPA …');
run(
  'xcodebuild',
  [
    '-exportArchive',
    '-archivePath',
    ARCHIVE_PATH,
    '-exportPath',
    EXPORT_DIR,
    '-exportOptionsPlist',
    EXPORT_PLIST,
    '-allowProvisioningUpdates',
  ],
  { env },
);

const ipa = findIpa();
if (!ipa) {
  fail(`IPA를 찾지 못했습니다: ${EXPORT_DIR}`);
}

console.log(`[ipa] 완료 → ${ipa}`);
console.log('[ipa] (클라우드 EAS 카운트 미사용 · 로컬 Xcode Archive)');

if (wantUpload) {
  uploadIpa(ipa);
  console.log('[ipa] 업로드 요청 완료. TestFlight 처리 대기하세요.');
} else {
  console.log(
    '[ipa] 업로드하려면: npm run ios:ipa:upload\n' +
      '  또는 Transporter / Xcode Organizer 로 수동 업로드',
  );
}
