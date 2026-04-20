import { getApp, initializeApp } from '@react-native-firebase/app';

const FALLBACK_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDb6pigk8H75Tz_j9YWMWlF0piu6LHEI9Y',
  appId: '1:717250057310:android:f53c8492e3753d533290cf',
  projectId: 'cucumber-bf4b4',
  messagingSenderId: '717250057310',
  storageBucket: 'cucumber-bf4b4.firebasestorage.app',
};

export function ensureFirebaseApp() {
  try {
    return getApp();
  } catch (e) {
    try {
      return initializeApp(FALLBACK_FIREBASE_CONFIG);
    } catch (initError) {
      try {
        return getApp();
      } catch {
        throw initError;
      }
    }
  }
}
