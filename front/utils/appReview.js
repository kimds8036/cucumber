/**
 * 인앱 리뷰 유도 · 스토어 리뷰
 */
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { getStoreUrlForPlatform } from './shareLinks';

const STORAGE_KEY = '@youthpaper/store_review_meta_v1';
const FEEDBACK_KEY = '@youthpaper/in_app_review_feedback_v1';

/**
 * true: 로그인 후 메인 진입 시 세션당 1회 팝업 (테스트용)
 * false로 바꾸면 10일 접속 조건으로 전환 예정
 */
export const REVIEW_PROMPT_TEST_ALWAYS = true;

/** 세션 내 이미 노출했는지 (앱 프로세스 단위) */
let shownThisSession = false;

const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

async function readMeta() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lastAskedAt: 0, declined: false, completedAt: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      lastAskedAt: Number(parsed?.lastAskedAt) || 0,
      declined: Boolean(parsed?.declined),
      completedAt: Number(parsed?.completedAt) || 0,
    };
  } catch {
    return { lastAskedAt: 0, declined: false, completedAt: 0 };
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
    await Linking.openURL(url);
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

/** @deprecated 게시판 자동 노출 — InAppReviewPrompt로 대체 */
export async function maybeRequestAppReview() {
  return false;
}

export async function markStoreReviewDeclined() {
  await writeMeta({ declined: true, lastAskedAt: Date.now() });
}

export async function markReviewPromptCompleted() {
  shownThisSession = true;
  await writeMeta({
    completedAt: Date.now(),
    lastAskedAt: Date.now(),
  });
}

/**
 * 인앱 만족도 팝업 표시 여부
 * 테스트 모드: 세션당 1회
 * 운영(예정): 10일 접속 + 미완료 + 쿨다운
 */
export async function shouldShowInAppReviewPrompt() {
  if (shownThisSession) return false;

  if (REVIEW_PROMPT_TEST_ALWAYS) {
    shownThisSession = true;
    return true;
  }

  const meta = await readMeta();
  if (meta.completedAt) return false;
  if (meta.declined) return false;
  if (meta.lastAskedAt && Date.now() - meta.lastAskedAt < COOLDOWN_MS) {
    return false;
  }
  // TODO: 연속/누적 10일 접속 체크
  return false;
}

export async function saveInAppReviewFeedback({
  sentiment,
  stars,
  comment,
} = {}) {
  const entry = {
    sentiment: sentiment === 'negative' ? 'negative' : 'positive',
    stars: Math.min(5, Math.max(1, Number(stars) || 0)),
    comment: String(comment || '').trim().slice(0, 500),
    at: new Date().toISOString(),
    platform: Platform.OS,
  };
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push(entry);
    await AsyncStorage.setItem(
      FEEDBACK_KEY,
      JSON.stringify(next.slice(-50)),
    );
  } catch {
    /* ignore */
  }
  if (__DEV__) {
    console.log('[InAppReview] feedback saved', entry);
  }
  return entry;
}
