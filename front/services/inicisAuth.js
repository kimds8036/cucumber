import { Linking } from 'react-native';
import { api } from '../utils/api';

/** 서버 INICIS_ENABLED 와 클라이언트 옵트인 */
export function isInicisClientEnabled() {
  return String(process.env.EXPO_PUBLIC_INICIS_ENABLED || '').toLowerCase() === 'true';
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
 * @returns {Promise<{ mTxId: string, launchUrl: string, pollPath: string }>}
 */
export async function startInicisSession(purpose = 'student_signup') {
  const res = await api.post('/api/auth/inicis/session', { purpose });
  if (!res.data?.success || !res.data?.data?.launchUrl) {
    throw new Error(res.data?.message || '이니시스 세션을 시작할 수 없습니다.');
  }
  return res.data.data;
}

export async function openInicisLaunchUrl(launchUrl) {
  const can = await Linking.canOpenURL(launchUrl);
  if (!can) {
    // https 는 보통 canOpen true; 실패 시에도 시도
  }
  await Linking.openURL(launchUrl);
}

/**
 * 폴링으로 success|fail 대기
 * @returns {Promise<{ clientToken: string, profile: object|null, status: string }>}
 */
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
    await sleep(intervalMs);
  }
  const err = new Error('본인인증 대기 시간이 초과되었습니다.');
  err.code = 'TIMEOUT';
  throw err;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 세션 시작 → 브라우저 오픈 → 폴링 */
export async function runInicisIdentityFlow(purpose, options = {}) {
  const session = await startInicisSession(purpose);
  await openInicisLaunchUrl(session.launchUrl);
  return waitForInicisResult(session.mTxId, options);
}
