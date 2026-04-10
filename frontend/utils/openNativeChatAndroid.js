import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrlNoSlash } from './api';

const AUTH_TOKEN_KEY = '@auth_token';

const { CucumberNativeChat } = NativeModules;

/**
 * Android에서만 네이티브 [ChatLauncherActivity]를 연다.
 * @returns {Promise<boolean>} 성공 시 true (호출 후 보통 navigation.goBack으로 스택 정리)
 */
export async function openNativeChatAndroid({
  roomId,
  title = '',
  subtitle = '',
  chatChannel = 'messages',
  myUserId = '',
} = {}) {
  if (Platform.OS !== 'android') return false;
  if (!roomId || !CucumberNativeChat?.open) return false;

  let token;
  try {
    token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    token = null;
  }
  if (!token) return false;

  const baseUrl = getApiBaseUrlNoSlash();

  try {
    await CucumberNativeChat.open({
      roomId: String(roomId),
      accessToken: String(token),
      baseUrl: String(baseUrl ?? ''),
      socketUrl: String(baseUrl ?? ''),
      title: String(title ?? ''),
      subtitle: String(subtitle ?? ''),
      chatChannel: String(chatChannel ?? ''),
      myUserId:
        myUserId != null && myUserId !== '' ? String(myUserId) : '',
    });
    return true;
  } catch {
    return false;
  }
}
