import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { api } from '../utils/api';
import { getUserFacingErrorMessage } from '../utils/userFacingError';

WebBrowser.maybeCompleteAuthSession();

const PENDING_SESSION_KEY = '@inicis_pending_session';
const PENDING_TTL_MS = 30 * 60 * 1000;

/** 동시에 하나의 인증 브라우저만 */
let activeFlowPromise = null;
let activeFlowCancel = null;

function registerFlowCancel(onCancel) {
  activeFlowCancel = onCancel;
}

function clearFlowCancel() {
  activeFlowCancel = null;
}

/** Sign 화면 이탈·중단 시 진행 중 폴링 취소 */
export function cancelInicisFlow() {
  activeFlowCancel?.();
  clearFlowCancel();
  activeFlowPromise = null;
}

/** KG 이니시스 연동 시 앱 복귀 URL (서버 allowlist용 — 자동 딥링크 이동은 사용하지 않음) */
export function getInicisAppReturnUrl() {
  return Linking.createURL('inicis/return');
}

function buildInicisLaunchUrl(mTxId) {
  const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
  return `${base}/api/auth/inicis/launch/${encodeURIComponent(mTxId)}`;
}

export function isInicisClientEnabled() {
  return String(process.env.EXPO_PUBLIC_INICIS_ENABLED || '').toLowerCase() === 'true';
}

async function savePendingSession({ mTxId, purpose }) {
  await AsyncStorage.setItem(
    PENDING_SESSION_KEY,
    JSON.stringify({ mTxId, purpose, startedAt: Date.now() }),
  );
}

export async function clearPendingInicisSession() {
  await AsyncStorage.removeItem(PENDING_SESSION_KEY);
}

export async function getPendingInicisSession() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.mTxId || !data?.purpose) {
      await clearPendingInicisSession();
      return null;
    }
    if (Date.now() - Number(data.startedAt || 0) > PENDING_TTL_MS) {
      await clearPendingInicisSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function fetchInicisServerEnabled() {
  try {
    const res = await api.get('/api/auth/inicis/status');
    return Boolean(res.data?.data?.enabled);
  } catch {
    return false;
  }
}

export async function startInicisSession(
  purpose = 'student_signup',
  { appReturnUrl } = {},
) {
  try {
    const res = await api.post('/api/auth/inicis/session', {
      purpose,
      appReturnUrl: appReturnUrl || getInicisAppReturnUrl(),
    });
    if (!res.data?.success || !res.data?.data?.launchUrl) {
      throw new Error(res.data?.message || '이니시스 세션을 시작할 수 없습니다.');
    }
    return res.data.data;
  } catch (e) {
    const msg = getUserFacingErrorMessage(
      e,
      '본인인증을 시작할 수 없습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
    );
    const err = new Error(msg);
    err.code = 'SESSION_START_FAILED';
    throw err;
  }
}

function parseSessionPollResponse(data) {
  if (!data) return { kind: 'pending' };
  if (data.status === 'success') {
    return {
      kind: 'success',
      result: {
        status: 'success',
        clientToken: data.clientToken,
        profile: data.profile,
      },
    };
  }
  if (data.status === 'fail' || data.status === 'expired') {
    const err = new Error(data.resultMsg || '본인인증에 실패했습니다.');
    err.code = data.status;
    err.resultCode = data.resultCode;
    return { kind: 'error', error: err };
  }
  return { kind: 'pending' };
}

async function fetchInicisSessionOnce(mTxId) {
  const res = await api.get(
    `/api/auth/inicis/session/${encodeURIComponent(mTxId)}`,
  );
  return parseSessionPollResponse(res.data?.data);
}

export async function waitForInicisResult(mTxId, {
  intervalMs = 1500,
  timeoutMs = 5 * 60 * 1000,
  shouldCancel,
} = {}) {
  const started = Date.now();
  let timer = null;
  let appStateSub = null;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    appStateSub?.remove();
    appStateSub = null;
    timer = null;
  };

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (shouldCancel?.()) {
        cleanup();
        const err = new Error('cancelled');
        err.code = 'CANCELLED';
        reject(err);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        cleanup();
        const err = new Error('본인인증 대기 시간이 초과되었습니다.');
        err.code = 'TIMEOUT';
        err.userMessage =
          '인증이 완료되었다면 브라우저 왼쪽 상단 ✕를 눌러 앱으로 돌아와 주세요.';
        reject(err);
        return;
      }

      try {
        const outcome = await fetchInicisSessionOnce(mTxId);
        if (outcome.kind === 'success') {
          cleanup();
          resolve(outcome.result);
          return;
        }
        if (outcome.kind === 'error') {
          cleanup();
          reject(outcome.error);
          return;
        }
      } catch (pollError) {
        if (pollError?.code) {
          cleanup();
          reject(pollError);
          return;
        }
        const msg = getUserFacingErrorMessage(
          pollError,
          '본인인증 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        cleanup();
        const err = new Error(msg);
        err.code = 'POLL_FAILED';
        reject(err);
        return;
      }

      timer = setTimeout(tick, intervalMs);
    };

    appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (timer) clearTimeout(timer);
        tick();
      }
    });

    tick();
  });
}

/**
 * openAuthSessionAsync + youthpaper:// 리다이렉트는 Android에서 앱 cold start → 로그인 화면 복귀를 유발할 수 있음.
 * Custom Tabs만 열고 앱 복귀 시 폴링으로 결과를 확인한다.
 */
async function openInicisBrowser(launchUrl) {
  try {
    await WebBrowser.dismissBrowser();
  } catch {
    // ignore
  }
  try {
    await WebBrowser.coolDownAsync();
  } catch {
    // ignore
  }
  const options =
    Platform.OS === 'ios'
      ? {
          presentationStyle:
            WebBrowser.WebBrowserPresentationStyle?.FULL_SCREEN ??
            WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET,
        }
      : { showInRecents: true, createTask: false };
  return WebBrowser.openBrowserAsync(launchUrl, options);
}

export async function runInicisIdentityFlow(purpose, options = {}) {
  if (activeFlowPromise) {
    const err = new Error('이미 본인인증이 진행 중입니다.');
    err.code = 'IN_PROGRESS';
    throw err;
  }

  activeFlowPromise = (async () => {
    let mTxId = null;
    let cancelled = false;
    registerFlowCancel(() => {
      cancelled = true;
    });
    try {
      const session = await startInicisSession(purpose, {
        appReturnUrl: getInicisAppReturnUrl(),
      });
      mTxId = session.mTxId;
      await savePendingSession({ mTxId, purpose });

      await openInicisBrowser(session.launchUrl);
      const result = await waitForInicisResult(mTxId, {
        ...options,
        shouldCancel: () => cancelled,
      });
      await clearPendingInicisSession();

      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // ignore
      }

      return result;
    } catch (e) {
      if (e?.code === 'CANCELLED') {
        // pending 유지 — cold start 재개용 (Sign 진입 시 정리)
      } else if (e?.code === 'TIMEOUT') {
        // pending 유지 — 수동 복귀 후 재시도
      } else {
        await clearPendingInicisSession();
      }
      throw e;
    } finally {
      clearFlowCancel();
      activeFlowPromise = null;
    }
  })();

  return activeFlowPromise;
}

/** cold start / 로그인 화면 복귀 후 미완료 세션 폴링 재개 */
export async function resumePendingInicisFlow(expectedPurpose, options = {}) {
  const pending = await getPendingInicisSession();
  if (!pending) return null;
  if (pending.purpose !== expectedPurpose) return null;
  if (activeFlowPromise) return activeFlowPromise;

  activeFlowPromise = (async () => {
    let cancelled = false;
    registerFlowCancel(() => {
      cancelled = true;
    });
    try {
      const launchUrl = buildInicisLaunchUrl(pending.mTxId);
      await openInicisBrowser(launchUrl);
      const result = await waitForInicisResult(pending.mTxId, {
        timeoutMs: 5 * 60 * 1000,
        intervalMs: 1500,
        shouldCancel: () => cancelled,
        ...options,
      });
      await clearPendingInicisSession();
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // ignore
      }
      return result;
    } catch (e) {
      if (e?.code === 'TIMEOUT') {
        // pending 유지 — App cold start 재개용
      } else if (e?.code !== 'CANCELLED') {
        await clearPendingInicisSession();
      }
      throw e;
    } finally {
      clearFlowCancel();
      activeFlowPromise = null;
    }
  })();

  return activeFlowPromise;
}

export async function dismissInicisBrowserSafely() {
  try {
    await WebBrowser.dismissBrowser();
  } catch {
    // ignore
  }
  try {
    await WebBrowser.coolDownAsync();
  } catch {
    // ignore
  }
}

export function isInicisFlowInProgress() {
  return Boolean(activeFlowPromise);
}

/** 로딩 오버레이 「직접 열기」— pending 세션 launch URL 재오픈 (폴링 유지) */
export async function openPendingInicisBrowser() {
  const pending = await getPendingInicisSession();
  if (!pending?.mTxId) {
    const err = new Error('진행 중인 본인인증 세션이 없습니다.');
    err.code = 'NO_PENDING_SESSION';
    throw err;
  }
  const launchUrl = buildInicisLaunchUrl(pending.mTxId);
  await openInicisBrowser(launchUrl);
}
