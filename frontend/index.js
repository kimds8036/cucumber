import { registerRootComponent } from 'expo';
// TEMP(expo-go): Firebase Messaging은 네이티브 빌드에서만 사용
// import messaging from '@react-native-firebase/messaging';

import App from './App';

// TEMP(expo-go): 네이티브 모듈 필요 코드 임시 비활성화
// messaging().setBackgroundMessageHandler(async (remoteMessage) => {
//   console.log('[FCM] 백그라운드 메시지:', remoteMessage);
// });

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
