import { registerRootComponent } from 'expo';
import { ensureFirebaseApp } from './utils/firebaseApp';

import App from './App';

// AppRegistry 등록 이전에 백그라운드 핸들러를 등록해야 한다.
try {
  ensureFirebaseApp();
  const messagingModule = require('@react-native-firebase/messaging');
  const messaging = messagingModule?.default?.();
  messaging?.setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] 백그라운드/종료 상태 메시지 수신:', remoteMessage);
  });
} catch (e) {
  console.error('[FCM] Firebase 백그라운드 핸들러 등록 실패:', e);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
