import { useMemo, useState } from 'react';
import { api } from '../../../../utils/api';
import { useNotification } from '../../../../context/NotificationContext';
import useChatCore from './useChatCore';

export default function useChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();
  const [meId, setMeId] = useState(null);

  const apiAdapter = useMemo(
    () => ({
      fetchMessages: async (targetRoomId, limit, signal) => {
        const res = await api.get(
          `/api/messages/rooms/${targetRoomId}?limit=${limit}`,
          { signal },
        );
        const room = res.data?.room;
        const otherId = room?.other_user_id;
        const calculatedMeId =
          room?.user1_id === otherId
            ? room?.user2_id
            : room?.user2_id === otherId
              ? room?.user1_id
              : null;
        setMeId(calculatedMeId);
        const rawMessages = res.data?.data || [];
        if (__DEV__) {
          console.log('[ChatDebug] FetchMessages', {
            scope: 'chat',
            roomId: targetRoomId,
            meId: calculatedMeId,
            count: rawMessages.length,
          });
        }
        return {
          messages: rawMessages.map((m) => ({
            ...m,
            isMe:
              calculatedMeId != null &&
              Number(m.sender_id ?? m.senderId) === Number(calculatedMeId),
          })),
          hasMore: Boolean(res.data?.hasMore),
          room,
          meId: calculatedMeId,
        };
      },
      fetchMore: async (targetRoomId, beforeId, limit) => {
        const res = await api.get(
          `/api/messages/rooms/${targetRoomId}?before=${beforeId}&limit=${limit}`,
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
          `/api/messages/rooms/${targetRoomId}/messages`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return res.data?.data;
      },
      deleteMessage: (id) => api.delete(`/api/messages/${id}`),
      markRead: (targetRoomId) =>
        api.put(`/api/messages/rooms/${targetRoomId}/read`),
      markNotificationRead: () =>
        api
          .post('/api/notifications/read-by-related', {
            relatedType: 'message_room',
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
    cacheScope: 'chat',
    refreshHasUnread,
  });
}
