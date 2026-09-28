import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager, Platform } from 'react-native';
import { api } from '../utils/api';
import { getUserFacingErrorMessage } from '../utils/userFacingError';

WebBrowser.maybeCompleteAuthSession();

const PENDING_SESSION_KEY = '@inicis_pending_session';
const PENDING_TTL_MS = 30 * 60 * 1000;

/** 동시에 하나의 인증 브라우저만 */
let activeFlowPromise = null;
let activeFlowCancel = null;
/** 직접 열기 등으로 mTxId가 바뀌면 폴링 대상도 함께 갱신 */
let activePollMTxId = null;

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

async function fetchInicisSessionStatus(mTxId) {
  const res = await api.get(
    `/api/auth/inicis/session/${encodeURIComponent(mTxId)}`,
  );
  return res.data?.data || null;
}

async function resolveFreshInicisLaunchTarget(pending) {
  const row = await fetchInicisSessionStatus(pending.mTxId);

  if (row?.status === 'success') {
    const err = new Error('이미 본인인증이 완료되었습니다.');
    err.code = 'ALREADY_SUCCESS';
    throw err;
  }

  if (row?.status === 'pending') {
    activePollMTxId = pending.mTxId;
    return {
      mTxId: pending.mTxId,
      launchUrl: buildInicisLaunchUrl(pending.mTxId),
    };
  }

  const session = await startInicisSession(pending.purpose, {
    appReturnUrl: getInicisAppReturnUrl(),
  });
  await savePendingSession({ mTxId: session.mTxId, purpose: pending.purpose });
  activePollMTxId = session.mTxId;
  return { mTxId: session.mTxId, launchUrl: session.launchUrl };
}

async function fetchInicisSessionOnce(mTxId) {
  const row = await fetchInicisSessionStatus(mTxId);
  return parseSessionPollResponse(row);
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
    activePollMTxId = null;
  };

  activePollMTxId = mTxId;

  return new Promise((resolve, reject) => {
    const tick = async () => {
      const pollMTxId = activePollMTxId || mTxId;
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
        const outcome = await fetchInicisSessionOnce(pollMTxId);
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
 * Linking / Custom Tabs로 앱을 떠난 뒤 다시 active 될 때까지 대기 (Android openBrowserAsync용).
 */
function waitForAppReturnFromBrowser(timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    let leftApp = AppState.currentState !== 'active';
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(timeoutTimer);
      setTimeout(resolve, 200);
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'inactive' || nextState === 'background') {
        leftApp = true;
        return;
      }
      if (nextState === 'active' && leftApp) {
        finish();
      }
    });

    const timeoutTimer = setTimeout(finish, timeoutMs);
  });
}

/**
 * 인앱 브라우저로 KG 이니시스 실행.
 * - iOS: SFSafariViewController (PAGE_SHEET) — RN Modal이 완전히 내린 뒤에만 호출할 것
 * - Android: Custom Tabs — open 직후 dismiss 금지 (type:'opened'로 즉시 resolve)
 */
async function openInicisBrowser(launchUrl) {
  if (!launchUrl) {
    const err = new Error('본인인증 주소를 확인할 수 없습니다.');
    err.code = 'NO_LAUNCH_URL';
    throw err;
  }

  await new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await new Promise((resolve) =>
    setTimeout(resolve, Platform.OS === 'ios' ? 300 : 80),
  );

  if (Platform.OS === 'ios') {
    const result = await WebBrowser.openBrowserAsync(launchUrl, {
      presentationStyle:
        WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET ??
        WebBrowser.WebBrowserPresentationStyle?.FULL_SCREEN,
      dismissButtonStyle: 'close',
      enableBarCollapsing: false,
    });
    // present 실패 시 곧바로 cancel 이 오는 경우가 많음
    if (result?.type === 'cancel') {
      // 사용자가 닫은 것과 구분 불가 — 폴링으로 결과 확인 (미완료면 TIMEOUT)
      return result;
    }
    return result;
  }

  try {
    await WebBrowser.coolDownAsync();
  } catch {
    // ignore
  }

  const result = await WebBrowser.openBrowserAsync(launchUrl, {
    showInRecents: true,
    createTask: false,
  });
  if (result?.type === 'opened') {
    await waitForAppReturnFromBrowser();
  }
  return result;
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
    const {
      prepareOpenBrowser,
      afterBrowserClosed,
      ...pollOptions
    } = options;
    registerFlowCancel(() => {
      cancelled = true;
    });
    try {
      const session = await startInicisSession(purpose, {
        appReturnUrl: getInicisAppReturnUrl(),
      });
      mTxId = session.mTxId;
      await savePendingSession({ mTxId, purpose });

      // Modal present 중 SFSafari 충돌 방지 — 호출측에서 Modal을 먼저 내릴 것
      if (typeof prepareOpenBrowser === 'function') {
        await prepareOpenBrowser();
      } else {
        await settleUiForInicisBrowser();
      }
      if (cancelled) {
        const err = new Error('cancelled');
        err.code = 'CANCELLED';
        throw err;
      }

      await openInicisBrowser(session.launchUrl);
      // 열자마자 dismiss 하지 않음 (iOS는 닫힐 때까지 await, Android는 복귀까지 대기)

      if (typeof afterBrowserClosed === 'function') {
        await afterBrowserClosed();
      }
      const result = await waitForInicisResult(mTxId, {
        ...pollOptions,
        shouldCancel: () => cancelled,
      });
      await clearPendingInicisSession();
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
    const {
      prepareOpenBrowser,
      afterBrowserClosed,
      ...pollOptions
    } = options;
    registerFlowCancel(() => {
      cancelled = true;
    });
    try {
      const launchUrl = buildInicisLaunchUrl(pending.mTxId);
      if (typeof prepareOpenBrowser === 'function') {
        await prepareOpenBrowser();
      } else {
        await settleUiForInicisBrowser();
      }
      if (cancelled) {
        const err = new Error('cancelled');
        err.code = 'CANCELLED';
        throw err;
      }
      await openInicisBrowser(launchUrl);
      if (typeof afterBrowserClosed === 'function') {
        await afterBrowserClosed();
      }
      const result = await waitForInicisResult(pending.mTxId, {
        timeoutMs: 5 * 60 * 1000,
        intervalMs: 1500,
        ...pollOptions,
        shouldCancel: () => cancelled,
      });
      await clearPendingInicisSession();
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
  const attempts = Platform.OS === 'ios' ? 3 : 1;
  for (let i = 0; i < attempts; i += 1) {
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
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
}

/** Safari·Modal 애니메이션 종료 후 UI 잠금 해제 대기 */
export function waitForPresentationLayerRelease() {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      if (Platform.OS === 'ios') {
        // SignupIosSafeModal 언마운트(~500ms)와 맞춤
        setTimeout(resolve, 520);
        return;
      }
      resolve();
    });
  });
}

/**
 * 가입 오버레이(Modal) 직후 iOS에서 SFSafariViewController가 안 뜨는 경우 방지.
 * (Modal을 연 채로 호출하지 말 것 — prepareOpenBrowser로 Modal을 먼저 내릴 것)
 */
export async function settleUiForInicisBrowser() {
  await waitForPresentationLayerRelease();
  await new Promise((resolve) =>
    setTimeout(resolve, Platform.OS === 'ios' ? 200 : 80),
  );
}

export function isInicisFlowInProgress() {
  return Boolean(activeFlowPromise);
}

/** 로딩 오버레이 「직접 열기」— 이미 열린 세션(launched)은 새 mTxId로 재시작 */
export async function openPendingInicisBrowser(options = {}) {
  const pending = await getPendingInicisSession();
  if (!pending?.mTxId) {
    const err = new Error('진행 중인 본인인증 세션이 없습니다.');
    err.code = 'NO_PENDING_SESSION';
    throw err;
  }
  const { launchUrl } = await resolveFreshInicisLaunchTarget(pending);
  if (typeof options.prepareOpenBrowser === 'function') {
    await options.prepareOpenBrowser();
  } else {
    await settleUiForInicisBrowser();
  }
  await openInicisBrowser(launchUrl);
  if (typeof options.afterBrowserClosed === 'function') {
    await options.afterBrowserClosed();
  }
}

