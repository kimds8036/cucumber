import { isVersionBelow } from '../utils/semver.js';
import { getAdminBasePath } from '../config/adminPath.js';

const DEFAULT_ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ucost.YouthPaper';

function getWhitelistPrefixes() {
  return [
    '/health',
    '/api/app/version-check',
    '/api/legal',
    getAdminBasePath(),
    '/api-docs',
    '/api/auth/signup',
    '/api/auth/check-phone-available',
    '/api/auth/verify-firebase-phone',
    '/api/auth/recovery/',
    '/api/auth/login',
  ];
}

function isWhitelisted(path) {
  return getWhitelistPrefixes().some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix),
  );
}

function resolveMinVersion(platform) {
  if (platform === 'ios') {
    return process.env.MIN_IOS_VERSION || process.env.MIN_APP_VERSION || '1.0.0';
  }
  return process.env.MIN_ANDROID_VERSION || process.env.MIN_APP_VERSION || '1.0.0';
}

function resolveStoreUrl(platform) {
  if (platform === 'ios') {
    return process.env.IOS_STORE_URL || DEFAULT_ANDROID_STORE_URL;
  }
  return process.env.ANDROID_STORE_URL || DEFAULT_ANDROID_STORE_URL;
}

/**
 * App-Version 헤더가 있을 때만 최소 버전 검사 (방법 A).
 * 헤더 없음 → 통과 (관리자 웹·구버전 클라이언트 호환).
 */
export function requireMinAppVersion(req, res, next) {
  if (process.env.ENABLE_APP_VERSION_MIDDLEWARE === 'false') {
    return next();
  }

  const path = req.path || req.url?.split('?')[0] || '';
  if (!path.startsWith('/api') || isWhitelisted(path)) {
    return next();
  }

  const clientVersion = String(req.headers['app-version'] || '').trim();
  if (!clientVersion) {
    return next();
  }

  const platform = String(req.headers['app-platform'] || 'android')
    .trim()
    .toLowerCase();
  const minVersion = resolveMinVersion(platform);

  if (!isVersionBelow(clientVersion, minVersion)) {
    return next();
  }

  return res.status(426).json({
    success: false,
    code: 'UPGRADE_REQUIRED',
    message: '앱 업데이트가 필요합니다. 스토어에서 최신 버전으로 업데이트해 주세요.',
    data: {
      minVersion,
      clientVersion,
      platform,
      storeUrl: resolveStoreUrl(platform),
    },
  });
}
