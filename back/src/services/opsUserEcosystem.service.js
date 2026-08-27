import pool from '../config/database.js';
import { formatKstDateYmd } from './reverification.service.js';

/**
 * 모니터링 허브용 사용자 생태계 요약 (가벼운 COUNT 위주).
 */
export async function getOpsUserEcosystemSummary() {
  const todayYmd = formatKstDateYmd();

  const [[totals], platformRows, [[mixed]], [[attendance]]] = await Promise.all([
    pool.execute(
      `SELECT
         COUNT(*) AS users,
         COUNT(DISTINCT school_id) AS schools
       FROM users
       WHERE is_deleted = FALSE`,
    ).then(([rows]) => rows),
    pool.execute(
      `SELECT device_type, COUNT(DISTINCT user_id) AS c
       FROM fcm_tokens
       WHERE is_active = 1
         AND device_type IN ('ios', 'android')
         AND user_id IN (SELECT id FROM users WHERE is_deleted = FALSE)
       GROUP BY device_type`,
    ).then(([rows]) => rows),
    pool.execute(
      `SELECT COUNT(*) AS c
       FROM (
         SELECT ft.user_id
         FROM fcm_tokens ft
         INNER JOIN users u ON u.id = ft.user_id AND u.is_deleted = FALSE
         WHERE ft.is_active = 1
           AND ft.device_type IN ('ios', 'android')
         GROUP BY ft.user_id
         HAVING COUNT(DISTINCT ft.device_type) >= 2
       ) mixed`,
    ).then(([rows]) => rows),
    pool.execute(
      `SELECT COUNT(DISTINCT a.user_id) AS c
       FROM attendances a
       INNER JOIN users u ON u.id = a.user_id AND u.is_deleted = FALSE
       WHERE a.attendance_date = ?
         AND a.status = 'present'`,
      [todayYmd],
    ).then(([rows]) => rows),
  ]);

  let iosUsers = 0;
  let androidUsers = 0;
  for (const row of platformRows || []) {
    const n = Number(row.c || 0);
    if (row.device_type === 'ios') iosUsers = n;
    else if (row.device_type === 'android') androidUsers = n;
  }

  return {
    todayYmd,
    users: Number(totals?.users || 0),
    schools: Number(totals?.schools || 0),
    iosUsers,
    androidUsers,
    mixedOsUsers: Number(mixed?.c || 0),
    todayCheckedIn: Number(attendance?.c || 0),
  };
}
