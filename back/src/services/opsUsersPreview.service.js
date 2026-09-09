import pool from '../config/database.js';
import { formatKstDateYmd } from './reverification.service.js';

function normalizeOs(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'ios' || s === 'iphone' || s === 'ipad') return 'ios';
  if (s === 'android') return 'android';
  if (!s) return null;
  return 'other';
}

function inferOsFromUa(ua) {
  const s = String(ua || '');
  if (!s) return null;
  if (/iPhone|iPad|iPod|CFNetwork|Darwin/i.test(s)) return 'ios';
  if (/Android|okhttp/i.test(s)) return 'android';
  return 'other';
}

function parseSemverParts(v) {
  const raw = String(v || '')
    .trim()
    .replace(/^v/i, '');
  const m = raw.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0];
}

function compareSemver(a, b) {
  const pa = parseSemverParts(a);
  const pb = parseSemverParts(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function resolveReferenceAppVersion(distinctVersions) {
  const fromEnv = String(
    process.env.ADMIN_LATEST_APP_VERSION ||
      process.env.CURRENT_APP_VERSION ||
      '',
  ).trim();
  if (fromEnv && parseSemverParts(fromEnv)) return fromEnv.replace(/^v/i, '');

  let best = null;
  for (const v of distinctVersions) {
    if (!parseSemverParts(v)) continue;
    if (best == null || compareSemver(v, best) > 0) best = String(v).trim();
  }
  return best;
}

/**
 * @param {{ page?: number, limit?: number, q?: string }} opts
 */
export async function listOpsUsersPreview({ page = 1, limit = 20, q = '' } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;
  const todayYmd = formatKstDateYmd(new Date());

  const trimmedQ = String(q || '').trim();
  let whereSql = 'u.is_deleted = FALSE';
  const params = [];

  if (trimmedQ) {
    if (/^#?\d+$/.test(trimmedQ)) {
      const id = Number(trimmedQ.replace(/^#/, ''));
      whereSql += ' AND u.id = ?';
      params.push(id);
    } else {
      const like = `%${trimmedQ.replace(/^@+/, '')}%`;
      whereSql += ' AND (u.username LIKE ? OR s.name LIKE ?)';
      params.push(like, like);
    }
  }

  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM users u
     LEFT JOIN schools s ON s.school_id = u.school_id
     WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRow?.total || 0);

  const [rows] = await pool.execute(
    `SELECT
       u.id,
       u.username,
       u.grade,
       u.class_number,
       u.last_seen_at,
       s.name AS school_name,
       (SELECT MAX(COALESCE(ud.last_login_at, ud.created_at))
        FROM user_devices ud WHERE ud.user_id = u.id) AS last_login_at,
       (SELECT MAX(COALESCE(ft.last_used_at, ft.updated_at))
        FROM fcm_tokens ft WHERE ft.user_id = u.id) AS last_token_at,
       (SELECT ft.device_type FROM fcm_tokens ft
        WHERE ft.user_id = u.id
        ORDER BY COALESCE(ft.last_used_at, ft.updated_at) DESC, ft.id DESC
        LIMIT 1) AS device_type,
       (SELECT ft.app_version FROM fcm_tokens ft
        WHERE ft.user_id = u.id
        ORDER BY COALESCE(ft.last_used_at, ft.updated_at) DESC, ft.id DESC
        LIMIT 1) AS app_version,
       (SELECT ud.device_info FROM user_devices ud
        WHERE ud.user_id = u.id
        ORDER BY COALESCE(ud.last_login_at, ud.created_at) DESC, ud.id DESC
        LIMIT 1) AS device_info,
       (SELECT 1 FROM attendances a
        WHERE a.user_id = u.id AND a.attendance_date = ? LIMIT 1) AS checked_in_today
     FROM users u
     LEFT JOIN schools s ON s.school_id = u.school_id
     WHERE ${whereSql}
     ORDER BY u.id DESC
     LIMIT ${limitNum} OFFSET ${offset}`,
    [...params, todayYmd],
  );

  const [verRows] = await pool.execute(
    `SELECT DISTINCT app_version
     FROM fcm_tokens
     WHERE app_version IS NOT NULL AND TRIM(app_version) != ''
     LIMIT 300`,
  );
  const latestAppVersion = resolveReferenceAppVersion(
    verRows.map((r) => r.app_version),
  );

  const items = rows.map((row) => {
    const lastActivity =
      row.last_seen_at || row.last_token_at || row.last_login_at || null;
    const os =
      normalizeOs(row.device_type) ||
      inferOsFromUa(row.device_info) ||
      '—';
    const appVersion = row.app_version || '—';
    const isLatestAppVersion =
      Boolean(latestAppVersion) &&
      appVersion !== '—' &&
      compareSemver(appVersion, latestAppVersion) === 0;
    return {
      id: row.id,
      username: row.username,
      schoolName: row.school_name || '—',
      grade: row.grade,
      classNumber: row.class_number,
      os,
      appVersion,
      isLatestAppVersion,
      checkedInToday: Boolean(row.checked_in_today),
      lastSeenAt: row.last_seen_at
        ? new Date(row.last_seen_at).toISOString()
        : null,
      lastActivityAt: lastActivity
        ? new Date(lastActivity).toISOString()
        : null,
    };
  });

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.max(1, Math.ceil(total / limitNum)),
    latestAppVersion,
  };
}
