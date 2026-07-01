import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';

/** 푸시/토스트 진입 시 Main 하단 탭 선택 */
export function resolveMainTabForPush(name = '', relatedType = '') {
  const screen = String(name || '').trim();
  const type = String(relatedType || '').trim();

  if (
    type === 'dm_room' ||
    type === 'message_room' ||
    type === 'personal_mail' ||
    type === 'personal_mail_returned'
  ) {
    return 'message';
  }
  if (type === 'post' || screen === 'BoardDetail') return 'board';
  if (screen === 'Friends' || type === 'friend_request' || type === 'friendship') {
    return 'mypage';
  }
  if (screen === 'Timer') return 'timer';
  if (screen === 'Notification' || screen === 'Notifications') return 'board';
  return 'board';
}

/**
 * 알림/딥링크 진입 시 Main(목록 탭) 아래에 상세 화면이 깔리도록 스택 구성.
 * reset + setTimeout navigate 대신 단일 reset으로 race를 제거한다.
 */
export function buildPushStackRoutes({ name, params, relatedType }) {
  const targetName = String(name || '').trim();
  if (!targetName) {
    return [{ name: 'Main', params: { initialTab: resolveMainTabForPush('', relatedType) } }];
  }

  if (targetName === 'Main') {
    return [
      {
        name: 'Main',
        params: {
          ...(params ?? {}),
          initialTab:
            params?.initialTab ?? resolveMainTabForPush(targetName, relatedType),
        },
      },
    ];
  }

  const initialTab = resolveMainTabForPush(targetName, relatedType);
  return [
    { name: 'Main', params: { initialTab } },
    { name: targetName, params: params ?? {} },
  ];
}

export function navigateFromPush({ name, params, relatedType }) {
  if (!navigationRef.isReady()) return false;
  const routes = buildPushStackRoutes({ name, params, relatedType });
  navigationRef.dispatch(
    CommonActions.reset({
      index: routes.length - 1,
      routes,
    }),
  );
  return true;
}

/** FCM data → 화면 이름·파라미터 (백엔드 targetScreen 명칭 불일치 보정) */
export function resolvePushNavigation(data = {}, remoteMessage = null) {
  const targetScreen = String(data?.targetScreen || '').trim();
  const relatedType = String(data?.relatedType || '').trim();
  const relatedId = data?.relatedId != null ? String(data.relatedId) : null;
  const notificationTitle = String(
    remoteMessage?.notification?.title ||
      data?.senderName ||
      data?.title ||
      '',
  ).trim();

  if (
    relatedType === 'dm_room' ||
    targetScreen === 'DMChat' ||
    (targetScreen === 'ChatRoom' && relatedType === 'dm_room')
  ) {
    return {
      name: 'DMChat',
      params: {
        roomId: relatedId,
        friend: {
          name: notificationTitle || '친구',
        },
        ...data,
      },
    };
  }

  if (
    relatedType === 'message_room' ||
    targetScreen === 'Chat' ||
    (targetScreen === 'ChatRoom' && relatedType === 'message_room')
  ) {
    return {
      name: 'Chat',
      params: {
        roomId: relatedId,
        ...data,
      },
    };
  }

  if (targetScreen === 'PostDetail' || targetScreen === 'BoardDetail') {
    return {
      name: 'BoardDetail',
      params: {
        post: {
          id: relatedId,
        },
        isMyPost: false,
        ...data,
      },
    };
  }

  if (targetScreen === 'FriendRequests') {
    return {
      name: 'Friends',
      params: data,
    };
  }

  if (targetScreen === 'Notifications' || targetScreen === 'Notification') {
    return {
      name: 'Notification',
      params: data,
    };
  }

  if (
    targetScreen === 'MailDetail' ||
    targetScreen === 'MailThread' ||
    relatedType === 'personal_mail' ||
    relatedType === 'personal_mail_returned'
  ) {
    return {
      name: 'MailDetail',
      params: {
        mail: {
          id: relatedId,
          isReceived: true,
          replyToMySent: false,
        },
        ...data,
      },
    };
  }

  if (targetScreen === 'Timer') {
    return {
      name: 'Main',
      params: { initialTab: 'timer' },
    };
  }

  if (!targetScreen) {
    return { name: null, params: null };
  }

  return {
    name: targetScreen,
    params: data,
  };
}
