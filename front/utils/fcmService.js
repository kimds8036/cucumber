import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import { ensureFirebaseApp } from './firebaseApp';
import { getDeviceId } from './deviceId';

function loadMessaging() {
  try {
    const messagingMod = require('@react-native-firebase/messaging');
    const { getApp } = require('@react-native-firebase/app');
    const messaging = messagingMod.getMessaging(getApp());
    return { messaging, messagingMod };
  } catch (error) {
    console.warn(
      '[FCM] messaging 모듈을 불러오지 못했습니다:',
      error?.message || error,
    );
    return null;
  }
}

async function uploadFCMToken(token) {
  if (!token) return;
  try {
    const deviceId = await getDeviceId();
    const appVersion =
      Constants.expoConfig?.version || Constants.nativeAppVersion || null;
    await api.post('/api/users/fcm-token', {
      token,
      deviceId,
      deviceType: Platform.OS,
      appVersion,
    });
  } catch (error) {
    console.error(
      '[FCM] 서버 토큰 저장 실패:',
      error?.response?.data || error?.message || error,
    );
  }
}

export const getFCMToken = async () => {
  try {
    ensureFirebaseApp();
    const loaded = loadMessaging();
    if (!loaded) return null;

    await loaded.messagingMod.registerDeviceForRemoteMessages(loaded.messaging);
    const token = await loaded.messagingMod.getToken(loaded.messaging);
    return token || null;
  } catch (e) {
    console.error('[FCM] getFCMToken 실패:', e);
    return null;
  }
};

export const initFCM = async () => {
  try {
    ensureFirebaseApp();
    const token = await getFCMToken();
    if (token) {
      await uploadFCMToken(token);
    }
    return token;
  } catch (e) {
    console.error('[FCM] initFCM 실패:', e);
    return null;
  }
};

export const setupFCMHandlers = (options = {}) => {
  const loaded = loadMessaging();
  if (!loaded) return () => {};
  const { messaging, messagingMod } = loaded;

  const onForegroundMessage =
    typeof options.onForegroundMessage === 'function'
      ? options.onForegroundMessage
      : null;
  const onNotificationOpened =
    typeof options.onNotificationOpened === 'function'
      ? options.onNotificationOpened
      : null;

  const unsubscribeOnMessage = messagingMod.onMessage(
    messaging,
    async (remoteMessage) => {
      console.log('[FCM] 포그라운드 메시지 수신:', remoteMessage);
      onForegroundMessage?.(remoteMessage);
    },
  );

  const unsubscribeOnOpened = messagingMod.onNotificationOpenedApp(
    messaging,
    (remoteMessage) => {
      console.log(
        '[FCM] 알림 탭으로 앱 오픈(onNotificationOpenedApp):',
        remoteMessage,
      );
      onNotificationOpened?.(remoteMessage);
    },
  );

  const unsubscribeTokenRefresh = messagingMod.onTokenRefresh(
    messaging,
    async (token) => {
      console.log('[FCM] 토큰 갱신 이벤트');
      await uploadFCMToken(token);
    },
  );

  return () => {
    try {
      unsubscribeOnMessage?.();
      unsubscribeOnOpened?.();
      unsubscribeTokenRefresh?.();
    } catch {
      // no-op
    }
  };
};

export const getInitialFCMNotification = async () => {
  try {
    const loaded = loadMessaging();
    if (!loaded) return null;
    return await loaded.messagingMod.getInitialNotification(loaded.messaging);
  } catch (error) {
    console.error('[FCM] getInitialNotification 실패:', error);
    return null;
  }
};
