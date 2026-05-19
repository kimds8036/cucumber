const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, 'credentials.json');

function loadKeystoreCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const k = raw?.android?.keystore;
    if (!k?.keystorePath || !k?.keystorePassword || !k?.keyAlias || !k?.keyPassword) {
      return null;
    }
    const keystorePath = path.isAbsolute(k.keystorePath)
      ? k.keystorePath
      : path.resolve(PROJECT_ROOT, k.keystorePath);
    if (!fs.existsSync(keystorePath)) {
      console.warn(
        `[withAndroidReleaseSigning] keystore 파일 없음: ${keystorePath}\n` +
          '  → npm run credentials:android 로 EAS에서 다운로드하세요.'
      );
      return null;
    }
    return {
      keystorePath: keystorePath.replace(/\\/g, '/'),
      storePassword: String(k.keystorePassword),
      keyAlias: String(k.keyAlias),
      keyPassword: String(k.keyPassword),
    };
  } catch (e) {
    console.warn('[withAndroidReleaseSigning] credentials.json 읽기 실패:', e?.message ?? e);
    return null;
  }
}

function escapeGradleString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** prebuild 시 credentials.json 업로드 키로 release 서명 주입 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    const cred = loadKeystoreCredentials();
    if (!cred) {
      return mod;
    }

    let contents = mod.modResults.contents;

    if (!contents.includes('signingConfigs.release')) {
      const releaseSigning = `
        release {
            storeFile file("${escapeGradleString(cred.keystorePath)}")
            storePassword "${escapeGradleString(cred.storePassword)}"
            keyAlias "${escapeGradleString(cred.keyAlias)}"
            keyPassword "${escapeGradleString(cred.keyPassword)}"
        }`;

      contents = contents.replace(
        /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n        \}\n)(    \}\n    buildTypes)/,
        `$1${releaseSigning}\n$2`
      );
    }

    // buildTypes.release 만 교체 (signingConfigs.release 와 혼동하지 않음)
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );

    console.log('[withAndroidReleaseSigning] release 서명 적용:', cred.keystorePath);
    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withAndroidReleaseSigning;
