import pool from '../config/database.js';

/**
 * schools.total_students / total_posts / total_school_mails 를
 * 실데이터 기준으로 일괄 갱신한다. (CSV 시드와 무관)
 */
export async function runSchoolStatsJob() {
  try {
    await pool.execute(`
      UPDATE schools s
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM users
        WHERE is_deleted = FALSE
        GROUP BY school_id
      ) um ON um.school_id = s.school_id
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM posts
        WHERE board_type = 'school' AND is_deleted = FALSE
        GROUP BY school_id
      ) pm ON pm.school_id = s.school_id
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM school_mails
        WHERE is_deleted = FALSE
        GROUP BY school_id
      ) mm ON mm.school_id = s.school_id
      SET
        s.total_students = COALESCE(um.c, 0),
        s.total_posts = COALESCE(pm.c, 0),
        s.total_school_mails = COALESCE(mm.c, 0),
        s.stats_updated_at = NOW()
    `);
  } catch (err) {
    console.error('[schoolStats] 집계 실패:', err?.message ?? err);
  }
}
