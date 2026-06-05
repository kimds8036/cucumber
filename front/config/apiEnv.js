/** Railway API — 브랜치와 무관, 빌드·실행 환경(APP_ENV / EAS 프로필)으로만 분기 */
export const API_URLS = {
  develop: 'https://cucumber-develop.up.railway.app',
  production: 'https://cucumber-production.up.railway.app',
};

/**
 * @returns {'development' | 'production'}
 */
export function resolveAppEnv(env = process.env) {
  const appEnv = (env.APP_ENV || env.EXPO_PUBLIC_APP_ENV || '')
    .trim()
    .toLowerCase();
  if (appEnv === 'production' || appEnv === 'prod') return 'production';
  if (appEnv === 'development' || appEnv === 'develop' || appEnv === 'dev') {
    return 'development';
  }

  const easProfile = (env.EAS_BUILD_PROFILE || '').trim().toLowerCase();
  if (easProfile === 'production') return 'production';

  if (env.NODE_ENV === 'production') return 'production';

  return 'development';
}

/**
 * @returns {string} 슬래시 없는 base URL
 */
export function resolveApiBaseUrl(env = process.env) {
  const explicit =
    typeof env.EXPO_PUBLIC_API_URL === 'string'
      ? env.EXPO_PUBLIC_API_URL.trim()
      : '';
  if (explicit) return explicit.replace(/\/+$/, '');

  return resolveAppEnv(env) === 'production'
    ? API_URLS.production
    : API_URLS.develop;
}
