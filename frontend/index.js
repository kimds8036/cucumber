import { registerRootComponent } from 'expo';
// TEMP(expo-go): Firebase 네이티브 모듈 비활성화
// import messaging from '@react-native-firebase/messaging';
// import { ensureFirebaseApp } from './utils/firebaseApp';

import App from './App';

// TEMP(expo-go): Firebase 백그라운드 핸들러 임시 비활성화
// try {
//   ensureFirebaseApp();
//   messaging().setBackgroundMessageHandler(async (remoteMessage) => {
//     console.log('[FCM] 백그라운드 메시지:', remoteMessage);
//   });
// } catch (e) {
//   console.error('[FCM] Firebase App 초기화 실패:', e);
// }

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
