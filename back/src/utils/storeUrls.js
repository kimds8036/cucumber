/** Play / App Store 공개 URL — version-check · 광고 랜딩 공통 */

export const DEFAULT_ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ucost.YouthPaper';

export const DEFAULT_IOS_STORE_URL =
  'https://apps.apple.com/app/id6770454607';

/**
 * @param {'ios'|'android'|string} platform
 * @returns {string}
 */
export function resolveStoreUrl(platform) {
  if (String(platform || '').toLowerCase() === 'ios') {
    return String(process.env.IOS_STORE_URL || DEFAULT_IOS_STORE_URL).trim();
  }
  return String(
    process.env.ANDROID_STORE_URL || DEFAULT_ANDROID_STORE_URL,
  ).trim();
}
