import { useMemo, useState } from 'react';
import { api } from '../../../../utils/api';
import { useNotification } from '../../../../context/NotificationContext';
import useChatCore from './useChatCore';

export default function useDMChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();
  const [meId, setMeId] = useState(null);

  const apiAdapter = useMemo(
    () => ({
      fetchMessages: async (targetRoomId, limit, signal) => {
        const [res, meRes] = await Promise.all([
          api.get(`/api/dm/rooms/${targetRoomId}?limit=${limit}`, { signal }),
          api.get('/api/auth/me', { signal }),
        ]);
        const mePayload = meRes.data?.data;
        const calculatedMeId = Number(mePayload?.id ?? mePayload?.userId);
        if (!Number.isNaN(calculatedMeId)) setMeId(calculatedMeId);
        const rawMessages = res.data?.data || [];
        if (__DEV__) {
          console.log('[ChatDebug] FetchMessages', {
            scope: 'dm',
            roomId: targetRoomId,
            meId: calculatedMeId,
            count: rawMessages.length,
          });
        }
        return {
          messages: rawMessages.map((m) => ({
            ...m,
            isMe:
              !Number.isNaN(calculatedMeId) &&
              Number(m.sender_id ?? m.senderId) === Number(calculatedMeId),
          })),
          hasMore: Boolean(res.data?.hasMore),
          room: res.data?.room,
          meId: calculatedMeId,
        };
      },
      fetchMore: async (targetRoomId, beforeId, limit) => {
        const res = await api.get(
          `/api/dm/rooms/${targetRoomId}?before=${beforeId}&limit=${limit}`,
        );
        const rawMessages = res.data?.data || [];
        return {
          messages: rawMessages.map((m) => ({
            ...m,
            isMe:
              meId != null &&
              Number(m.sender_id ?? m.senderId) === Number(meId),
          })),
          hasMore: Boolean(res.data?.hasMore),
        };
      },
      sendMessage: async (targetRoomId, formData) => {
        const res = await api.post(
          `/api/dm/rooms/${targetRoomId}/messages`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return res.data?.data;
      },
      deleteMessage: (id) => api.delete(`/api/dm/messages/${id}`),
      markRead: (targetRoomId) =>
        api.put(`/api/dm/rooms/${targetRoomId}/read`).catch(() => {}),
      markNotificationRead: () =>
        api
          .post('/api/notifications/read-by-related', {
            relatedType: 'dm_room',
            relatedId: roomId,
          })
          .catch(() => {}),
    }),
    [roomId],
  );

  return useChatCore({
    roomId,
    meId,
    api: apiAdapter,
    socket,
    cacheScope: 'dm',
    refreshHasUnread,
  });
}
