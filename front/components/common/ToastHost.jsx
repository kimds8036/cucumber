import React from 'react';
import { View } from 'react-native';
import GlobalToast from './GlobalToast';
import { useToast } from '../../context/ToastContext';
import { navigateFromPush } from '../../navigation/pushNavigation';
import { api } from '../../utils/api';
import {
  isStudySummaryNotification,
  normalizeStudySummaryWatchers,
} from '../../utils/studySummaryNotification';

const DM_ICON_COLOR_COUNT = 4;

export default function ToastHost() {
  const { visible, toast, hideToast } = useToast();

  const openDmRoom = async (watcher) => {
    if (!watcher?.userId) {
      console.log(
        '[ToastHost] DM 이동 실패: watcher.userId 없음, Notification으로 이동',
        {
          watcher,
        },
      );
      navigateFromPush({
        name: 'Notification',
        relatedType: '',
      });
      return;
    }
    try {
      const res = await api.post('/api/dm/rooms', {
        otherUserId: watcher.userId,
      });
      const roomId = res?.data?.data?.id;
      if (roomId == null) {
        console.log('[ToastHost] DM roomId 없음, Notification으로 이동', {
          watcherUserId: watcher.userId,
        });
        navigateFromPush({
        name: 'Notification',
        relatedType: '',
      });
        return;
      }
      let friendPayload = { id: watcher.userId, name: watcher.name };
      try {
        const roomsRes = await api.get('/api/dm/rooms', {
          params: { page: 1, limit: 100 },
        });
        const rooms = Array.isArray(roomsRes?.data?.data?.rooms)
          ? roomsRes.data.data.rooms
          : [];
        const room = rooms.find((r) => String(r?.id) === String(roomId));
        if (room) {
          const colorIndexRaw =
            room.other_user_color_id != null
              ? Number(room.other_user_color_id)
              : null;
          const safeColorIndex =
            Number.isFinite(colorIndexRaw) && colorIndexRaw >= 0
              ? colorIndexRaw % DM_ICON_COLOR_COUNT
              : 0;
          friendPayload = {
            id: room.other_user_id ?? watcher.userId,
            name: room.other_user_name || watcher.name || '친구',
            schoolName: room.other_user_school_name || '',
            colorIndex: safeColorIndex,
          };
        }
      } catch (friendError) {
        console.log('[ToastHost] DM friend 정보 보강 실패, 기본 payload 사용', {
          watcherUserId: watcher.userId,
          message: friendError?.message,
        });
      }
      console.log('[ToastHost] study summary -> DMChat 이동', {
        watcherUserId: watcher.userId,
        watcherName: watcher.name,
        roomId,
        friendPayload,
      });
      navigateFromPush({
        name: 'DMChat',
        params: {
          roomId,
          friend: friendPayload,
        },
        relatedType: 'dm_room',
      });
    } catch (error) {
      console.log('[ToastHost] DM 생성 실패, Notification으로 이동', {
        watcherUserId: watcher.userId,
        message: error?.message,
      });
      navigateFromPush({
        name: 'Notification',
        relatedType: '',
      });
    }
  };

  const handleToastPress = async () => {
    const roomId = toast?.roomId != null ? String(toast.roomId) : null;
    const relatedId = toast?.relatedId != null ? String(toast.relatedId) : null;
    const relatedType = String(toast?.relatedType ?? '').trim();
    const type = String(toast?.type ?? '').trim();
    const category = String(toast?.category ?? '').trim();

    hideToast();

    if (relatedType === 'dm_room' && roomId) {
      const senderName = String(toast?.senderName ?? '').trim();
      const senderUserId =
        toast?.senderUserId != null ? String(toast.senderUserId) : null;
      const senderSchoolName = String(toast?.senderSchoolName ?? '').trim();
      const colorIndexRaw =
        toast?.senderColorId != null ? Number(toast.senderColorId) : null;
      const colorIndex =
        Number.isFinite(colorIndexRaw) && colorIndexRaw >= 0
          ? colorIndexRaw % DM_ICON_COLOR_COUNT
          : 0;

      navigateFromPush({
        name: 'DMChat',
        params: {
          roomId,
          friend: {
            ...(senderUserId ? { id: senderUserId } : {}),
            name: senderName || '친구',
            ...(senderSchoolName ? { schoolName: senderSchoolName } : {}),
            colorIndex,
          },
        },
        relatedType: 'dm_room',
      });
      return;
    }
    if (relatedType === 'message_room' && roomId) {
      navigateFromPush({
        name: 'Chat',
        params: { roomId },
        relatedType: 'message_room',
      });
      return;
    }
    if (relatedType === 'personal_mail' && relatedId) {
      navigateFromPush({
        name: 'MailDetail',
        params: {
          mail: {
            id: relatedId,
            receivedAt: '',
            content: '',
            is_read: false,
          },
        },
        relatedType: 'personal_mail',
      });
      return;
    }
    if (isStudySummaryNotification({ relatedType, type })) {
      const watchers = normalizeStudySummaryWatchers(toast?.watchers);
      console.log('[ToastHost] study summary toast pressed', {
        watchersCount: watchers.length,
        relatedType,
        type,
      });
      if (watchers.length === 1) {
        await openDmRoom(watchers[0]);
        return;
      }
      console.log('[ToastHost] study summary 다중 대기자 -> Notification 이동');
      navigateFromPush({
        name: 'Notification',
        relatedType: '',
      });
      return;
    }
    if (relatedType === 'post' && relatedId) {
      navigateFromPush({
        name: 'BoardDetail',
        params: {
          post: {
            id: relatedId,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: 0,
            comments: 0,
          },
          isMyPost: false,
        },
        relatedType: 'post',
      });
      return;
    }
    if (
      relatedType === 'timer_poke' ||
      type === 'poke' ||
      type === 'friend_poke'
    ) {
      navigateFromPush({
        name: 'Main',
        params: { initialTab: 'timer' },
        relatedType: 'timer_poke',
      });
      return;
    }
    if (relatedType === 'friendship' || type === 'friend_request') {
      navigateFromPush({
        name: 'Friends',
        relatedType: 'friend_request',
      });
      return;
    }
    if (roomId) {
      navigateFromPush({
        name: 'Chat',
        params: { roomId },
        relatedType: 'message_room',
      });
      return;
    }
    if (category === 'system' || category === 'mail' || category === 'post') {
      navigateFromPush({
        name: 'Notification',
        relatedType: '',
      });
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 10,
      }}
    >
      <GlobalToast
        visible={visible}
        toastId={toast?.id}
        title={toast?.title}
        message={toast?.message}
        senderName={toast?.senderName}
        body={toast?.body}
        isChat={toast?.isChat}
        showProgress={toast?.showProgress}
        onPress={handleToastPress}
        onHide={hideToast}
      />
    </View>
  );
}
