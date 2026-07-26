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
import {
  isMailReturnedNotification,
  navigateToResendPersonalMail,
} from '../../utils/personalMail';

const DM_ICON_COLOR_COUNT = 4;

function buildBoardDetailParams(relatedId) {
  return {
    postId: relatedId,
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
  };
}

function buildMailDetailParams(relatedId, { isReturned = false } = {}) {
  return {
    mail: {
      id: relatedId,
      receivedAt: '',
      content: '',
      is_read: false,
      isReceived: true,
      is_returned: isReturned,
    },
  };
}

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
    const relatedId =
      toast?.relatedId != null && String(toast.relatedId).trim() !== ''
        ? String(toast.relatedId)
        : null;
    const relatedType = String(toast?.relatedType ?? '').trim();
    const type = String(toast?.type ?? '').trim();
    const category = String(toast?.category ?? '').trim();

    hideToast();

    // 1) DM
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

    // 2) 익명 쪽지
    if (relatedType === 'message_room' && roomId) {
      navigateFromPush({
        name: 'Chat',
        params: { roomId },
        relatedType: 'message_room',
      });
      return;
    }

    // 3) 개인 우편 반송 → 재발송
    if (
      isMailReturnedNotification({
        type,
        relatedType,
        category,
        relatedId,
      }) &&
      relatedId
    ) {
      await navigateToResendPersonalMail(
        {
          navigate: (name, params) =>
            navigateFromPush({
              name,
              params,
              relatedType: 'personal_mail_returned',
            }),
        },
        { relatedId, type, relatedType, category },
      );
      return;
    }

    // 4) 개인 우편
    if (
      (relatedType === 'personal_mail' ||
        (category === 'mail' &&
          relatedType !== 'message_room' &&
          relatedType !== 'dm_room' &&
          relatedType !== 'school_mail')) &&
      relatedId
    ) {
      navigateFromPush({
        name: 'MailDetail',
        params: buildMailDetailParams(relatedId),
        relatedType: 'personal_mail',
      });
      return;
    }

    // 5) 공부 완료 요약
    if (isStudySummaryNotification({ relatedType, type })) {
      const watchers = normalizeStudySummaryWatchers(toast?.watchers);
      console.log('[ToastHost] study summary toast pressed', {
        watchersCount: watchers.length,
        relatedType,
        type,
      });
      if (
        watchers.length === 0 &&
        (relatedType === 'friend_study_finished_summary_single' ||
          relatedType === 'study_summary_single') &&
        relatedId
      ) {
        await openDmRoom({ userId: relatedId, name: '친구' });
        return;
      }
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

    // 6) 게시글 (알림 목록과 동일: category || relatedType)
    if ((category === 'post' || relatedType === 'post') && relatedId) {
      navigateFromPush({
        name: 'BoardDetail',
        params: buildBoardDetailParams(relatedId),
        relatedType: 'post',
      });
      return;
    }

    // 7) 쿡 찌르기
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

    // 8) 친구 요청
    if (relatedType === 'friendship' || type === 'friend_request') {
      navigateFromPush({
        name: 'Friends',
        relatedType: 'friend_request',
      });
      return;
    }

    // 9) roomId만 있는 채팅 폴백 (DM 메타가 있으면 DMChat)
    if (roomId) {
      const senderUserId =
        toast?.senderUserId != null ? String(toast.senderUserId) : null;
      if (senderUserId || toast?.isChat === true) {
        const senderName = String(toast?.senderName ?? '').trim();
        navigateFromPush({
          name: senderUserId ? 'DMChat' : 'Chat',
          params: senderUserId
            ? {
                roomId,
                friend: {
                  id: senderUserId,
                  name: senderName || '친구',
                },
              }
            : { roomId },
          relatedType: senderUserId ? 'dm_room' : 'message_room',
        });
        return;
      }
      navigateFromPush({
        name: 'Chat',
        params: { roomId },
        relatedType: 'message_room',
      });
      return;
    }

    // 10) 상세 이동 불가 → 알림 목록
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
