import pool from '../config/database.js';
import { getIO } from '../socketServer.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { upsertStudyDayTotalForUserKey } from '../utils/studyDayTotal.js';

// in-memory throttle map: key = `${fromUserId}:${targetUserId}`
const lastPokeAtMap = new Map();
const POKE_COOLDOWN_MS = 30 * 1000; // 30초 쿨타임

// 공부 끝나면 알려줘 요청: key = targetUserId, value = Set<watcherUserId>
const notifyOnStopMap = new Map();

// 현재 공부 상태 in-memory 캐시 (실시간 소켓 수신용 보조, REST 조회는 DB 사용)
const currentTimerStatusMap = new Map();

const KST_NOW_DATETIME_SQL = `CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')`;

// ── 세션 DB 저장 (소켓 수신 시 호출) ─────────────────────

/**
 * 타이머 시작 시: 기존 미완료 세션 종료 후 새 세션 INSERT
 * @param {{ userId: number, dayKey: string, subjectId?: number|null, subjectName?: string|null }}
 */
export async function upsertStudySessionStart({ userId, dayKey, subjectId, subjectName }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [prevRows] = await connection.execute(
      `SELECT id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key_fmt
       FROM study_sessions
       WHERE user_id = ? AND ended_at IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [userId],
    );
    const prev = prevRows[0];
    if (prev?.id != null) {
      const [endPrev] = await connection.execute(
        `UPDATE study_sessions
         SET ended_at = ${KST_NOW_DATETIME_SQL}
         WHERE id = ? AND user_id = ? AND ended_at IS NULL`,
        [prev.id, userId],
      );
      if (endPrev.affectedRows > 0 && prev.day_key_fmt) {
        await upsertStudyDayTotalForUserKey(
          connection,
          userId,
          prev.day_key_fmt.slice(0, 10),
        );
      }
    }
    await connection.execute(
      `INSERT INTO study_sessions (user_id, day_key, subject_id, subject_name, started_at, ended_at)
       VALUES (?, ?, ?, ?, ${KST_NOW_DATETIME_SQL}, NULL)`,
      [
        userId,
        dayKey,
        subjectId != null ? subjectId : null,
        subjectName != null && subjectName !== '' ? String(subjectName).slice(0, 100) : null,
      ],
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 타이머 종료 시: 해당 유저의 미완료 세션 1건을 현재 시각 기준으로 종료
 */
export async function closeStudySession({ userId }) {
  const [rows] = await pool.execute(
    `SELECT id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key_fmt
     FROM study_sessions
     WHERE user_id = ? AND ended_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row?.id) return;
  const [upd] = await pool.execute(
    `UPDATE study_sessions
     SET ended_at = ${KST_NOW_DATETIME_SQL}
     WHERE id = ? AND user_id = ? AND ended_at IS NULL`,
    [row.id, userId],
  );
  if (upd.affectedRows > 0 && row.day_key_fmt) {
    await upsertStudyDayTotalForUserKey(
      pool,
      userId,
      String(row.day_key_fmt).slice(0, 10),
    );
  }
}

/**
 * 앱 재실행 시: 해당 유저의 모든 미완료 세션을 현재 시각(또는 해당 일자 마감) 기준으로 종료
 */
export async function closeIncompleteStudySessions({ userId }) {
  const [rows] = await pool.execute(
    'SELECT id FROM study_sessions WHERE user_id = ? AND ended_at IS NULL',
    [userId],
  );
  if (rows.length === 0) return;
  await closeStudySession({ userId });
  // 세션을 정리했다면 친구들에게도 더 이상 공부 중이 아님을 알려준다.
  await broadcastTimerStatus({ userId, status: 'idle' });
}

export async function sendFriendPoke({ fromUserId, targetUserId }) {
  const now = Date.now();
  const key = `${fromUserId}:${targetUserId}`;
  const last = lastPokeAtMap.get(key) || 0;

  if (now - last < POKE_COOLDOWN_MS) {
    return { throttled: true, deliveredViaSocket: false };
  }

  lastPokeAtMap.set(key, now);

  const io = getIO();
  let senderName = '친구';
  try {
    const [senderRows] = await pool.execute(
      'SELECT name FROM users WHERE id = ? LIMIT 1',
      [fromUserId],
    );
    const resolved = String(senderRows?.[0]?.name ?? '').trim();
    if (resolved) senderName = resolved;
  } catch (error) {
    console.warn('[FriendSocket] friend_poke sender 조회 실패:', {
      fromUserId,
      message: error?.message,
    });
  }

  const payload = {
    type: 'friend_poke',
    fromUserId,
    fromName: senderName,
    fromNickname: senderName,
    createdAt: new Date().toISOString(),
  };

  let deliveredViaSocket = false;

  if (io) {
    const room = io.sockets.adapter.rooms.get(`user:${targetUserId}`);
    if (room && room.size > 0) {
      io.to(`user:${targetUserId}`).emit('friend_poke', payload);
      deliveredViaSocket = true;
    }
  }

  if (!deliveredViaSocket) {
    await enqueueNotification({
      userId: targetUserId,
      type: 'poke',
      category: 'timer',
      title: '시스템',
      body: `${senderName} 님이 쿡 찔렀어요! 타이머에서 함께 공부를 시작해보세요`,
      relatedType: 'timer_poke',
      relatedId: fromUserId,
    });
  }

  return { throttled: false, deliveredViaSocket };
}

export async function broadcastTimerStatus({ userId, status }) {
  const io = getIO();
  if (!io) {
    console.warn('[FriendSocket] broadcastTimerStatus: io 인스턴스 없음', {
      userId,
      status,
    });
    return;
  }

  console.log('[FriendSocket] broadcastTimerStatus 호출', { userId, status });

  // 현재 공부 상태 캐시에 반영 (idle 이면 제거)
  if (!status || status === 'idle') {
    currentTimerStatusMap.delete(userId);
  } else {
    currentTimerStatusMap.set(userId, status);
  }

  // 나와 친구 관계인 모든 유저 ID 조회
  const [rows] = await pool.execute(
    `SELECT 
       CASE 
         WHEN requester_id = ? THEN addressee_id
         ELSE requester_id
       END AS friend_id
     FROM user_friendships
     WHERE (requester_id = ? OR addressee_id = ?)
       AND status = 'accepted'`,
    [userId, userId, userId],
  );

  if (!rows.length) {
    console.log('[FriendSocket] 친구가 없어 상태 브로드캐스트 대상 없음', {
      userId,
      status,
    });
    return;
  }

  const payload = {
    type: 'friend_timer_status',
    userId,
    status,
    updatedAt: new Date().toISOString(),
  };

  for (const row of rows) {
    const friendId = row.friend_id;
    io.to(`user:${friendId}`).emit('friend_timer_status', payload);
  }

  // 공부가 끝난 시점(idle)에는 나를 구독한 친구들에게 "공부 끝" 알림 전송
  if (status === 'idle') {
    const watchers = notifyOnStopMap.get(userId);
    console.log('[FriendSocket] idle 상태 - notifyOnStopMap 조회', {
      userId,
      hasWatchers: !!watchers,
      watcherCount: watchers ? watchers.size : 0,
    });
    if (watchers && watchers.size > 0) {
      const finishedAt = new Date().toISOString();

      // 공부를 끝낸 본인에게만 "누가 기다렸는지" 요약 이벤트
      try {
        const watcherIds = Array.from(watchers);
        const placeholders = watcherIds.map(() => '?').join(',');
        const [rowsWatchers] = await pool.execute(
          `SELECT id, name, name_enc, color_id FROM users WHERE id IN (${placeholders})`,
          watcherIds,
        );
        const summaryPayload = {
          type: 'friend_study_finished_summary',
          userId,
          finishedAt,
          watchers: rowsWatchers.map((u) => ({
            userId: u.id,
            name: u.name,
            colorId: u.color_id,
          })),
        };
        console.log('[FriendSocket] friend_study_finished_summary emit', {
          to: userId,
          watcherCount: summaryPayload.watchers.length,
        });
        io.to(`user:${userId}`).emit('friend_study_finished_summary', summaryPayload);

        const watcherNames = rowsWatchers.map((u) => u.name);
        const watcherUserIds = rowsWatchers.map((u) => u.id);
        let summaryBody = '공부 완료!';
        if (watcherNames.length === 1) {
          summaryBody = `공부 완료! ${watcherNames[0]} 님이 기다렸어요`;
        } else if (watcherNames.length > 1) {
          summaryBody = `공부 완료! ${watcherNames[0]} 님 외 ${watcherNames.length - 1}명이 기다렸어요`;
        }
        const isSingleWatcher = watcherUserIds.length === 1;
        const summaryRelatedType = isSingleWatcher
          ? 'study_summary_single'
          : 'study_summary_multi';
        const summaryRelatedId = isSingleWatcher ? watcherUserIds[0] : userId;

        console.log('[FriendSocket] summary notification enqueue', {
          userId,
          watcherCount: watcherUserIds.length,
          relatedType: summaryRelatedType,
          relatedId: summaryRelatedId,
        });

        await enqueueNotification({
          userId,
          type: 'study_finished_summary',
          category: 'system',
          title: '시스템',
          relatedType: summaryRelatedType,
          relatedId: summaryRelatedId,
          body: summaryBody,
          watchers: rowsWatchers.map((u) => ({
            userId: u.id,
            name: u.name,
            colorId: u.color_id,
          })),
        });
      } catch (err) {
        console.error('[FriendSocket] friend_study_finished_summary 생성/emit 오류:', err);
      }

      notifyOnStopMap.delete(userId);
    } else {
      console.log('[FriendSocket] idle 이지만 대기중인 watcher 없음', { userId });
    }
  }
}

/**
 * REST에서 사용할 현재 공부 중인 친구 목록 조회
 * - 친구가 나중에 앱을 켜도 DB에 저장된 세션(진행 중)을 기준으로 조회
 * - study_sessions 에서 ended_at IS NULL && day_key = 오늘(타임머일 키) 인 유저만 반환
 */
export async function getStudyingFriends({ userId }) {
  const [friendRows] = await pool.execute(
    `SELECT 
       CASE 
         WHEN requester_id = ? THEN addressee_id
         ELSE requester_id
       END AS friend_id
     FROM user_friendships
     WHERE (requester_id = ? OR addressee_id = ?)
       AND status = 'accepted'`,
    [userId, userId, userId],
  );

  if (!friendRows.length) return [];

  const friendIds = friendRows.map((r) => r.friend_id);
  const placeholders = friendIds.map(() => '?').join(',');
  const todayTimerDayKey = getTimerDayKey();
  const [studyingRows] = await pool.execute(
    `SELECT DISTINCT user_id
     FROM study_sessions
       WHERE user_id IN (${placeholders})
       AND ended_at IS NULL
       AND day_key = ?`,
    [...friendIds, todayTimerDayKey],
  );

  return studyingRows.map((r) => ({
    userId: r.user_id,
    isStudying: true,
  }));
}

export function addNotifyOnStop({ watcherUserId, targetUserId }) {
  if (!notifyOnStopMap.has(targetUserId)) {
    notifyOnStopMap.set(targetUserId, new Set());
  }
  const set = notifyOnStopMap.get(targetUserId);
  set.add(watcherUserId);
  console.log('[FriendSocket] addNotifyOnStop 등록', {
    targetUserId,
    watcherUserId,
    watcherCount: set.size,
  });
}

