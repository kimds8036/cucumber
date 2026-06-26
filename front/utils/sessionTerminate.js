/** @type {((payload: { code?: string, message?: string }) => Promise<void> | void) | null} */
let handler = null;

/** ban/세션 무효만 강제 로그아웃 — 졸업·재인증 차단은 UI 게이트가 처리 */
export const SESSION_FORCE_LOGOUT_CODES = new Set([
  'SESSION_REVOKED',
  'ACCOUNT_BANNED',
  'ACCOUNT_SUSPENDED',
]);

export const SOCKET_AUTH_BLOCKED_CODES = new Set([
  'GRADUATED_BLOCKED',
  'ADULT_BLOCKED',
  'REVERIFICATION_RESTRICTED',
]);

let sessionTerminateLocked = false;
let alertShown = false;

export function registerSessionTerminateHandler(fn) {
  handler = fn;
}

export function resetSessionTerminateGuard() {
  sessionTerminateLocked = false;
  alertShown = false;
}

export function isSocketAuthBlockedCode(code) {
  return SOCKET_AUTH_BLOCKED_CODES.has(code);
}

/**
 * API 403·Socket session_revoked 등 — ban/세션 무효 시에만 로그아웃
 */
export async function notifySessionTerminated(payload = {}) {
  const code = payload?.code;
  if (!SESSION_FORCE_LOGOUT_CODES.has(code)) return;
  if (!handler || sessionTerminateLocked) return;
  sessionTerminateLocked = true;
  try {
    await handler(payload);
  } catch {
    sessionTerminateLocked = false;
  }
}

export function markSessionTerminateAlertShown() {
  if (alertShown) return false;
  alertShown = true;
  return true;
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
