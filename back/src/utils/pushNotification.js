import pool from '../config/database.js';
import { getMessaging } from '../config/firebase.js';

export async function sendPush({ userId, title, body, data = {} }) {
  try {
    const [rows] = await pool.execute(
      'SELECT fcm_token FROM users WHERE id = ?',
      [userId],
    );
    const token = rows[0]?.fcm_token;
    if (!token) return false;

    const messaging = getMessaging();
    if (!messaging) return false;

    await messaging.send({
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [String(k), String(v)]),
      ),
    });

    console.log(`[FCM] 발송 완료 userId=${userId}`);
    return true;
  } catch (e) {
    console.error(`[FCM] 발송 실패 userId=${userId}:`, e?.message || e);
    return false;
  }
}
