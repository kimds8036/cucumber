import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../utils/api';

const AUTH_TOKEN_KEY = '@auth_token';

// 싱글톤 소켓 인스턴스 유지
let socket = null;
let currentRoomId = null;

export const connectSocket = async (roomId, token) => {
  if (socket && socket.connected) {
    // 이미 연결된 상태면 room만 갱신(필요 시)
    if (roomId && currentRoomId !== roomId) {
      if (currentRoomId) {
        socket.emit('leave_room', { roomId: currentRoomId });
      }
      currentRoomId = roomId;
      socket.emit('join_room', { roomId });
    }
    return socket;
  }

  const resolvedToken = token ?? (await AsyncStorage.getItem(AUTH_TOKEN_KEY));

  socket = io(api.defaults.baseURL, {
    auth: { token: resolvedToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  currentRoomId = roomId ?? null;

  socket.on('connect', () => {
    if (roomId) socket.emit('join_room', { roomId });
  });

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
      console.warn('[SocketManager] disconnectSocket 차단(force=false)', { reason });
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

