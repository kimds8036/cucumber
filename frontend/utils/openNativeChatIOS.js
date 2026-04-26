import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrlNoSlash } from './api';

const AUTH_TOKEN_KEY = '@auth_token';
const { CucumberNativeChat } = NativeModules;

export async function openNativeChatIOS({
  roomId,
  title = '',
  subtitle = '',
  chatChannel = 'messages',
  myUserId = '',
} = {}) {
  console.log('[NativeChat][iOS] open called', { roomId, chatChannel });
  console.log('[NativeChat][iOS] CucumberNativeChat exists?', !!NativeModules?.CucumberNativeChat);
  console.log('[NativeChat][iOS] CucumberNativeChat has open?', !!CucumberNativeChat?.open);
  if (Platform.OS !== 'ios') return false;
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
      myUserId: myUserId != null && myUserId !== '' ? String(myUserId) : '',
    });
    console.log('[NativeChat][iOS] open success', { roomId, chatChannel });
    return true;
  } catch (error) {
    console.log('[NativeChat][iOS] open failed', { roomId, chatChannel, error: String(error) });
    return false;
  }
}
