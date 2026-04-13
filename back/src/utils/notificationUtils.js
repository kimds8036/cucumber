import pool from '../config/database.js';

const TYPE_TO_COLUMN = {
  comment: 'new_comment',
  reply: 'new_comment',
  like: 'new_like',
  mail: 'mail_outgoing',
  friend_request: 'friend_request',
  announcement: 'announcement',
  poke: 'push_enabled',
};

export async function checkNotificationAllowed(userId, type) {
  try {
    if (!userId) return true;
    if (type === 'system') return true;

    const [rows] = await pool.execute(
      `SELECT
         push_enabled,
         new_comment,
         new_like,
         mail_outgoing,
         friend_request,
         announcement
       FROM user_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) return true;
    const settings = rows[0];

    if (!Boolean(settings.push_enabled)) return false;

    const column = TYPE_TO_COLUMN[type];
    if (!column) return true;

    return Boolean(settings[column]);
  } catch (error) {
    console.error('[NotificationUtils] 설정 조회 실패(기본 허용):', error);
    return true;
  }
}
