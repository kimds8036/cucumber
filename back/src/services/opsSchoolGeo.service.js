import pool from '../config/database.js';

/**
 * 가입자 있는 학교 좌표 + 인원 (전국 지도용)
 * @returns {Promise<{
 *   summary: { users: number, schools: number, regions: number },
 *   regions: Array<{ region: string, userCount: number, schoolCount: number }>,
 *   schools: Array<{
 *     schoolId: string, name: string, region: string|null,
 *     latitude: number, longitude: number, userCount: number
 *   }>
 * }>}
 */
export async function getOpsSchoolGeoOverview() {
  const [schoolRows] = await pool.execute(
    `SELECT
       s.school_id AS schoolId,
       s.name AS name,
       s.region AS region,
       s.latitude AS latitude,
       s.longitude AS longitude,
       COUNT(u.id) AS userCount
     FROM users u
     INNER JOIN schools s ON s.school_id = u.school_id
     WHERE u.is_deleted = FALSE
       AND s.latitude IS NOT NULL
       AND s.longitude IS NOT NULL
     GROUP BY s.school_id, s.name, s.region, s.latitude, s.longitude
     HAVING COUNT(u.id) >= 1
     ORDER BY userCount DESC, s.name ASC`,
  );

  const [regionRows] = await pool.execute(
    `SELECT
       COALESCE(NULLIF(TRIM(s.region), ''), '미상') AS region,
       COUNT(u.id) AS userCount,
       COUNT(DISTINCT s.school_id) AS schoolCount
     FROM users u
     INNER JOIN schools s ON s.school_id = u.school_id
     WHERE u.is_deleted = FALSE
       AND s.latitude IS NOT NULL
       AND s.longitude IS NOT NULL
     GROUP BY COALESCE(NULLIF(TRIM(s.region), ''), '미상')
     ORDER BY userCount DESC, region ASC`,
  );

  const schools = schoolRows.map((row) => ({
    schoolId: String(row.schoolId),
    name: row.name || '',
    region: row.region || null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    userCount: Number(row.userCount || 0),
  }));

  const regions = regionRows.map((row) => ({
    region: row.region || '미상',
    userCount: Number(row.userCount || 0),
    schoolCount: Number(row.schoolCount || 0),
  }));

  const users = schools.reduce((sum, s) => sum + s.userCount, 0);

  return {
    summary: {
      users,
      schools: schools.length,
      regions: regions.length,
    },
    regions,
    schools,
  };
}
