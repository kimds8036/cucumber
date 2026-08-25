import pool from '../config/database.js';
import { addDaysToYmd } from './analytics.service.js';
import { formatKstDateYmd } from './reverification.service.js';
import { resolveUserName } from './userPii.service.js';

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
 * 앱 활동 모니터링 — 학교·아이디·미리보기. 본문 전문은 신고 화면에서.
 */
export async function getActivityOpsOverview({ days = 14, feedLimit = 40 } = {}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const limit = Math.min(Math.max(Number(feedLimit) || 40, 10), 80);
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

  const [postRows] = await pool.execute(
    `SELECT p.id, p.user_id, p.content, p.created_at, p.board_type,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE p.is_deleted = FALSE
     ORDER BY p.id DESC
     LIMIT ?`,
    [limit],
  );

  const [commentRows] = await pool.execute(
    `SELECT c.id, c.user_id, c.content, c.created_at, c.post_id,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM comments c
     INNER JOIN users u ON u.id = c.user_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE c.is_deleted = FALSE
     ORDER BY c.id DESC
     LIMIT ?`,
    [limit],
  );

  const [chatRows] = await pool.execute(
    `SELECT m.id, m.sender_id AS user_id, m.content, m.created_at,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE (m.is_deleted = FALSE OR m.is_deleted IS NULL)
     ORDER BY m.id DESC
     LIMIT ?`,
    [limit],
  );

  const [dmRows] = await pool.execute(
    `SELECT m.id, m.sender_id AS user_id, m.content, m.created_at,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM dm_messages m
     INNER JOIN users u ON u.id = m.sender_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE (m.is_deleted = FALSE OR m.is_deleted IS NULL)
     ORDER BY m.id DESC
     LIMIT ?`,
    [limit],
  );

  const [mailRows] = await pool.execute(
    `SELECT pm.id, pm.sender_id AS user_id, pm.content, pm.created_at,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM personal_mails pm
     INNER JOIN users u ON u.id = pm.sender_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE pm.is_deleted = FALSE
     ORDER BY pm.id DESC
     LIMIT ?`,
    [limit],
  );

  const [schoolMailRows] = await pool.execute(
    `SELECT sm.id, sm.user_id, sm.content, sm.created_at,
            u.username, u.name_enc, u.grade, u.class_number,
            sch.name AS school_name
     FROM school_mails sm
     INNER JOIN users u ON u.id = sm.user_id
     LEFT JOIN schools sch ON sch.school_id = COALESCE(sm.school_id, u.school_id)
     WHERE sm.is_deleted = FALSE
     ORDER BY sm.id DESC
     LIMIT ?`,
    [limit],
  );

  const feed = [
    ...postRows.map((r) => ({
      type: 'post',
      typeLabel: r.board_type === 'school' ? '학교 글' : '전국 글',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
    ...commentRows.map((r) => ({
      type: 'comment',
      typeLabel: '댓글',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
    ...chatRows.map((r) => ({
      type: 'chat',
      typeLabel: '쪽지',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
    ...dmRows.map((r) => ({
      type: 'dm',
      typeLabel: '채팅',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
    ...mailRows.map((r) => ({
      type: 'personal_mail',
      typeLabel: '개인 우편',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
    ...schoolMailRows.map((r) => ({
      type: 'school_mail',
      typeLabel: '학교 우편',
      id: r.id,
      at: atLabel(r.created_at),
      preview: clipPreview(r.content),
      ...actorFromUser(r),
    })),
  ]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 80);

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
    feed,
  };
}
