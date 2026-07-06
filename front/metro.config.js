const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('./metro.transformer.js');
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg',
);
config.resolver.sourceExts.push('svg', 'md');

module.exports = config;
