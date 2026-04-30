/**
 * notificationWorker.js
 *
 * 알림(Notification)을 메시지 전송 로직과 완전히 분리하여
 * 비동기 큐(Bull + Redis)로 처리하는 워커입니다.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  흐름                                                │
 * │  메시지 저장 완료                                    │
 * │    → notificationQueue.add(job)   ← 단 한 줄        │
 * │    → 응답 즉시 반환 (클라이언트 대기 없음)           │
 * │                                                     │
 * │  워커(별도 프로세스/스레드)                          │
 * │    → job 수신 → createNotification 실행             │
 * │    → 실패 시 자동 재시도 (최대 3회)                  │
 * └─────────────────────────────────────────────────────┘
 *
 * 사용 방법
 * ─────────
 * 1) 패키지 설치
 *    npm install bull ioredis
 *
 * 2) app.js(메인 서버)에서 워커 시작
 *    import './notificationWorker.js';
 *    (또는 별도 프로세스: node notificationWorker.js)
 *
 * 3) 알림을 보낼 곳에서 큐에 추가
 *    import { enqueueNotification } from './notificationWorker.js';
 *    await enqueueNotification({ userId, type, title, body, ... });
 */

import Bull from 'bull';
import { createNotification } from './notifications.js';
import { emitNotification } from '../socketServer.js';
import { checkNotificationAllowed } from './notificationUtils.js';
import { sendPush } from './pushNotification.js';

// ── Redis 연결 설정 ──────────────────────────────────
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// ── 큐 생성 ─────────────────────────────────────────
export const notificationQueue = new Bull('notifications', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,           // 실패 시 최대 3회 재시도
    backoff: {
      type: 'exponential', // 1초 → 2초 → 4초 간격으로 재시도
      delay: 1000,
    },
    removeOnComplete: 100, // 완료된 잡은 최근 100개만 유지
    removeOnFail: 200,     // 실패 잡은 최근 200개만 유지
  },
});

// ── 잡 처리 핸들러 ───────────────────────────────────
notificationQueue.process(async (job) => {
  const { userId, type, category, title, body, relatedType, relatedId, watchers } = job.data;
  console.log('[NotifQueue] processing', {
    jobId: job.id,
    userId,
    type,
    relatedType,
    relatedId,
  });

  await createNotification({
    userId,
    type,
    category,
    title,
    body,
    relatedType,
    relatedId,
    watchers,
  });

  // DB 알림 생성 후, 해당 유저에게 소켓 알림도 함께 push (실패해도 메인 로직에는 영향 없음)
  try {
    emitNotification(userId, {
      type,
      category,
      title,
      body,
      relatedType,
      relatedId,
      watchers,
    });
  } catch (err) {
    console.error('[NotifQueue] 소켓 알림 emit 실패(무시):', err.message);
  }

  // FCM 푸시 전송 (실패해도 큐/메인 비즈니스 영향 없음)
  try {
    const pushContent = buildPushContent({
      title,
      body,
      relatedType,
    });

    await sendPush({
      userId,
      title: pushContent.title,
      body: pushContent.body,
      data: {
        type,
        category: category || '',
        relatedType: relatedType || '',
        relatedId: relatedId != null ? String(relatedId) : '',
        targetScreen: resolveTargetScreen(relatedType),
      },
    });
  } catch (err) {
    console.error('[NotifQueue] FCM 발송 실패(무시):', err.message);
  }
});

// ── 이벤트 로깅 ─────────────────────────────────────
notificationQueue.on('completed', (job) => {
  console.log(`[NotifQueue] 완료 jobId=${job.id} userId=${job.data.userId}`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(
    `[NotifQueue] 실패 jobId=${job.id} attempts=${job.attemptsMade} error=${err.message}`
  );
});

notificationQueue.on('error', (err) => {
  // Redis 연결 문제 등 큐 자체 오류 → 알림 실패가 메인 서버에 영향 X
  console.error('[NotifQueue] 큐 오류:', err.message);
});

/**
 * 알림 잡을 큐에 추가하는 헬퍼
 * 라우터에서 createNotification 대신 이 함수를 호출합니다.
 *
 * @param {object} params
 * @param {number}  params.userId
 * @param {string}  params.type
 * @param {string}  [params.category]
 * @param {string}  params.title
 * @param {string}  params.body
 * @param {string}  [params.relatedType]
 * @param {number}  [params.relatedId]
 * @param {Array<{userId:number,name:string}>} [params.watchers]
 */
export async function enqueueNotification(params) {
  try {
    const allowed = await checkNotificationAllowed(params.userId, params.type);
    if (!allowed) return;
    await notificationQueue.add(params);
  } catch (err) {
    // 큐 추가 실패 시 에러 로그만 남기고 메인 로직은 계속 진행
    console.error('[NotifQueue] 잡 추가 실패 (무시):', err.message);
  }
}

function resolveTargetScreen(relatedType) {
  switch (relatedType) {
    case 'post':
      return 'PostDetail';
    case 'dm_room':
    case 'message_room':
      return 'ChatRoom';
    case 'friend_request':
      return 'FriendRequests';
    case 'personal_mail':
      return 'MailDetail';
    default:
      return 'Notifications';
  }
}

function buildPushContent({ title, body, relatedType }) {
  // 익명 우편/익명 채팅은 푸시에서도 발신자 노출을 막는다.
  if (relatedType === 'personal_mail') {
    return {
      title: '새로운 익명 우편',
      body: '새 메시지가 도착했어요',
    };
  }
  if (relatedType === 'message_room') {
    return {
      title: '익명 채팅',
      body: body || '새 메시지가 도착했어요',
    };
  }
  return {
    title,
    body,
  };
}