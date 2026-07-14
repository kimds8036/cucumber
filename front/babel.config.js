/**
 * 프로덕션(AAB/release) 빌드에서 console.* 호출 제거.
 * APP_ENV=production 또는 NODE_ENV=production 일 때 적용.
 */
module.exports = function babelConfig(api) {
  api.cache(true);
  const stripConsole =
    process.env.APP_ENV === 'production' ||
    process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: stripConsole
      ? ['transform-remove-console']
      : [],
  };
};
