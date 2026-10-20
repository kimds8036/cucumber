import pool from '../config/database.js';
import { sendPush } from '../utils/pushNotification.js';
import { getStudyRoomOpsOverview } from './studyRoom.service.js';
import { notifyDailyPushPickReminder } from './discordWebhook.service.js';

const QUIET_POST_COUNT = 5;
const STUDY_ROOM_MIN_MEMBERS = 8;

export function kstDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function kstIsWeekend(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function dailyPushDiscordHour(date = new Date()) {
  return kstIsWeekend(date) ? 14 : 18;
}

function kstClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { hour: Number(map.hour), minute: Number(map.minute) };
}

function formatRemain(minutes) {
  const mins = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours <= 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

export function describeDailyPushStatus(sent, date = new Date()) {
  const discordHour = dailyPushDiscordHour(date);
  if (sent) {
    return { status: 'sent', statusLabel: '발송 완료', minutesUntilDiscord: 0, discordHour, remainLabel: '' };
  }
  const clock = kstClock(date);
  const minutesUntilDiscord = discordHour * 60 - (clock.hour * 60 + clock.minute);
  if (minutesUntilDiscord <= 0) {
    return { status: 'missed', statusLabel: '오늘 알림 없음', minutesUntilDiscord, discordHour, remainLabel: '' };
  }
  const remainLabel = formatRemain(minutesUntilDiscord);
  if (minutesUntilDiscord <= 120) {
    return {
      status: 'due',
      statusLabel: `Discord 리마인드까지 ${remainLabel}`,
      minutesUntilDiscord,
      discordHour,
      remainLabel,
    };
  }
  return { status: 'pending', statusLabel: '대기 중', minutesUntilDiscord, discordHour, remainLabel };
}

function boardWhere(boardType) {
  return boardType === 'school' ? '학생 게시판' : '전체 게시판';
}

const PHRASE_OPTIONS = [
  { id: 'popular', label: '인기' },
  { id: 'worry', label: '고민' },
  { id: 'question', label: '질문' },
  { id: 'tip', label: '꿀팁' },
  { id: 'review', label: '후기' },
];

export function pushTitle({ phraseKind, topicLabel, boardType }) {
  const where = boardWhere(boardType);
  if (phraseKind === 'worry') return `${where}에 올라온 '고민' 게시글이에요`;
  if (phraseKind === 'question') return `${where}에 새 질문이 올라왔어요`;
  if (phraseKind === 'tip') return `${where}에 올라온 '꿀팁' 게시글이에요`;
  if (phraseKind === 'review') return `${where}에 후기가 올라왔어요`;
  if (phraseKind === 'topic') {
    const label = String(topicLabel || '게시글').trim().slice(0, 30);
    return `${where}에 올라온 '${label}' 게시글이에요`;
  }
  return '오늘의 인기 게시글이에요';
}

function phraseCatalog() {
  return PHRASE_OPTIONS.map((item) => ({
    id: item.id,
    label: item.label,
    titles: {
      national: pushTitle({ phraseKind: item.id, boardType: 'national' }),
      school: pushTitle({ phraseKind: item.id, boardType: 'school' }),
    },
  }));
}

function snippet(text, max = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildMessage({ kind, phraseKind, topicLabel, boardType, content, announcementTitle }) {
  if (kind === 'announcement') {
    return {
      title: '공지사항',
      body: snippet(announcementTitle) || '새 공지가 올라왔어요',
    };
  }
  if (kind === 'study_room') {
    return {
      title: '스터디룸이 활발해요',
      body: '지금 타이머 스터디룸에 참여해 보세요',
    };
  }
  const body = snippet(content) || '게시글을 확인해 보세요';
  return {
    title: pushTitle({ phraseKind, topicLabel, boardType }),
    body,
  };
}

async function listPopularPosts(boardType) {
  const [rows] = await pool.execute(
    `SELECT
       p.id,
       p.board_type,
       p.content,
       p.like_count,
       p.comment_count,
       p.created_at,
       (
         SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',')
         FROM post_tags pt
         INNER JOIN tags t ON t.id = pt.tag_id
         WHERE pt.post_id = p.id
       ) AS tags,
       (
         SELECT COUNT(*)
         FROM reports r
         WHERE r.target_type = 'post'
           AND r.target_id = p.id
           AND r.status IN ('pending', 'processing')
       ) AS report_count
     FROM posts p
     WHERE p.is_deleted = FALSE
       AND p.is_hidden = FALSE
       AND p.board_type = ?
       AND p.created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)
     ORDER BY (p.like_count * 3 + p.comment_count * 2) DESC, p.created_at DESC
     LIMIT 12`,
    [boardType],
  );
  return rows.map((row) => ({
    id: row.id,
    boardType: row.board_type,
    content: snippet(row.content, 120),
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    tags: String(row.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    createdAt: row.created_at,
    reportCount: Number(row.report_count || 0),
  }));
}

async function pendingReportCount(postId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM reports
     WHERE target_type = 'post'
       AND target_id = ?
       AND status IN ('pending', 'processing')`,
    [postId],
  );
  return Number(rows[0]?.cnt || 0);
}

async function todayPostCount() {
  const start = new Date(`${kstDayKey()}T00:00:00+09:00`);
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM posts
     WHERE is_deleted = FALSE
       AND is_hidden = FALSE
       AND created_at >= ?`,
    [start],
  );
  return Number(rows[0]?.cnt || 0);
}

export async function getDailyPushDraft() {
  const dayKey = kstDayKey();
  const [sentRows] = await pool.execute(
    `SELECT p.day_key, p.sent_at, p.kind, p.board_type, p.title, p.body, p.recipient_count,
            p.discord_reminded_at, a.name AS admin_name
     FROM daily_admin_pushes p
     LEFT JOIN admin_users a ON a.id = p.admin_user_id
     WHERE p.day_key = ?
     LIMIT 1`,
    [dayKey],
  );
  const sent = sentRows[0]?.sent_at ? sentRows[0] : null;
  const [national, school, announcements, postCount, study] = await Promise.all([
    listPopularPosts('national'),
    listPopularPosts('school'),
    pool.execute(
      `SELECT id, title, published_at
       FROM announcements
       WHERE status = 'published'
       ORDER BY published_at DESC
       LIMIT 8`,
    ).then(([rows]) => rows),
    todayPostCount(),
    getStudyRoomOpsOverview().catch(() => ({ memberCount: 0 })),
  ]);
  const memberCount = Number(study?.memberCount || 0);
  const [recentRows] = await pool.execute(
    `SELECT p.day_key, p.kind, p.title, p.recipient_count, p.sent_at, a.name AS admin_name
     FROM daily_admin_pushes p
     LEFT JOIN admin_users a ON a.id = p.admin_user_id
     WHERE p.sent_at IS NOT NULL
     ORDER BY p.day_key DESC
     LIMIT 7`,
  );
  const [pushedRows] = await pool.execute(
    `SELECT post_id, day_key
     FROM daily_admin_pushes
     WHERE sent_at IS NOT NULL
       AND post_id IS NOT NULL
       AND sent_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)`,
  );
  const recentPostDays = {};
  pushedRows.forEach((row) => {
    if (row.post_id) recentPostDays[String(row.post_id)] = row.day_key;
  });
  const status = describeDailyPushStatus(sent);
  return {
    dayKey,
    discordHour: status.discordHour,
    status: status.status,
    statusLabel: status.statusLabel,
    minutesUntilDiscord: status.minutesUntilDiscord,
    remainLabel: status.remainLabel,
    canSendRoles: ['최고관리자', '운영관리자', '고객지원'],
    phrases: phraseCatalog(),
    customPattern: {
      national: "전체 게시판에 올라온 '{label}' 게시글이에요",
      school: "학생 게시판에 올라온 '{label}' 게시글이에요",
    },
    recentPostDays,
    recent: recentRows.map((row) => ({
      dayKey: row.day_key,
      kind: row.kind,
      title: row.title,
      recipientCount: Number(row.recipient_count || 0),
      sentAt: row.sent_at,
      adminName: row.admin_name || '',
    })),
    sent: sent
      ? {
          sentAt: sent.sent_at,
          kind: sent.kind,
          boardType: sent.board_type,
          title: sent.title,
          body: sent.body,
          recipientCount: Number(sent.recipient_count || 0),
          adminName: sent.admin_name || '',
        }
      : null,
    posts: { national, school },
    announcements: announcements.map((row) => ({
      id: row.id,
      title: row.title,
      publishedAt: row.published_at,
    })),
    studyRoom: {
      memberCount,
      offered: postCount < QUIET_POST_COUNT && memberCount >= STUDY_ROOM_MIN_MEMBERS,
      todayPostCount: postCount,
    },
  };
}

async function loadPost(postId) {
  const [rows] = await pool.execute(
    `SELECT id, board_type, content
     FROM posts
     WHERE id = ? AND is_deleted = FALSE AND is_hidden = FALSE
     LIMIT 1`,
    [postId],
  );
  return rows[0] || null;
}

async function loadAnnouncement(id) {
  const [rows] = await pool.execute(
    `SELECT id, title
     FROM announcements
     WHERE id = ? AND status = 'published'
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function recipientIds() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN fcm_tokens ft ON ft.user_id = u.id AND ft.is_active = TRUE
     WHERE u.deleted_at IS NULL`,
  );
  return rows.map((row) => Number(row.id)).filter((id) => id > 0);
}

const PHRASE_KINDS = new Set(['popular', 'worry', 'question', 'tip', 'review', 'topic']);

export async function sendDailyAdminPush({
  adminUserId,
  kind,
  boardType,
  postId,
  announcementId,
  phraseKind,
  topicLabel,
  confirmReported = false,
}) {
  const dayKey = kstDayKey();
  const draft = await getDailyPushDraft();
  if (draft.sent) {
    return { ok: false, status: 409, message: '오늘 알림은 이미 보냈습니다.' };
  }

  let message;
  let resolvedBoard = boardType === 'school' ? 'school' : 'national';
  let resolvedPostId = null;
  let resolvedAnnouncementId = null;
  let resolvedPhrase = phraseKind === 'topic' ? 'topic' : 'popular';
  let data = { type: 'daily_admin', relatedType: 'daily_admin', kind };

  if (kind === 'post') {
    const post = await loadPost(postId);
    if (!post) return { ok: false, status: 404, message: '게시글을 찾을 수 없습니다.' };
    resolvedBoard = post.board_type === 'school' ? 'school' : 'national';
    resolvedPostId = Number(post.id);
    resolvedPhrase = PHRASE_KINDS.has(phraseKind) ? phraseKind : 'popular';
    if (resolvedPhrase === 'topic' && !String(topicLabel || '').trim()) {
      return { ok: false, status: 400, message: '분류 이름을 입력해 주세요.' };
    }
    const reportCount = await pendingReportCount(resolvedPostId);
    if (reportCount > 0 && !confirmReported) {
      return {
        ok: false,
        status: 409,
        message: `처리 안 된 신고가 ${reportCount}건 있습니다. 내용을 확인했다면 다시 보내 주세요.`,
        reportCount,
      };
    }
    message = buildMessage({
      kind,
      phraseKind: resolvedPhrase,
      topicLabel,
      boardType: resolvedBoard,
      content: post.content,
    });
    data = {
      ...data,
      targetScreen: 'BoardDetail',
      relatedId: String(resolvedPostId),
      boardType: resolvedBoard,
      requiresStudentVerification: resolvedBoard === 'school' ? '1' : '0',
    };
  } else if (kind === 'announcement') {
    const announcement = await loadAnnouncement(announcementId);
    if (!announcement) return { ok: false, status: 404, message: '게시 중인 공지가 아닙니다.' };
    resolvedAnnouncementId = Number(announcement.id);
    resolvedBoard = null;
    resolvedPhrase = 'notice';
    message = buildMessage({ kind, announcementTitle: announcement.title });
    data = {
      ...data,
      targetScreen: 'AnnouncementDetail',
      relatedId: String(resolvedAnnouncementId),
      requiresStudentVerification: '0',
    };
  } else if (kind === 'study_room') {
    if (!draft.studyRoom.offered) {
      return { ok: false, status: 400, message: '스터디룸 알림을 보낼 조건이 아닙니다.' };
    }
    resolvedBoard = null;
    resolvedPhrase = 'study';
    message = buildMessage({ kind });
    data = {
      ...data,
      targetScreen: 'Timer',
      requiresStudentVerification: '0',
    };
  } else {
    return { ok: false, status: 400, message: '알림 종류를 확인해 주세요.' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO daily_admin_pushes (day_key) VALUES (?)
       ON DUPLICATE KEY UPDATE day_key = day_key`,
      [dayKey],
    );
    const [locked] = await connection.execute(
      `SELECT sent_at FROM daily_admin_pushes WHERE day_key = ? FOR UPDATE`,
      [dayKey],
    );
    if (locked[0]?.sent_at) {
      await connection.rollback();
      return { ok: false, status: 409, message: '오늘 알림은 이미 보냈습니다.' };
    }
    await connection.execute(
      `UPDATE daily_admin_pushes
       SET sent_at = NOW(),
           kind = ?,
           board_type = ?,
           post_id = ?,
           announcement_id = ?,
           phrase_kind = ?,
           topic_label = ?,
           title = ?,
           body = ?,
           admin_user_id = ?
       WHERE day_key = ?`,
      [
        kind,
        resolvedBoard,
        resolvedPostId,
        resolvedAnnouncementId,
        resolvedPhrase,
        topicLabel ? String(topicLabel).trim().slice(0, 30) : null,
        message.title,
        message.body,
        adminUserId || null,
        dayKey,
      ],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const ids = await recipientIds();
  let sentUsers = 0;
  for (let index = 0; index < ids.length; index += 15) {
    const slice = ids.slice(index, index + 15);
    const results = await Promise.all(
      slice.map((userId) => sendPush({
        userId,
        title: message.title,
        body: message.body,
        data,
      })),
    );
    sentUsers += results.filter(Boolean).length;
  }
  await pool.execute(
    `UPDATE daily_admin_pushes SET recipient_count = ? WHERE day_key = ?`,
    [sentUsers, dayKey],
  );
  return { ok: true, dayKey, title: message.title, body: message.body, recipientCount: sentUsers };
}

export async function remindDailyAdminPushIfNeeded() {
  const dayKey = kstDayKey();
  const [result] = await pool.execute(
    `INSERT INTO daily_admin_pushes (day_key, discord_reminded_at)
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE
       discord_reminded_at = IF(sent_at IS NULL AND discord_reminded_at IS NULL, NOW(), discord_reminded_at)`,
    [dayKey],
  );
  if (!result.affectedRows) return 'skipped';
  const [rows] = await pool.execute(
    `SELECT sent_at FROM daily_admin_pushes WHERE day_key = ? LIMIT 1`,
    [dayKey],
  );
  if (rows[0]?.sent_at) return 'already-sent';
  notifyDailyPushPickReminder({
    dayKey,
    hour: dailyPushDiscordHour(),
  });
  return 'reminded';
}
