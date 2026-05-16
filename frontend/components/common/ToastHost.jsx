import React from 'react';
import { View } from 'react-native';
import GlobalToast from './GlobalToast';
import { useToast } from '../../context/ToastContext';
import { navigate, reset } from '../../navigation/navigationRef';
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
      console.log('[ToastHost] DM 이동 실패: watcher.userId 없음, Notification으로 이동', {
        watcher,
      });
      navigate('Notification');
      return;
    }
    try {
      const res = await api.post('/api/dm/rooms', { otherUserId: watcher.userId });
      const roomId = res?.data?.data?.id;
      if (roomId == null) {
        console.log('[ToastHost] DM roomId 없음, Notification으로 이동', {
          watcherUserId: watcher.userId,
        });
        navigate('Notification');
        return;
      }
      let friendPayload = { id: watcher.userId, name: watcher.name };
      try {
        const roomsRes = await api.get('/api/dm/rooms', { params: { page: 1, limit: 100 } });
        const rooms = Array.isArray(roomsRes?.data?.data?.rooms) ? roomsRes.data.data.rooms : [];
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
      navigate('DMChat', {
        roomId,
        friend: friendPayload,
      });
    } catch (error) {
      console.log('[ToastHost] DM 생성 실패, Notification으로 이동', {
        watcherUserId: watcher.userId,
        message: error?.message,
      });
      navigate('Notification');
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

      navigate('DMChat', {
        roomId,
        friend: {
          ...(senderUserId ? { id: senderUserId } : {}),
          name: senderName || '친구',
          ...(senderSchoolName ? { schoolName: senderSchoolName } : {}),
          colorIndex,
        },
      });
      return;
    }
    if (relatedType === 'message_room' && roomId) {
      navigate('Chat', { roomId });
      return;
    }
    if (relatedType === 'personal_mail' && relatedId) {
      navigate('MailDetail', {
        mail: {
          id: relatedId,
          receivedAt: '',
          content: '',
          is_read: false,
        },
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
      navigate('Notification');
      return;
    }
    if (relatedType === 'post' && relatedId) {
      navigate('BoardDetail', {
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
      });
      return;
    }
    if (relatedType === 'timer_poke' || type === 'poke' || type === 'friend_poke') {
      reset('Main', { initialTab: 'timer' });
      return;
    }
    if (relatedType === 'friendship' || type === 'friend_request') {
      navigate('Friends');
      return;
    }
    if (roomId) {
      navigate('Chat', { roomId });
      return;
    }
    if (category === 'system' || category === 'mail' || category === 'post') {
      navigate('Notification');
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

