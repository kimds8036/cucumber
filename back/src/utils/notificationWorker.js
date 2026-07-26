/**
 * notificationWorker.js
 *
 * 알림(Notification)을 메시지 전송 로직과 완전히 분리하여
 * 비동기 큐(Bull + Redis)로 처리하는 워커입니다.
 */

import Bull from 'bull';
import { createNotificationOnce } from './notifications.js';
import { emitNotification } from '../socketServer.js';
import { checkNotificationAllowed } from './notificationUtils.js';
import { sendPush } from './pushNotification.js';
import { buildFcmDataPayload } from '../constants/notificationPayload.js';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const notificationQueue = new Bull('notifications', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Bull jobId.
 * - sourceId 가 있으면(댓글·채팅 메시지 등) 이벤트마다 고유 → 연속 알림 가능
 * - 없으면 기존처럼 relatedId 기준 (쿡찌르기·요약 등 의도적 묶음)
 * 재시도 멱등은 job data 의 notificationRecorded/socketEmitted 플래그가 담당.
 */
function buildNotificationJobId(params) {
  const parts = [
    params.userId,
    params.type || '',
    params.category || '',
    params.relatedType || '',
    params.relatedId != null ? String(params.relatedId) : '',
  ];
  if (params.sourceId != null && String(params.sourceId).trim() !== '') {
    parts.push(String(params.sourceId).trim());
  }
  return parts.join(':');
}

notificationQueue.process(async (job) => {
  let data = { ...job.data };

  console.log('[NotifQueue] processing', {
    jobId: job.id,
    attempt: job.attemptsMade + 1,
    userId: data.userId,
    type: data.type,
    relatedType: data.relatedType,
    relatedId: data.relatedId,
    sourceId: data.sourceId ?? null,
  });

  if (!data.notificationRecorded) {
    const { id, created } = await createNotificationOnce({
      userId: data.userId,
      type: data.type,
      category: data.category,
      title: data.title,
      body: data.body,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      watchers: data.watchers,
      sourceId: data.sourceId,
    });
    if (!id) {
      throw new Error('알림 DB 저장 실패 — 재시도');
    }
    data = {
      ...data,
      notificationRecorded: true,
      notificationId: id,
      notificationCreated: created,
    };
    await job.update(data);

    // 5분 윈도우 중복(쿡찌르기 등): 새 row 없으면 소켓/푸시도 보내지 않음
    if (!created) {
      data = { ...data, socketEmitted: true, pushSent: true };
      await job.update(data);
      console.log('[NotifQueue] dedupe hit — socket/push skip', {
        jobId: job.id,
        notificationId: id,
      });
      return;
    }
  }

  if (!data.socketEmitted) {
    try {
      const socketTitle =
        data.relatedType === 'message_room'
          ? buildPushContent({
              title: data.title,
              body: data.body,
              relatedType: data.relatedType,
            }).title
          : data.title;

      emitNotification(data.userId, {
        type: data.type,
        category: data.category,
        title: socketTitle,
        body: data.body,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        watchers: data.watchers,
        ...(data.relatedType === 'dm_room'
          ? {
              senderUserId: data.senderUserId ?? null,
              senderName: data.senderName ?? null,
              senderSchoolName: data.senderSchoolName ?? null,
              senderColorId: data.senderColorId ?? null,
            }
          : {}),
      });
      data = { ...data, socketEmitted: true };
      await job.update(data);
    } catch (err) {
      console.error('[NotifQueue] 소켓 알림 emit 실패(재시도 가능):', err.message);
      throw err;
    }
  }

  if (!data.pushSent) {
    try {
      const pushContent = buildPushContent({
        title: data.title,
        body: data.body,
        relatedType: data.relatedType,
      });

      await sendPush({
        userId: data.userId,
        title: pushContent.title,
        body: pushContent.body,
        data: buildFcmDataPayload({
          type: data.type,
          category: data.category,
          relatedType: data.relatedType,
          relatedId: data.relatedId,
          extras: data.fcmExtras,
        }),
      });
      data = { ...data, pushSent: true };
      await job.update(data);
    } catch (err) {
      console.error('[NotifQueue] FCM 발송 실패(재시도 가능):', err.message);
      throw err;
    }
  }
});

notificationQueue.on('completed', (job) => {
  console.log(`[NotifQueue] 완료 jobId=${job.id} userId=${job.data.userId}`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(
    `[NotifQueue] 실패 jobId=${job?.id} attempts=${job?.attemptsMade} error=${err.message}`,
  );
});

notificationQueue.on('error', (err) => {
  console.error('[NotifQueue] 큐 오류:', err.message);
});

export async function enqueueNotification(params) {
  try {
    const allowed = await checkNotificationAllowed(params.userId, params.type);
    if (!allowed) return;

    const jobId = buildNotificationJobId(params);
    await notificationQueue.add(
      {
        ...params,
        notificationRecorded: false,
        socketEmitted: false,
        pushSent: false,
      },
      { jobId },
    );
  } catch (err) {
    console.error('[NotifQueue] 잡 추가 실패 (무시):', err.message);
  }
}

function buildPushContent({ title, body, relatedType }) {
  if (relatedType === 'personal_mail') {
    return {
      title: '익명',
      body: '새로운 우편이 도착했습니다',
    };
  }
  if (relatedType === 'message_room') {
    return {
      title: '익명',
      body: body || '새 메시지가 도착했어요',
    };
  }
  if (relatedType === 'dm_room') {
    return {
      title: title || '새 메시지',
      body: body || '새 메시지가 도착했어요',
    };
  }
  return {
    title,
    body,
  };
}
