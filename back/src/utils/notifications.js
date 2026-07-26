import pool from '../config/database.js';

const DEDUPE_WINDOW_MINUTES = 5;

/**
 * 큐 재시도 등으로 동일 알림이 중복 INSERT 되지 않도록 최근 건 조회.
 * sourceId 가 있는 이벤트(댓글·채팅 메시지 등)는 호출부에서 스킵한다.
 */
async function findRecentDuplicateNotification({
  userId,
  type,
  category,
  title,
  relatedType,
  relatedId,
}) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM notifications
     WHERE user_id = ?
       AND type = ?
       AND COALESCE(category, '') = COALESCE(?, '')
       AND title = ?
       AND COALESCE(related_type, '') = COALESCE(?, '')
       AND COALESCE(related_id, 0) = COALESCE(?, 0)
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY id DESC
     LIMIT 1`,
    [
      userId,
      type,
      category ?? null,
      title,
      relatedType ?? null,
      relatedId ?? null,
      DEDUPE_WINDOW_MINUTES,
    ],
  );
  return rows[0]?.id ?? null;
}

/**
 * @param {object} params
 * @param {string} [params.sourceId] 이벤트 고유키. 있으면 5분 윈도우 dedupe 생략
 * @returns {{ id: number|null, created: boolean }}
 */
export async function createNotificationOnce({
  userId,
  type,
  category,
  title,
  body,
  relatedType = null,
  relatedId = null,
  watchers = null,
  sourceId = null,
}) {
  try {
    if (!userId) return { id: null, created: false };

    const hasSourceId =
      sourceId != null && String(sourceId).trim() !== '';

    if (!hasSourceId) {
      const existingId = await findRecentDuplicateNotification({
        userId,
        type,
        category,
        title,
        relatedType,
        relatedId,
      });
      if (existingId) {
        return { id: Number(existingId), created: false };
      }
    }

    const watchersPayload =
      Array.isArray(watchers) && watchers.length > 0
        ? JSON.stringify(watchers)
        : null;

    const [result] = await pool.execute(
      `INSERT INTO notifications
         (user_id, type, category, title, body, related_type, related_id, watchers_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        category,
        title,
        body || null,
        relatedType,
        relatedId,
        watchersPayload,
      ],
    );

    return { id: Number(result.insertId), created: true };
  } catch (error) {
    console.error('알림 생성 오류:', error);
    return { id: null, created: false };
  }
}

/**
 * @deprecated 큐/멱등 경로는 createNotificationOnce 사용
 */
export async function createNotification(params) {
  await createNotificationOnce(params);
}
