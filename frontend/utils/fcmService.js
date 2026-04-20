// TEMP(expo-go): Firebase Messaging은 네이티브 빌드에서만 사용
// import messaging from '@react-native-firebase/messaging';
// import { api } from './api';
// import { ensureFirebaseApp } from './firebaseApp';

export const getFCMToken = async () => {
  try {
    return null;
  } catch (e) {
    console.error('[FCM] getFCMToken 실패:', e);
    return null;
  }
};

export const initFCM = async () => {
  try {
    return null;
  } catch (e) {
    console.error('[FCM] initFCM 실패:', e);
    return null;
  }
};

export const setupFCMHandlers = () => {
  return () => {};
};
