import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeInviteCode } from '../constants/badges';

export const INVITE_CODE_STORAGE_KEY = '@youthpaper_pending_invite_code';

export function parseInviteCodeFromUrl(url) {
  if (!url) return '';
  try {
    const rawUrl = String(url);
    const query = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
    const params = new URLSearchParams(query.replace(/#.*$/, ''));
    return sanitizeInviteCode(params.get('ref') || params.get('invite') || '');
  } catch {
    return '';
  }
}

export async function persistInviteCodeFromUrl(url) {
  const code = parseInviteCodeFromUrl(url);
  if (!code) return '';
  await AsyncStorage.setItem(INVITE_CODE_STORAGE_KEY, code);
  return code;
}

export async function peekPendingInviteCode() {
  try {
    const raw = await AsyncStorage.getItem(INVITE_CODE_STORAGE_KEY);
    return sanitizeInviteCode(raw);
  } catch {
    return '';
  }
}

export async function consumePendingInviteCode() {
  const code = await peekPendingInviteCode();
  if (code) {
    await AsyncStorage.removeItem(INVITE_CODE_STORAGE_KEY);
  }
  return code;
}
