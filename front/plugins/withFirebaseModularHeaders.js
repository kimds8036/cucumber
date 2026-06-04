const { withPodfile } = require('@expo/config-plugins');

module.exports = function withFirebaseModularHeaders(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;

    if (podfile.includes('RNFirebaseAsStaticFramework')) {
      return config;
    }

    config.modResults.contents = podfile.replace(
      /(platform :ios,[^\n]*\n)/,
      `$1$RNFirebaseAsStaticFramework = true\n`
    );

    return config;
  });
};