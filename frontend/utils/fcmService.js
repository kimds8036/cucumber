import messaging from '@react-native-firebase/messaging';
import { api } from './api';

export const getFCMToken = async () => {
  try {
    return await messaging().getToken();
  } catch (e) {
    console.error('[FCM] getFCMToken 실패:', e);
    return null;
  }
};

export const initFCM = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const token = await messaging().getToken();
    await api.post('/api/users/fcm-token', { token });
    return token;
  } catch (e) {
    console.error('[FCM] initFCM 실패:', e);
    return null;
  }
};

export const setupFCMHandlers = () => {
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] 포그라운드 알림:', remoteMessage);
  });

  const unsubscribeRefresh = messaging().onTokenRefresh(async (newToken) => {
    try {
      await api.post('/api/users/fcm-token', { token: newToken });
    } catch (e) {
      console.error('[FCM] 토큰 갱신 전송 실패:', e);
    }
  });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] 백그라운드 알림 탭:', remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[FCM] 종료 상태 알림 탭:', remoteMessage);
      }
    })
    .catch((e) => {
      console.error('[FCM] getInitialNotification 실패:', e);
    });

  return () => {
    unsubscribeForeground();
    unsubscribeRefresh();
  };
};
