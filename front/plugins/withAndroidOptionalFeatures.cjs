const { withAndroidManifest } = require('@expo/config-plugins');

// 라이브러리가 암묵적으로 "필수"로 만드는 하드웨어 기능을 선택사항으로 표시한다.
// - android.hardware.wifi: netinfo 의 ACCESS_WIFI_STATE 권한 때문에 필수로 간주됨
// - android.hardware.screen.portrait: ML Kit 바코드 스캐너 액티비티가 세로 고정이라 필수로 간주됨
// Play Console "필수 하드웨어 기능 선언으로 인해 앱의 사용 가능 여부가 제한됨" 경고 대응.
const OPTIONAL_FEATURES = [
  'android.hardware.wifi',
  'android.hardware.screen.portrait',
];

module.exports = function withAndroidOptionalFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest['uses-feature'].find(
        (f) => f.$ && f.$['android:name'] === name,
      );
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        manifest['uses-feature'].push({
          $: { 'android:name': name, 'android:required': 'false' },
        });
      }
    }
    return cfg;
  });
};
