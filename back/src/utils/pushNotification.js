import { getMessaging } from '../config/firebase.js';
import {
  deactivateFcmTokens,
  getUnreadNotificationBadge,
  getUserFcmTokens,
} from './pushTokens.js';

export async function sendPush({ userId, title, body, data = {} }) {
  try {
    const tokens = await getUserFcmTokens(userId);
    if (!tokens.length) {
      console.warn(`[FCM] 발송 스킵 userId=${userId}: 저장된 토큰이 없습니다.`);
      return false;
    }

    const messaging = getMessaging();
    if (!messaging) {
      console.warn(`[FCM] 발송 스킵 userId=${userId}: Firebase messaging 초기화 실패`);
      return false;
    }

    const badge = await getUnreadNotificationBadge(userId);
    console.log(`[FCM] 발송 시도 userId=${userId} tokenCount=${tokens.length}`);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [String(k), String(v)]),
      ),
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            badge,
            sound: 'default',
            'mutable-content': 1,
          },
        },
      },
    });

    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((item, idx) => {
        if (item.success) return;
        const code = item.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });
      if (invalidTokens.length) {
        const deactivated = await deactivateFcmTokens(invalidTokens);
        console.warn(
          `[FCM] 무효 토큰 비활성화 userId=${userId} count=${deactivated}`,
        );
      }
    }

    console.log(
      `[FCM] 발송 완료 userId=${userId} success=${response.successCount} fail=${response.failureCount}`,
    );
    return response.successCount > 0;
  } catch (e) {
    console.error(`[FCM] 발송 실패 userId=${userId}`, {
      code: e?.code || null,
      errorInfo: e?.errorInfo || null,
      message: e?.message || null,
      stack: e?.stack || null,
    });
    return false;
  }
}
