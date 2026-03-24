import pool from '../config/database.js';

/**
 * notifications 테이블에 알림 한 건을 기록합니다.
 * 이 함수 실패로 인해 원래 비즈니스 로직이 깨지지 않도록 내부에서 오류는 잡아서 로그만 남깁니다.
 */
export async function createNotification({
  userId,
  type,
  category,
  title,
  body,
  relatedType = null,
  relatedId = null,
}) {
  try {
    if (!userId) return;

    await pool.execute(
      `INSERT INTO notifications
         (user_id, type, category, title, body, related_type, related_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, category, title, body || null, relatedType, relatedId],
    );
  } catch (error) {
    console.error('알림 생성 오류:', error);
    // 알림 오류는 메인 요청을 막지 않음
  }
}

