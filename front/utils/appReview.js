/**
 * 인앱 리뷰 유도 · 스토어 리뷰
 */
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { api } from './api';
import { getStoreUrlForPlatform } from './shareLinks';

const STORAGE_KEY = '@youthpaper/store_review_meta_v1';
const FEEDBACK_KEY = '@youthpaper/in_app_review_feedback_v1';
/** 앱을 연 날짜(서울) 목록 — 누적 이용일 카운트 */
const ACTIVE_DAYS_KEY = 'yp_review_prompt_active_days_v1';

/** 회초리 content 한도 (서버와 동일) */
const WHACK_CONTENT_MAX = 50;
const WHACK_NAME_MAX = 10;

/**
 * true: 이용일·쿨다운 무시하고 세션당 1회 (로컬 테스트용)
 * false: 운영 — 누적 이용일 MIN_ACTIVE_DAYS + 쿨다운
 */
export const REVIEW_PROMPT_TEST_ALWAYS = false;

/** 리뷰 유도에 필요한 누적 이용일 (연속 불필요) */
export const REVIEW_PROMPT_MIN_ACTIVE_DAYS = 10;

/** @deprecated 이름만 호환 — MIN_ACTIVE_DAYS와 동일 */
export const REVIEW_PROMPT_MIN_ACCOUNT_AGE_DAYS = REVIEW_PROMPT_MIN_ACTIVE_DAYS;

/** 세션 내 이미 노출했는지 (앱 프로세스 단위) */
let shownThisSession = false;

/** 좋아요→스토어 요청 / 나중에 / 별로 이후 재질문까지 */
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

async function readMeta() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        lastAskedAt: 0,
        declined: false,
        nativeAskedAt: 0,
        whackSubmittedAt: 0,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      lastAskedAt: Number(parsed?.lastAskedAt) || 0,
      declined: Boolean(parsed?.declined),
      // 구버전 completedAt → 쿨다운용 lastAskedAt으로만 취급 (영구 제외 안 함)
      nativeAskedAt: Number(parsed?.nativeAskedAt) || 0,
      whackSubmittedAt:
        Number(parsed?.whackSubmittedAt) ||
        Number(parsed?.completedAt) ||
        0,
    };
  } catch {
    return {
      lastAskedAt: 0,
      declined: false,
      nativeAskedAt: 0,
      whackSubmittedAt: 0,
    };
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
 * 네이티브 인앱 리뷰 요청.
 * - OS 모달이라 여백/뒤로가기 제어 불가
 * - requestReview()가 성공해도 할당량·설치 경로 때문에 안 뜰 수 있음
 * - 로컬 `expo run` 사이드로드에서는 거의 안 뜸 → Play 내부테스트 / TestFlight 권장
 * @returns {'in_app'|'store'|'unavailable'}
 */
export async function requestAppReview({ openStoreFallback = true } = {}) {
  let available = false;
  let hasAction = false;
  try {
    available = await StoreReview.isAvailableAsync();
    if (available) {
      hasAction = await StoreReview.hasAction();
      if (hasAction) {
        await StoreReview.requestReview();
        await writeMeta({ lastAskedAt: Date.now() });
        if (__DEV__) {
          console.log(
            '[InAppReview] requestReview() called — UI는 OS가 결정(자주 요청하면 숨김).',
            { platform: Platform.OS, available, hasAction },
          );
        }
        return 'in_app';
      }
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[InAppReview] requestReview failed', e);
    }
  }

  if (__DEV__) {
    console.log('[InAppReview] native unavailable → store fallback?', {
      platform: Platform.OS,
      available,
      hasAction,
      openStoreFallback,
    });
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

/**
 * 「별로」회초리 접수 후 — 영구 제외가 아니라 쿨다운만.
 * (나중에 만족도가 좋아질 수 있음)
 */
export async function markReviewPromptCompleted() {
  shownThisSession = true;
  await writeMeta({
    lastAskedAt: Date.now(),
    whackSubmittedAt: Date.now(),
  });
}

/**
 * 「좋아요」→ 네이티브 스토어 모달만 요청한 상태.
 * 실제 별점/리뷰 작성 여부는 구분 불가 → 쿨다운만.
 */
export async function markReviewPromptNativeAsked() {
  shownThisSession = true;
  await writeMeta({
    lastAskedAt: Date.now(),
    nativeAskedAt: Date.now(),
  });
}

/** 「나중에」— 이번 세션만 닫고, 쿨다운 후 다시 가능 */
export async function markReviewPromptDeferred() {
  shownThisSession = true;
  await writeMeta({ lastAskedAt: Date.now() });
}

/** Asia/Seoul 기준 YYYY-MM-DD */
function seoulDayKey(ref = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ref);
  } catch {
    return ref.toISOString().slice(0, 10);
  }
}

/**
 * 오늘(서울) 앱 사용일 기록. 같은 날은 1회로 칩.
 * @returns {Promise<number>} 누적 이용일 수
 */
export async function recordReviewPromptActiveDay() {
  const day = seoulDayKey();
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_DAYS_KEY);
    let days = [];
    try {
      days = raw ? JSON.parse(raw) : [];
    } catch {
      days = [];
    }
    if (!Array.isArray(days)) days = [];
    if (!days.includes(day)) {
      days.push(day);
      // 오래된 키 정리 (최근 180일만 유지)
      if (days.length > 180) days = days.slice(-180);
      await AsyncStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(days));
    }
    return days.length;
  } catch {
    return 0;
  }
}

export async function getReviewPromptActiveDayCount() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_DAYS_KEY);
    const days = raw ? JSON.parse(raw) : [];
    return Array.isArray(days) ? days.length : 0;
  } catch {
    return 0;
  }
}

/** 누적 이용일 >= 10 (연속 아님) */
export async function isReviewPromptUsageMature() {
  await recordReviewPromptActiveDay();
  const count = await getReviewPromptActiveDayCount();
  return count >= REVIEW_PROMPT_MIN_ACTIVE_DAYS;
}

/** @deprecated 호환용 */
export async function isReviewPromptAccountMature() {
  return isReviewPromptUsageMature();
}

/**
 * 인앱 만족도 팝업 표시 여부
 *
 * 운영 기준:
 * 1) 앱을 연 날이 누적 10일 이상 (연속 불필요 · 가입 직후 유도 금지)
 * 2) 최근 유도(좋아요/별로/나중에) 후 90일 쿨다운
 *
 * 테스트: REVIEW_PROMPT_TEST_ALWAYS=true 이면 위 무시·세션당 1회
 */
export async function shouldShowInAppReviewPrompt() {
  if (shownThisSession) return false;

  // 테스트 모드여도 이용일은 쌓아 둠 (운영 전환 대비)
  await recordReviewPromptActiveDay();

  if (REVIEW_PROMPT_TEST_ALWAYS) {
    shownThisSession = true;
    return true;
  }

  const dayCount = await getReviewPromptActiveDayCount();
  if (dayCount < REVIEW_PROMPT_MIN_ACTIVE_DAYS) {
    if (__DEV__) {
      console.log('[InAppReview] skip — not enough active days', {
        dayCount,
        needDays: REVIEW_PROMPT_MIN_ACTIVE_DAYS,
      });
    }
    return false;
  }

  const meta = await readMeta();
  if (meta.declined) return false;
  const lastTouch =
    meta.lastAskedAt || meta.whackSubmittedAt || meta.nativeAskedAt || 0;
  if (lastTouch && Date.now() - lastTouch < COOLDOWN_MS) {
    return false;
  }
  return true;
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

/**
 * 「별로」피드백 → 회초리(developer-feedback)로 접수
 * 관리자「회초리」패널에서 확인
 */
export async function submitDislikeToWhack({ stars, comment } = {}) {
  const star = Math.min(5, Math.max(1, Number(stars) || 1));
  const note = String(comment || '').trim();
  const content = (
    note
      ? `인앱리뷰 ★${star} ${note}`
      : `인앱리뷰 ★${star} (의견 없음)`
  ).slice(0, WHACK_CONTENT_MAX);

  let honoreeName = '사용자';
  try {
    const res = await api.get('/api/auth/me');
    const me = res.data?.data;
    const raw =
      String(me?.name || '').trim() ||
      String(me?.username || '')
        .replace(/^@/, '')
        .trim() ||
      '';
    if (raw) honoreeName = raw.slice(0, WHACK_NAME_MAX);
  } catch {
    /* keep default */
  }

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || '';
  const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();

  await api.post('/api/developer-feedback', {
    category: 'other',
    honoreeName,
    schoolPublic: false,
    content,
    appVersion: appVersion || undefined,
    deviceInfo: deviceInfo || undefined,
  });

  await saveInAppReviewFeedback({
    sentiment: 'negative',
    stars: star,
    comment: note,
  });

  return { content, honoreeName };
}
