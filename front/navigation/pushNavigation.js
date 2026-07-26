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
  if (screen === 'Timer' || type === 'timer_poke') return 'timer';
  if (screen === 'Notification' || screen === 'Notifications') return 'board';
  if (screen === 'SchoolMailDetail' || type === 'school_mail') return 'school';
  return 'board';
}

/**
 * 알림/딥링크 진입 시 Main(목록 탭) 아래에 상세 화면이 깔리도록 스택 구성.
 * reset + setTimeout navigate 대신 단일 reset으로 race를 제거한다.
 *
 * 주의: Main 에 initialTab 을 실어 reset 한 뒤, Main 이 언포커스인 상태에서
 * 탭 navigate 를 즉시 호출하면 RN 이 Main 을 다시 포커스해 상세가 가려진다.
 * → MainTabNavigator 에서 pending tab 으로 포커스 시에만 탭 전환.
 */
export function buildPushStackRoutes({ name, params, relatedType }) {
  const targetName = String(name || '').trim();
  if (!targetName) {
    return [{ name: 'Main', params: { initialTab: resolveMainTabForPush('', relatedType) } }];
  }

  if (targetName === 'Main') {
    const tab =
      params?.screen ??
      params?.initialTab ??
      resolveMainTabForPush(targetName, relatedType);
    return [
      {
        name: 'Main',
        params: {
          ...(params ?? {}),
          initialTab: tab,
          screen: tab,
        },
      },
    ];
  }

  const initialTab = resolveMainTabForPush(targetName, relatedType);
  return [
    { name: 'Main', params: { initialTab, screen: initialTab } },
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

function buildBoardDetailNavParams(relatedId, data = {}) {
  return {
    postId: relatedId,
    post: {
      id: relatedId,
    },
    isMyPost: false,
    ...data,
  };
}

/** FCM data → 화면 이름·파라미터 (백엔드 targetScreen 명칭 불일치 보정) */
export function resolvePushNavigation(data = {}, remoteMessage = null) {
  const targetScreen = String(data?.targetScreen || '').trim();
  const relatedType = String(data?.relatedType || '').trim();
  const category = String(data?.category || '').trim();
  const type = String(data?.type || '').trim();
  const relatedIdRaw = data?.relatedId;
  const relatedId =
    relatedIdRaw != null && String(relatedIdRaw).trim() !== ''
      ? String(relatedIdRaw)
      : null;
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

  // 게시글: targetScreen 또는 relatedType/category
  if (
    targetScreen === 'PostDetail' ||
    targetScreen === 'BoardDetail' ||
    relatedType === 'post' ||
    (category === 'post' && relatedId)
  ) {
    return {
      name: 'BoardDetail',
      params: buildBoardDetailNavParams(relatedId, data),
    };
  }

  if (
    targetScreen === 'FriendRequests' ||
    relatedType === 'friendship' ||
    relatedType === 'friend_request' ||
    type === 'friend_request'
  ) {
    return {
      name: 'Friends',
      params: data,
    };
  }

  if (
    relatedType === 'timer_poke' ||
    type === 'poke' ||
    type === 'friend_poke' ||
    targetScreen === 'Timer'
  ) {
    return {
      name: 'Main',
      params: { initialTab: 'timer' },
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
          is_returned: relatedType === 'personal_mail_returned',
        },
        ...data,
      },
    };
  }

  if (relatedType === 'school_mail' && relatedId) {
    return {
      name: 'SchoolMailDetail',
      params: {
        mailId: relatedId,
        ...data,
      },
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
