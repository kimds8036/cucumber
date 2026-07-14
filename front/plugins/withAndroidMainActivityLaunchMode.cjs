const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

/** youthpaper:// 딥링크 시 MainActivity 재생성(cold start) 완화 */
function withAndroidMainActivityLaunchMode(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app?.activity) return cfg;

    for (const activity of app.activity) {
      const name = activity.$?.['android:name'] || '';
      if (name.endsWith('.MainActivity') || name === 'MainActivity') {
        activity.$['android:launchMode'] = 'singleTask';
      }
    }
    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withAndroidMainActivityLaunchMode,
  'withAndroidMainActivityLaunchMode',
);
