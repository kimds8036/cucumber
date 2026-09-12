/**
 * 스토어 인앱 리뷰 / 스토어 페이지 폴백
 */
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { getStoreUrlForPlatform } from './shareLinks';

const STORAGE_KEY = '@youthpaper/store_review_meta_v1';
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

async function readMeta() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastAskedAt: 0, declined: false };
    const parsed = JSON.parse(raw);
    return {
      lastAskedAt: Number(parsed?.lastAskedAt) || 0,
      declined: Boolean(parsed?.declined),
    };
  } catch {
    return { lastAskedAt: 0, declined: false };
  }
}

async function writeMeta(patch) {
  const prev = await readMeta();
  const next = { ...prev, ...patch };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function openStoreListing() {
  const url = getStoreUrlForPlatform(Platform.OS);
  try {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
    else await Linking.openURL(url);
  } catch {
    /* ignore */
  }
}

/**
 * 마이페이지 등 수동: 인앱 리뷰 시도 → 불가 시 스토어 열기
 * @returns {'in_app'|'store'|'unavailable'}
 */
export async function requestAppReview({ openStoreFallback = true } = {}) {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      const hasAction = await StoreReview.hasAction();
      if (hasAction) {
        await StoreReview.requestReview();
        await writeMeta({ lastAskedAt: Date.now() });
        return 'in_app';
      }
    }
  } catch {
    /* fall through */
  }

  if (openStoreFallback) {
    await openStoreListing();
    await writeMeta({ lastAskedAt: Date.now() });
    return 'store';
  }
  return 'unavailable';
}

/**
 * 가벼운 자동 프롬프트 — 쿨다운·거절 반영
 * @returns {Promise<boolean>} 요청을 실제로 시도했으면 true
 */
export async function maybeRequestAppReview() {
  const meta = await readMeta();
  if (meta.declined) return false;
  if (meta.lastAskedAt && Date.now() - meta.lastAskedAt < COOLDOWN_MS) {
    return false;
  }
  const result = await requestAppReview({ openStoreFallback: false });
  if (result === 'unavailable') return false;
  return true;
}

export async function markStoreReviewDeclined() {
  await writeMeta({ declined: true, lastAskedAt: Date.now() });
}
