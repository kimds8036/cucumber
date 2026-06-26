/** @type {((payload: { code?: string, message?: string }) => Promise<void> | void) | null} */
let handler = null;
let handling = false;

export function registerSessionTerminateHandler(fn) {
  handler = fn;
}

/**
 * API 403·Socket session_revoked 등 세션 종료 시 공통 처리
 */
export async function notifySessionTerminated(payload = {}) {
  if (!handler || handling) return;
  handling = true;
  try {
    await handler(payload);
  } finally {
    handling = false;
  }
}

export function getSessionTerminateTitle(code) {
  if (code === 'ACCOUNT_BANNED' || code === 'ACCOUNT_SUSPENDED') {
    return '로그인 제한';
  }
  if (code === 'GRADUATED_BLOCKED' || code === 'ADULT_BLOCKED') {
    return '이용 제한';
  }
  if (code === 'REVERIFICATION_RESTRICTED') {
    return '재인증 필요';
  }
  return '세션 종료';
}
