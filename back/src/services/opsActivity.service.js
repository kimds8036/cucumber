import pool from '../config/database.js';
import { addDaysToYmd } from './analytics.service.js';
import { formatKstDateYmd } from './reverification.service.js';
import { resolveUserName } from './userPii.service.js';
import { clampSqlLimit } from '../utils/sqlLimit.js';

function clipPreview(raw) {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '(내용 없음)';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function actorFromUser(row) {
  const displayName = resolveUserName(row);
  return {
    userId: Number(row.user_id || row.id || 0),
    username: row.username || '-',
    displayName: displayName || null,
    schoolName: row.school_name || '-',
    grade: row.grade != null ? Number(row.grade) : null,
    classNumber: row.class_number != null ? Number(row.class_number) : null,
  };
}

function atLabel(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

const KST_DATE_SQL = `DATE(CONVERT_TZ(created_at, '+00:00', '+09:00'))`;

const TABLE_WHITELIST = {
  posts: true,
  comments: true,
  messages: true,
  dm_messages: true,
  personal_mails: true,
  school_mails: true,
};

function assertTable(table) {
  if (!TABLE_WHITELIST[table]) {
    throw new Error(`unsupported ops table: ${table}`);
  }
}

async function countToday(table, extraWhere = '1=1') {
  assertTable(table);
  const today = formatKstDateYmd();
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS c
     FROM ${table}
     WHERE ${KST_DATE_SQL} = ?
       AND ${extraWhere}`,
    [today],
  );
  return Number(row?.c || 0);
}

async function seriesCounts(table, extraWhere, fromYmd, today, windowDays) {
  assertTable(table);
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(${KST_DATE_SQL}, '%Y-%m-%d') AS d, COUNT(*) AS c
     FROM ${table}
     WHERE ${KST_DATE_SQL} BETWEEN ? AND ?
       AND ${extraWhere}
     GROUP BY d
     ORDER BY d ASC`,
    [fromYmd, today],
  );
  const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.c || 0)]));
  const series = [];
  for (let i = 0; i < windowDays; i += 1) {
    const date = addDaysToYmd(fromYmd, i);
    series.push({ date, count: map.get(date) || 0 });
  }
  return series;
}

function mergeSeries(keys, maps, windowDays, fromYmd) {
  const out = [];
  for (let i = 0; i < windowDays; i += 1) {
    const date = addDaysToYmd(fromYmd, i);
    const point = { date };
    for (const key of keys) {
      const item = maps[key].find((s) => s.date === date);
      point[key] = item?.count || 0;
    }
    out.push(point);
  }
  return out;
}

/**
 * 앱 활동 모니터링 — KPI·차트 (피드는 getActivityOpsFeed).
 */
export async function getActivityOpsOverview({ days = 14 } = {}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const today = formatKstDateYmd();
  const fromYmd = addDaysToYmd(today, -(windowDays - 1));

  const [
    todayPosts,
    todayComments,
    todayChat,
    todayDm,
    todayPersonalMail,
    todaySchoolMail,
    postSeries,
    commentSeries,
    chatSeries,
    mailSeries,
  ] = await Promise.all([
    countToday('posts', 'is_deleted = FALSE'),
    countToday('comments', 'is_deleted = FALSE'),
    countToday('messages', '(is_deleted = FALSE OR is_deleted IS NULL)'),
    countToday('dm_messages', '(is_deleted = FALSE OR is_deleted IS NULL)'),
    countToday('personal_mails', 'is_deleted = FALSE'),
    countToday('school_mails', 'is_deleted = FALSE'),
    seriesCounts('posts', 'is_deleted = FALSE', fromYmd, today, windowDays),
    seriesCounts('comments', 'is_deleted = FALSE', fromYmd, today, windowDays),
    seriesCounts('messages', '(is_deleted = FALSE OR is_deleted IS NULL)', fromYmd, today, windowDays),
    seriesCounts('personal_mails', 'is_deleted = FALSE', fromYmd, today, windowDays),
  ]);

  return {
    summary: {
      todayPosts,
      todayComments,
      todayChat: todayChat + todayDm,
      todayPersonalMail,
      todaySchoolMail,
      fromYmd,
      toYmd: today,
    },
    series: mergeSeries(
      ['posts', 'comments', 'chat', 'mail'],
      {
        posts: postSeries,
        comments: commentSeries,
        chat: chatSeries,
        mail: mailSeries,
      },
      windowDays,
      fromYmd,
    ),
  };
}

const FEED_TYPE_KEYS = {
  all: ['post', 'comment', 'chat', 'dm', 'personal_mail', 'school_mail'],
  post: ['post'],
  comment: ['comment'],
  chat: ['chat'],
  dm: ['dm'],
  personal_mail: ['personal_mail'],
  school_mail: ['school_mail'],
};

function resolveFeedTypeKeys(type) {
  const key = String(type || 'all').trim().toLowerCase();
  return FEED_TYPE_KEYS[key] || FEED_TYPE_KEYS.all;
}

function buildFeedSearch(q) {
  const term = String(q || '').trim();
  if (!term || term.length > 100) {
    return { clause: '1=1', params: [] };
  }
  const like = `%${term}%`;
  return {
    clause: `(u.username LIKE ? OR content LIKE ? OR IFNULL(sch.name, '') LIKE ?)`,
    params: [like, like, like],
  };
}

function feedBranchSql(kind) {
  switch (kind) {
    case 'post':
      return {
        sql: `SELECT 'post' AS feed_type,
                     CASE WHEN p.board_type = 'school' THEN '학교 글' ELSE '전국 글' END AS type_label,
                     p.id, p.user_id, p.content, p.created_at, p.board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM posts p
              INNER JOIN users u ON u.id = p.user_id
              LEFT JOIN schools sch ON sch.school_id = u.school_id
              WHERE p.is_deleted = FALSE`,
      };
    case 'comment':
      return {
        sql: `SELECT 'comment' AS feed_type, '댓글' AS type_label,
                     c.id, c.user_id, c.content, c.created_at, NULL AS board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM comments c
              INNER JOIN users u ON u.id = c.user_id
              LEFT JOIN schools sch ON sch.school_id = u.school_id
              WHERE c.is_deleted = FALSE`,
      };
    case 'chat':
      return {
        sql: `SELECT 'chat' AS feed_type, '쪽지' AS type_label,
                     m.id, m.sender_id AS user_id, m.content, m.created_at, NULL AS board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM messages m
              INNER JOIN users u ON u.id = m.sender_id
              LEFT JOIN schools sch ON sch.school_id = u.school_id
              WHERE (m.is_deleted = FALSE OR m.is_deleted IS NULL)`,
      };
    case 'dm':
      return {
        sql: `SELECT 'dm' AS feed_type, '채팅' AS type_label,
                     m.id, m.sender_id AS user_id, m.content, m.created_at, NULL AS board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM dm_messages m
              INNER JOIN users u ON u.id = m.sender_id
              LEFT JOIN schools sch ON sch.school_id = u.school_id
              WHERE (m.is_deleted = FALSE OR m.is_deleted IS NULL)`,
      };
    case 'personal_mail':
      return {
        sql: `SELECT 'personal_mail' AS feed_type, '개인 우편' AS type_label,
                     pm.id, pm.sender_id AS user_id, pm.content, pm.created_at, NULL AS board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM personal_mails pm
              INNER JOIN users u ON u.id = pm.sender_id
              LEFT JOIN schools sch ON sch.school_id = u.school_id
              WHERE pm.is_deleted = FALSE`,
      };
    case 'school_mail':
      return {
        sql: `SELECT 'school_mail' AS feed_type, '학교 우편' AS type_label,
                     sm.id, sm.user_id, sm.content, sm.created_at, NULL AS board_type,
                     u.username, u.name_enc, u.grade, u.class_number,
                     sch.name AS school_name
              FROM school_mails sm
              INNER JOIN users u ON u.id = sm.user_id
              LEFT JOIN schools sch ON sch.school_id = COALESCE(sm.school_id, u.school_id)
              WHERE sm.is_deleted = FALSE`,
      };
    default:
      throw new Error(`unsupported feed kind: ${kind}`);
  }
}

function mapFeedRow(r) {
  const actor = actorFromUser(r);
  return {
    type: r.feed_type,
    typeLabel: r.type_label,
    id: r.id,
    at: atLabel(r.created_at),
    preview: clipPreview(r.content),
    schoolName: actor.schoolName,
    ...actor,
  };
}

/** 앱 활동 피드 — 페이지·유형·검색 */
export async function getActivityOpsFeed({
  page = 1,
  limit = 30,
  type = 'all',
  q = '',
} = {}) {
  const pageNum = Math.max(1, Math.trunc(Number(page) || 1));
  const rowLimit = clampSqlLimit(limit, { def: 30, min: 10, max: 50 });
  const offset = (pageNum - 1) * rowLimit;
  const kinds = resolveFeedTypeKeys(type);
  const search = buildFeedSearch(q);

  const branches = kinds.map((kind) => {
    const branch = feedBranchSql(kind);
    return {
      sql: `${branch.sql} AND ${search.clause}`,
      params: [...search.params],
    };
  });

  const unionSql = branches.map((b) => `(${b.sql})`).join(' UNION ALL ');
  const params = branches.flatMap((b) => b.params);

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM (${unionSql}) AS merged`,
    params,
  );
  const total = Number(countRow?.total || 0);

  const [rows] = await pool.query(
    `SELECT * FROM (${unionSql}) AS merged
     ORDER BY created_at DESC
     LIMIT ${rowLimit} OFFSET ${offset}`,
    params,
  );

  return {
    feed: (rows || []).map(mapFeedRow),
    pagination: {
      page: pageNum,
      limit: rowLimit,
      total,
    },
    filters: {
      type: kinds.length === FEED_TYPE_KEYS.all.length ? 'all' : kinds[0],
      q: String(q || '').trim(),
    },
  };
}
