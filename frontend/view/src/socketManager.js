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
  });

  currentRoomId = roomId ?? null;

  socket.on('connect', () => {
    if (roomId) socket.emit('join_room', { roomId });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected && currentRoomId) {
    socket.emit('leave_room', { roomId: currentRoomId });
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

