import { io } from 'socket.io-client';
import { api, getAuthToken } from '../../utils/api';

// 싱글톤 소켓 인스턴스 유지
let socket = null;
let currentRoomId = null;
let currentToken = null;

const createSocket = (resolvedToken, roomId) => {
  const next = io(api.defaults.baseURL, {
    auth: { token: resolvedToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  currentToken = resolvedToken ?? null;
  currentRoomId = roomId ?? null;

  next.on('connect', () => {
    if (currentRoomId) next.emit('join_room', { roomId: currentRoomId });
  });

  return next;
};

export const connectSocket = async (roomId, token) => {
  const resolvedToken = token ?? (await getAuthToken());

  // 토큰이 바뀌었거나 끊긴 소켓이 남아 있으면 깨끗이 정리하고 새로 만든다.
  // (옛 JWT를 들고 있던 좀비 소켓이 INVALID_TOKEN 으로 무한 재시도하는 상황 방지)
  if (socket && currentToken && currentToken !== resolvedToken) {
    try {
      socket.removeAllListeners?.();
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = null;
  }

  if (socket && socket.connected) {
    if (roomId && currentRoomId !== roomId) {
      if (currentRoomId) {
        socket.emit('leave_room', { roomId: currentRoomId });
      }
      currentRoomId = roomId;
      socket.emit('join_room', { roomId });
    }
    return socket;
  }

  if (!socket) {
    socket = createSocket(resolvedToken, roomId);
  } else {
    // 인스턴스는 살아있고 토큰만 동일한데 끊겨 있는 케이스 → 재연결만 트리거
    if (roomId) currentRoomId = roomId;
    if (!socket.connected) socket.connect();
  }

  return socket;
};

/**
 * 새 토큰으로 소켓 인증을 갱신한다.
 * - 로그인 직후/토큰 회전 시 호출.
 * - 기존 인스턴스가 있으면 disconnect 후 새 토큰으로 connect, 없으면 새로 생성.
 */
export const setAuthTokenAndReconnect = async (newToken) => {
  if (!newToken) return null;
  if (socket) {
    try {
      socket.auth = { token: newToken };
      socket.removeAllListeners?.();
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = null;
  }
  socket = createSocket(newToken, currentRoomId);
  return socket;
};

/**
 * 전역 소켓 강제 종료.
 * - 원칙적으로 SocketContext(로그아웃/세션만료/앱 종료 흐름)에서만 호출한다.
 * - 화면/훅 cleanup에서는 절대 호출하지 말고 leave_room만 처리한다.
 */
export const disconnectSocket = (opts = {}) => {
  const { force = false, reason = 'unspecified' } = opts;
  if (!force) {
    if (__DEV__) {
      console.warn('[SocketManager] disconnectSocket 차단(force=false)', {
        reason,
      });
    }
    return;
  }
  if (socket?.connected && currentRoomId) {
    socket.emit('leave_room', { roomId: currentRoomId });
  }
  if (socket) {
    if (__DEV__) {
      console.log('[SocketManager] disconnectSocket 실행', { reason });
    }
    socket.disconnect();
  }
  currentRoomId = null;
};

export const emit = (event, payload) => {
  socket?.emit(event, payload);
};

export const on = (event, handler) => {
  socket?.on(event, handler);
};

export const off = (event, handler) => {
  if (!socket) return;
  if (handler) socket.off(event, handler);
  else socket.off(event);
};

export const getSocket = () => socket;
