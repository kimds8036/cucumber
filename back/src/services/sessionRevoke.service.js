import { emitSessionRevoked } from '../socketServer.js';

/**
 * 제재·token_version 증가 시 해당 유저 소켓에 세션 무효 알림
 */
export function notifyUserSessionRevoked(
  userId,
  { code = 'SESSION_REVOKED', message = '세션이 만료되었습니다. 다시 로그인해주세요.' } = {},
) {
  if (!userId) return;
  emitSessionRevoked(userId, { code, message });
}
