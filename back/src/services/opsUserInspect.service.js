import pool from '../config/database.js';
import { inspectBadgesForUser } from './badge.service.js';
import { resolveUserName } from './userPii.service.js';
import { getMergedTimetableForUserId } from '../routes/timetable.js';
import { formatKstDateYmd } from './reverification.service.js';
import { getSchoolTermContext, holidayOnYmd } from './schoolTerms.service.js';
import { evaluateSchoolDay, toYmd } from '../utils/schoolDay.js';

const WEEKDAYS = ['월', '화', '수', '목', '금'];

/** @returns {'ios'|'android'|'other'|null} */
function inferOsFromUa(ua) {
  const s = String(ua || '');
  if (!s) return null;
  if (/iPhone|iPad|iPod|CFNetwork|Darwin/i.test(s)) return 'ios';
  if (/Android|okhttp/i.test(s)) return 'android';
  return 'other';
}

/** @returns {'ios'|'android'|'other'|null} */
function inferOsFromDeviceId(deviceId) {
  const s = String(deviceId || '').toLowerCase();
  if (s.startsWith('ios-') || s.startsWith('ios_')) return 'ios';
  if (s.startsWith('android-') || s.startsWith('android_')) return 'android';
  return null;
}

function normalizeOs(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'ios' || s === 'iphone' || s === 'ipad') return 'ios';
  if (s === 'android') return 'android';
  if (!s) return null;
  return 'other';
}

async function loadUserDevices(userId) {
  const [fcmRows, deviceRows] = await Promise.all([
    pool.execute(
      `SELECT id, device_id, device_type, app_version, is_active, last_used_at, updated_at
       FROM fcm_tokens
       WHERE user_id = ?
       ORDER BY COALESCE(last_used_at, updated_at) DESC, id DESC`,
      [userId],
    ).then(([rows]) => rows),
    pool.execute(
      `SELECT id, device_id, device_info, ip_address, last_login_at, created_at
       FROM user_devices
       WHERE user_id = ?
       ORDER BY COALESCE(last_login_at, created_at) DESC, id DESC`,
      [userId],
    ).then(([rows]) => rows),
  ]);

  const byKey = new Map();

  const upsert = (key, patch) => {
    const k = String(key || '').trim() || `anon-${byKey.size}`;
    const prev = byKey.get(k) || {
      deviceId: k.startsWith('anon-') || k.startsWith('fcm-') || k.startsWith('login-') ? null : k,
      os: null,
      osSource: null,
      appVersion: null,
      lastSeenAt: null,
      lastLoginAt: null,
      pushActive: null,
      ipAddress: null,
      userAgent: null,
    };
    const next = { ...prev };

    if (patch.deviceId != null) next.deviceId = patch.deviceId;
    if (patch.appVersion != null) next.appVersion = patch.appVersion;
    if (patch.lastLoginAt != null) next.lastLoginAt = patch.lastLoginAt;
    if (patch.pushActive != null) next.pushActive = patch.pushActive;
    if (patch.ipAddress != null) next.ipAddress = patch.ipAddress;
    if (patch.userAgent != null) next.userAgent = patch.userAgent;
    if (patch.lastSeenAt != null) {
      const prevTs = prev.lastSeenAt ? new Date(prev.lastSeenAt).getTime() : 0;
      const nextTs = new Date(patch.lastSeenAt).getTime();
      if (!prev.lastSeenAt || nextTs >= prevTs) next.lastSeenAt = patch.lastSeenAt;
    }

    // fcm device_type > device_id prefix > user-agent
    const rank = { fcm: 3, device_id: 2, user_agent: 1 };
    const prevRank = rank[prev.osSource] || 0;
    const patchRank = rank[patch.osSource] || 0;
    if (patch.os && patchRank >= prevRank) {
      next.os = patch.os;
      next.osSource = patch.osSource;
    }

    byKey.set(k, next);
  };

  for (const r of fcmRows) {
    const deviceId = r.device_id ? String(r.device_id) : null;
    const os =
      normalizeOs(r.device_type)
      || inferOsFromDeviceId(deviceId);
    const lastSeenAt = r.last_used_at || r.updated_at || null;
    upsert(deviceId || `fcm-${r.id}`, {
      deviceId,
      os,
      osSource: r.device_type ? 'fcm' : (os ? 'device_id' : null),
      appVersion: r.app_version || null,
      lastSeenAt,
      pushActive: Number(r.is_active) === 1,
    });
  }

  for (const r of deviceRows) {
    const deviceId = r.device_id ? String(r.device_id) : null;
    const ua = r.device_info || null;
    const fromId = inferOsFromDeviceId(deviceId);
    const fromUa = inferOsFromUa(ua);
    const os = fromId || fromUa;
    const lastLoginAt = r.last_login_at || r.created_at || null;
    upsert(deviceId || `login-${r.id}`, {
      deviceId,
      os,
      osSource: os ? (fromId ? 'device_id' : 'user_agent') : null,
      lastLoginAt,
      lastSeenAt: lastLoginAt,
      ipAddress: r.ip_address || null,
      userAgent: ua,
    });
  }

  const devices = [...byKey.values()].sort((a, b) => {
    const ta = new Date(a.lastSeenAt || a.lastLoginAt || 0).getTime();
    const tb = new Date(b.lastSeenAt || b.lastLoginAt || 0).getTime();
    return tb - ta;
  });

  const platforms = { ios: 0, android: 0, other: 0, unknown: 0 };
  for (const d of devices) {
    if (d.os === 'ios') platforms.ios += 1;
    else if (d.os === 'android') platforms.android += 1;
    else if (d.os === 'other') platforms.other += 1;
    else platforms.unknown += 1;
  }

  const primaryOs =
    platforms.ios && !platforms.android ? 'ios'
      : platforms.android && !platforms.ios ? 'android'
        : platforms.ios && platforms.android ? 'mixed'
          : null;

  return { devices, platforms, primaryOs };
}

function timetableToGrid(cells) {
  const map = cells && typeof cells === 'object' ? cells : {};
  let maxPeriod = 0;
  for (const key of Object.keys(map)) {
    const m = String(key).match(/^[월화수목금]-(\d+)$/);
    if (!m) continue;
    const p = Number(m[1]);
    if (p > maxPeriod) maxPeriod = p;
  }
  if (maxPeriod < 1) {
    return { days: WEEKDAYS, rows: [], cellCount: 0 };
  }
  const rows = [];
  for (let p = 1; p <= maxPeriod; p += 1) {
    rows.push({
      period: p,
      cells: WEEKDAYS.map((d) => {
        const v = map[`${d}-${p}`];
        return v == null ? '' : String(v);
      }),
    });
  }
  return {
    days: WEEKDAYS,
    rows,
    cellCount: Object.keys(map).length,
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function shiftYearMonth(year, month, delta) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function buildMonthWeeks(year, month, presentSet, termCtx, todayYmd) {
  const first = new Date(`${year}-${pad2(month)}-01T12:00:00+09:00`);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i += 1) {
    cells.push({ inMonth: false, ymd: null, present: false, schoolDay: false, reason: null, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const ymd = `${year}-${pad2(month)}-${pad2(d)}`;
    const ev = evaluateSchoolDay({
      ymd,
      terms: termCtx?.terms || [],
      closureSet: termCtx?.closureSet || new Set(),
      anniversaryMd: termCtx?.anniversaryMd || null,
      isPublicHoliday: holidayOnYmd(ymd),
    });
    cells.push({
      inMonth: true,
      ymd,
      day: d,
      present: presentSet.has(ymd),
      schoolDay: Boolean(ev.schoolDay),
      reason: ev.reason,
      isToday: ymd === todayYmd,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ inMonth: false, ymd: null, present: false, schoolDay: false, reason: null, isToday: false });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, label: `${year}-${pad2(month)}`, weeks };
}

async function loadAttendanceCalendar(userId, schoolId) {
  const todayYmd = formatKstDateYmd();
  const ty = Number(todayYmd.slice(0, 4));
  const tm = Number(todayYmd.slice(5, 7));
  const prev = shiftYearMonth(ty, tm, -1);
  const fromYmd = `${prev.year}-${pad2(prev.month)}-01`;

  const [attRows, termCtx] = await Promise.all([
    pool.execute(
      `SELECT attendance_date, status, checked_at
       FROM attendances
       WHERE user_id = ? AND attendance_date >= ? AND attendance_date <= ?
       ORDER BY attendance_date ASC`,
      [userId, fromYmd, todayYmd],
    ).then(([rows]) => rows),
    schoolId ? getSchoolTermContext(schoolId) : Promise.resolve(null),
  ]);

  const presentSet = new Set(
    attRows
      .filter((r) => String(r.status || 'present') === 'present')
      .map((r) => toYmd(r.attendance_date))
      .filter(Boolean),
  );

  const months = [
    buildMonthWeeks(prev.year, prev.month, presentSet, termCtx, todayYmd),
    buildMonthWeeks(ty, tm, presentSet, termCtx, todayYmd),
  ];

  return {
    todayYmd,
    todayCheckedIn: presentSet.has(todayYmd),
    presentCount: presentSet.size,
    months,
  };
}

export async function inspectOpsUser(queryRaw) {
  const q = String(queryRaw || '').trim().replace(/^@/, '');
  if (!q) {
    return { error: 'QUERY_REQUIRED', status: 400, message: '아이디 또는 사용자 번호를 입력하세요.' };
  }

  const numericId = /^\d+$/.test(q) ? Number(q) : null;
  let row = null;
  if (numericId) {
    const [[byId]] = await pool.execute(
      `SELECT
         u.id, u.username, u.name_enc, u.school_id, u.grade, u.class_number,
         sch.name AS school_name
       FROM users u
       LEFT JOIN schools sch ON sch.school_id = u.school_id
       WHERE u.id = ? AND u.is_deleted = FALSE
       LIMIT 1`,
      [numericId],
    );
    row = byId || null;
  }
  if (!row) {
    const [[byName]] = await pool.execute(
      `SELECT
         u.id, u.username, u.name_enc, u.school_id, u.grade, u.class_number,
         sch.name AS school_name
       FROM users u
       LEFT JOIN schools sch ON sch.school_id = u.school_id
       WHERE u.username = ? AND u.is_deleted = FALSE
       LIMIT 1`,
      [q],
    );
    row = byName || null;
  }
  if (!row) {
    return { error: 'NOT_FOUND', status: 404, message: '해당 사용자를 찾지 못했습니다.' };
  }

  const userId = row.id;
  const [badgePack, friendRow, counts, timetablePack, attendance, devicePack] = await Promise.all([
    inspectBadgesForUser(userId),
    pool.execute(
      `SELECT COUNT(*) AS c
       FROM user_friendships
       WHERE status = 'accepted'
         AND (requester_id = ? OR addressee_id = ?)`,
      [userId, userId],
    ).then(([rows]) => rows[0]),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE user_id = ? AND is_deleted = FALSE) AS posts,
         (SELECT COUNT(*) FROM comments WHERE user_id = ? AND is_deleted = FALSE) AS comments`,
      [userId, userId],
    ).then(([rows]) => rows[0]),
    getMergedTimetableForUserId(userId),
    loadAttendanceCalendar(userId, row.school_id),
    loadUserDevices(userId),
  ]);

  const grid = timetableToGrid(timetablePack?.cells);
  const ownedCount = (badgePack.badges || []).filter((b) => b.owned).length;
  const lockedCount = (badgePack.badges || []).length - ownedCount;

  return {
    user: {
      id: userId,
      username: row.username,
      displayName: resolveUserName(row) || null,
      schoolName: row.school_name || null,
      grade: row.grade,
      classNumber: row.class_number,
    },
    stats: {
      friendCount: Number(friendRow?.c || 0),
      postCount: Number(counts?.posts || 0),
      commentCount: Number(counts?.comments || 0),
      todayCheckedIn: Boolean(attendance.todayCheckedIn),
      attendancePresentCount: Number(attendance.presentCount || 0),
      primaryOs: devicePack.primaryOs,
      deviceCount: devicePack.devices.length,
    },
    devices: devicePack.devices,
    devicePlatforms: devicePack.platforms,
    attendance,
    badges: {
      ownedCount,
      lockedCount,
      equippedBadgeKey: badgePack.equippedBadgeKey,
      items: badgePack.badges,
    },
    timetable: {
      ...grid,
      source: timetablePack?.source || { neis: false, override: false },
      overrideUpdatedAt: timetablePack?.overrideUpdatedAt || null,
    },
  };
}
