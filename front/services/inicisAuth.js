import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../utils/api';
import { getUserFacingErrorMessage } from '../utils/userFacingError';

WebBrowser.maybeCompleteAuthSession();

/** 동시에 하나의 인증 브라우저만 */
let activeFlowPromise = null;

/** 서버 INICIS_ENABLED 와 클라이언트 옵트인 */
export function isInicisClientEnabled() {
  return String(process.env.EXPO_PUBLIC_INICIS_ENABLED || '').toLowerCase() === 'true';
}

export function getInicisAppReturnUrl() {
  return Linking.createURL('inicis/return');
}

export async function fetchInicisServerEnabled() {
  try {
    const res = await api.get('/api/auth/inicis/status');
    return Boolean(res.data?.data?.enabled);
  } catch {
    return false;
  }
}

/**
 * @param {'student_signup'|'guardian_consent'} purpose
 */
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

/**
 * 인앱 브라우저(Custom Tabs / SFSafariViewController) — 완료·취소 시 자동 닫힘
 */
export async function openInicisAuthSession(launchUrl, redirectUrl) {
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

  return WebBrowser.openAuthSessionAsync(launchUrl, redirectUrl);
}

export async function waitForInicisResult(mTxId, {
  intervalMs = 2000,
  timeoutMs = 5 * 60 * 1000,
  shouldCancel,
} = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (shouldCancel?.()) {
      const err = new Error('cancelled');
      err.code = 'CANCELLED';
      throw err;
    }
    try {
      const res = await api.get(
        `/api/auth/inicis/session/${encodeURIComponent(mTxId)}`,
      );
      const data = res.data?.data;
      if (!data) {
        await sleep(intervalMs);
        continue;
      }
      if (data.status === 'success') {
        return {
          status: 'success',
          clientToken: data.clientToken,
          profile: data.profile,
        };
      }
      if (data.status === 'fail' || data.status === 'expired') {
        const err = new Error(data.resultMsg || '본인인증에 실패했습니다.');
        err.code = data.status;
        err.resultCode = data.resultCode;
        throw err;
      }
    } catch (pollError) {
      if (pollError?.code) throw pollError;
      const msg = getUserFacingErrorMessage(
        pollError,
        '본인인증 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      const err = new Error(msg);
      err.code = 'POLL_FAILED';
      throw err;
    }
    await sleep(intervalMs);
  }
  const err = new Error('본인인증 대기 시간이 초과되었습니다.');
  err.code = 'TIMEOUT';
  throw err;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 세션 시작 → 인앱 브라우저 → 폴링 (중복 실행 방지) */
export async function runInicisIdentityFlow(purpose, options = {}) {
  if (activeFlowPromise) {
    const err = new Error('이미 본인인증이 진행 중입니다.');
    err.code = 'IN_PROGRESS';
    throw err;
  }

  const redirectUrl = getInicisAppReturnUrl();

  activeFlowPromise = (async () => {
    let mTxId = null;
    try {
      const session = await startInicisSession(purpose, {
        appReturnUrl: redirectUrl,
      });
      mTxId = session.mTxId;

      const browserResult = await openInicisAuthSession(
        session.launchUrl,
        redirectUrl,
      );

      if (
        browserResult.type === 'cancel' ||
        browserResult.type === 'dismiss'
      ) {
        const err = new Error('cancelled');
        err.code = 'CANCELLED';
        throw err;
      }

      return waitForInicisResult(mTxId, options);
    } finally {
      activeFlowPromise = null;
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // ignore
      }
    }
  })();

  return activeFlowPromise;
}

/** 진행 중인 인증이 있는지 */
export function isInicisFlowInProgress() {
  return Boolean(activeFlowPromise);
}
