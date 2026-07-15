import { Platform } from 'react-native';

/** Play Console / requireMinAppVersion 기본과 동일 */
export const ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ucost.YouthPaper';

/**
 * App Store 공개 URL
 * https://apps.apple.com/app/id6770454607
 */
export const IOS_STORE_URL =
  'https://apps.apple.com/app/id6770454607';

export function getStoreUrlForPlatform(platform = Platform.OS) {
  if (platform === 'ios') {
    return IOS_STORE_URL || ANDROID_STORE_URL;
  }
  return ANDROID_STORE_URL;
}

/** 앱 linking: youthpaper://board/:postId */
export function buildPostDeepLink(postId) {
  const id = encodeURIComponent(String(postId));
  return `youthpaper://board/${id}`;
}

export function buildPostShareContent(postId) {
  const deepLink = buildPostDeepLink(postId);
  const installLines = `앱이 없다면 설치해 주세요.\n· Android: ${ANDROID_STORE_URL}\n· iOS: ${IOS_STORE_URL}`;

  return {
    title: 'Youth Paper 게시글',
    message: `Youth Paper 게시글을 공유합니다.\n\n앱에서 열기: ${deepLink}\n\n${installLines}`,
    url: deepLink,
  };
}
