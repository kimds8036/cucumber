const {
  withAppBuildGradle,
  withGradleProperties,
} = require('@expo/config-plugins');

/**
 * AAB(bundleRelease) 시 lintVital Metaspace OOM 완화
 * - Gradle JVM 힙·Metaspace 확대
 * - app release lint 검사 비활성 (스토어 AAB 관행)
 */
function withAndroidAabLintMemory(config) {
  config = withGradleProperties(config, (mod) => {
    const key = 'org.gradle.jvmargs';
    const value =
      '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';
    const props = mod.modResults;
    const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
    if (idx >= 0) {
      props[idx].value = value;
    } else {
      props.push({ type: 'property', key, value });
    }
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes('checkReleaseBuilds false')) {
      return mod;
    }
    if (/android\s*\{/.test(contents) && !/lint\s*\{/.test(contents)) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
`,
      );
      mod.modResults.contents = contents;
    }
    return mod;
  });

  return config;
}

module.exports = withAndroidAabLintMemory;
