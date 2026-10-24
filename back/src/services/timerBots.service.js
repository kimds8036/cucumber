import crypto from 'crypto';
import pool from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { KST_NOW_SQL } from './studyPresence.service.js';
import { packUserPii } from './userPii.service.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getNowForDB } from '../utils/dateUtils.js';
import {
  TIMER_BOTS,
  timerBotByUsername,
  timerBotPhase,
  timerBotSchoolLine,
} from './timerBots.catalog.js';

const botIds = new Set();
const lastPhaseByUser = new Map();

export function isTimerBotId(userId) {
  return botIds.has(Number(userId));
}

async function refreshBotIds() {
  const [rows] = await pool.execute(
    `SELECT id FROM users WHERE is_bot = 1 AND is_deleted = FALSE`,
  );
  botIds.clear();
  for (const row of rows) botIds.add(Number(row.id));
}

function inviteCode() {
  return crypto.randomBytes(6).toString('hex').slice(0, 12);
}

export async function ensureTimerBotUsers() {
  const [colors] = await pool.execute(`SELECT id FROM colors ORDER BY id ASC LIMIT 20`);
  const colorIds = colors.map((row) => Number(row.id)).filter((id) => id > 0);
  if (!colorIds.length) {
    console.warn('[timerBots] colors 가 없어 봇 계정을 만들지 않습니다.');
    return;
  }

  for (let index = 0; index < TIMER_BOTS.length; index += 1) {
    const bot = TIMER_BOTS[index];
    const [existing] = await pool.execute(
      `SELECT id, is_bot FROM users WHERE username = ? LIMIT 1`,
      [bot.username],
    );
    if (existing.length) {
      if (Number(existing[0].is_bot) !== 1) {
        console.warn(`[timerBots] 아이디가 이미 있습니다: ${bot.username}`);
      }
      continue;
    }
    const pii = packUserPii({ name: bot.name });
    const password = await hashPassword(crypto.randomBytes(24).toString('hex'));
    await pool.execute(
      `INSERT INTO users
         (username, password, name_enc, name_lookup, school_id, grade, class_number,
          color_id, invite_code, student_verified, phone_verified, is_bot)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, 0, 1)`,
      [
        bot.username,
        password,
        pii.name_enc,
        pii.name_lookup,
        bot.grade,
        bot.classNumber,
        colorIds[index % colorIds.length],
        inviteCode(),
      ],
    );
  }
  await refreshBotIds();
}

async function closeOpenSessions(userId) {
  await pool.execute(
    `UPDATE study_sessions
     SET ended_at = ${KST_NOW_SQL}
     WHERE user_id = ? AND ended_at IS NULL`,
    [userId],
  );
}

async function keepOpenSession(userId) {
  const dayKey = getTimerDayKey();
  const [openRows] = await pool.execute(
    `SELECT id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key_fmt
     FROM study_sessions
     WHERE user_id = ? AND ended_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [userId],
  );
  const open = openRows[0];
  const openDay = open ? String(open.day_key_fmt).slice(0, 10) : '';
  if (open && openDay !== dayKey) {
    await closeOpenSessions(userId);
  }
  if (!open || openDay !== dayKey) {
    await pool.execute(
      `INSERT INTO study_sessions
         (user_id, day_key, session_kind, started_at, ended_at, last_seen_at)
       VALUES (?, ?, 'study', ${KST_NOW_SQL}, NULL, ${KST_NOW_SQL})`,
      [userId, dayKey],
    );
    return;
  }
  await pool.execute(
    `UPDATE study_sessions
     SET last_seen_at = ${KST_NOW_SQL}
     WHERE id = ?`,
    [open.id],
  );
}

async function notifyFriendsOfPhase(userId, phase) {
  const previous = lastPhaseByUser.get(userId) || null;
  lastPhaseByUser.set(userId, phase);
  if (previous === phase) return;
  if (previous == null && phase !== 'study') return;
  const status = phase === 'study' ? 'studying' : 'idle';
  try {
    const { getIO } = await import('../socketServer.js');
    const io = getIO();
    if (!io) return;
    const [rows] = await pool.execute(
      `SELECT CASE
         WHEN requester_id = ? THEN addressee_id
         ELSE requester_id
       END AS friend_id
       FROM user_friendships
       WHERE (requester_id = ? OR addressee_id = ?)
         AND status = 'accepted'`,
      [userId, userId, userId],
    );
    const payload = {
      type: 'friend_timer_status',
      userId,
      status,
      updatedAt: new Date().toISOString(),
    };
    for (const row of rows) {
      io.to(`user:${row.friend_id}`).emit('friend_timer_status', payload);
    }
  } catch (error) {
    console.warn('[timerBots] 친구 상태 알림 실패', error?.message || error);
  }
}

export async function tickTimerBots(date = new Date()) {
  await ensureTimerBotUsers();
  const [rows] = await pool.execute(
    `SELECT id, username FROM users WHERE is_bot = 1 AND is_deleted = FALSE`,
  );
  for (const row of rows) {
    const bot = timerBotByUsername(row.username);
    if (!bot) continue;
    const userId = Number(row.id);
    const phase = timerBotPhase(bot, date);
    if (phase === 'study') {
      await keepOpenSession(userId);
    } else {
      await closeOpenSessions(userId);
    }
    await notifyFriendsOfPhase(userId, phase);
  }
}

export async function listTimerBarBots(viewerId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.avatar_url, u.color_id
     FROM users u
     WHERE u.is_bot = 1
       AND u.is_deleted = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM user_friendships uf
         WHERE (uf.requester_id = ? AND uf.addressee_id = u.id)
            OR (uf.requester_id = u.id AND uf.addressee_id = ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks ub
         WHERE (ub.user_id = ? AND ub.blocked_user_id = u.id)
            OR (ub.user_id = u.id AND ub.blocked_user_id = ?)
       )`,
    [viewerId, viewerId, viewerId, viewerId],
  );
  const byName = new Map(rows.map((row) => [row.username, row]));
  const now = new Date();
  return TIMER_BOTS.map((bot) => {
    const row = byName.get(bot.username);
    if (!row) return null;
    const phase = timerBotPhase(bot, now);
    if (phase === 'off') return null;
    return {
      userId: Number(row.id),
      username: bot.username,
      phase,
      avatarUrl: row.avatar_url || null,
      colorId: row.color_id,
    };
  }).filter(Boolean);
}

export function friendSchoolLineForBot(username) {
  const bot = timerBotByUsername(username);
  if (!bot) return null;
  return {
    school: bot.schoolName,
    grade: `${bot.grade}학년 ${bot.classNumber}반`,
    line: timerBotSchoolLine(bot),
  };
}

async function botUserIds() {
  const [rows] = await pool.execute(
    `SELECT id, username FROM users WHERE is_bot = 1 AND is_deleted = FALSE`,
  );
  return rows.map((row) => ({ id: Number(row.id), username: row.username }));
}

export async function adminTimerBotOverview() {
  const bots = await botUserIds();
  const now = new Date();
  const items = [];
  for (const row of bots) {
    const bot = timerBotByUsername(row.username);
    const phase = bot ? timerBotPhase(bot, now) : 'off';
    const [[requests]] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM user_friendships
       WHERE addressee_id = ? AND status = 'pending'`,
      [row.id],
    );
    const [[unread]] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM dm_messages m
       INNER JOIN dm_rooms r ON r.id = m.room_id
       WHERE (r.user1_id = ? OR r.user2_id = ?)
         AND m.sender_id <> ?
         AND m.is_read = FALSE
         AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)`,
      [row.id, row.id, row.id],
    );
    items.push({
      userId: row.id,
      username: row.username,
      name: bot?.name || row.username,
      schoolLine: bot ? timerBotSchoolLine(bot) : '',
      phase,
      pendingRequests: Number(requests?.cnt || 0),
      unreadChats: Number(unread?.cnt || 0),
    });
  }
  return items;
}

export async function adminListBotFriendRequests() {
  const [rows] = await pool.execute(
    `SELECT uf.id, uf.created_at, uf.addressee_id, bot.username AS bot_username,
            u.id AS requester_id, u.username AS requester_username
     FROM user_friendships uf
     INNER JOIN users bot ON bot.id = uf.addressee_id AND bot.is_bot = 1
     INNER JOIN users u ON u.id = uf.requester_id
     WHERE uf.status = 'pending'
     ORDER BY uf.id DESC`,
  );
  return rows.map((row) => ({
    requestId: Number(row.id),
    botUserId: Number(row.addressee_id),
    botUsername: row.bot_username,
    requesterId: Number(row.requester_id),
    requesterUsername: row.requester_username,
    createdAt: row.created_at,
  }));
}

async function loadPendingBotRequest(requestId) {
  const [rows] = await pool.execute(
    `SELECT uf.id, uf.requester_id, uf.addressee_id, uf.status
     FROM user_friendships uf
     INNER JOIN users bot ON bot.id = uf.addressee_id AND bot.is_bot = 1
     WHERE uf.id = ?
     LIMIT 1`,
    [requestId],
  );
  return rows[0] || null;
}

export async function adminAcceptBotRequests(requestIds) {
  const ids = [...new Set(requestIds.map((id) => Number(id)).filter((id) => id > 0))];
  let accepted = 0;
  for (const id of ids) {
    const row = await loadPendingBotRequest(id);
    if (!row || row.status !== 'pending') continue;
    await pool.execute(
      `UPDATE user_friendships SET status = 'accepted', responded_at = NOW() WHERE id = ?`,
      [id],
    );
    accepted += 1;
    try {
      const bot = timerBotByUsername(
        (
          await pool.execute(`SELECT username FROM users WHERE id = ? LIMIT 1`, [
            row.addressee_id,
          ])
        )[0][0]?.username,
      );
      const label = bot?.name || '친구';
      await enqueueNotification({
        userId: row.requester_id,
        type: 'friend_accepted',
        category: 'system',
        title: '시스템',
        body: `${label} 님이 친구 요청을 수락했어요`,
        relatedType: 'friend_accepted',
        relatedId: Number(id),
        sourceId: `friend_accepted:${id}`,
      });
    } catch (error) {
      console.error('[timerBots] 친구 수락 알림 실패', error?.message || error);
    }
  }
  return accepted;
}

export async function adminRejectBotRequests(requestIds) {
  const ids = [...new Set(requestIds.map((id) => Number(id)).filter((id) => id > 0))];
  let rejected = 0;
  for (const id of ids) {
    const row = await loadPendingBotRequest(id);
    if (!row || row.status !== 'pending') continue;
    await pool.execute(
      `UPDATE user_friendships SET status = 'rejected', responded_at = NOW() WHERE id = ?`,
      [id],
    );
    rejected += 1;
  }
  return rejected;
}

export async function adminListBotChats(botUserId) {
  const [rows] = await pool.execute(
    `SELECT r.id AS room_id,
            CASE WHEN r.user1_id = ? THEN r.user2_id ELSE r.user1_id END AS other_id,
            u.username AS other_username,
            (
              SELECT m.content FROM dm_messages m
              WHERE m.room_id = r.id AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
              ORDER BY m.id DESC LIMIT 1
            ) AS last_content,
            (
              SELECT COUNT(*) FROM dm_messages m
              WHERE m.room_id = r.id AND m.sender_id <> ?
                AND m.is_read = FALSE
                AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
            ) AS unread
     FROM dm_rooms r
     INNER JOIN users u
       ON u.id = CASE WHEN r.user1_id = ? THEN r.user2_id ELSE r.user1_id END
     WHERE r.user1_id = ? OR r.user2_id = ?
     ORDER BY r.id DESC`,
    [botUserId, botUserId, botUserId, botUserId, botUserId],
  );
  return rows.map((row) => ({
    roomId: Number(row.room_id),
    otherUserId: Number(row.other_id),
    otherUsername: row.other_username,
    lastContent: row.last_content || '',
    unread: Number(row.unread || 0),
  }));
}

async function botRoom(botUserId, roomId) {
  const [rows] = await pool.execute(
    `SELECT r.id
     FROM dm_rooms r
     INNER JOIN users bot ON bot.is_bot = 1 AND (bot.id = r.user1_id OR bot.id = r.user2_id)
     WHERE r.id = ? AND (r.user1_id = ? OR r.user2_id = ?)
     LIMIT 1`,
    [roomId, botUserId, botUserId],
  );
  return rows[0] || null;
}

export async function adminListBotMessages(botUserId, roomId) {
  const room = await botRoom(botUserId, roomId);
  if (!room) return null;
  const [rows] = await pool.execute(
    `SELECT id, sender_id, content, created_at, is_read
     FROM dm_messages
     WHERE room_id = ? AND (is_deleted IS NULL OR is_deleted = FALSE)
     ORDER BY id ASC
     LIMIT 200`,
    [roomId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    senderId: Number(row.sender_id),
    fromBot: Number(row.sender_id) === Number(botUserId),
    content: row.content || '',
    createdAt: row.created_at,
    isRead: Number(row.is_read) === 1,
  }));
}

export async function adminReplyAsBot(botUserId, roomId, content) {
  const room = await botRoom(botUserId, roomId);
  if (!room) return { ok: false, status: 404, message: '대화를 찾을 수 없습니다.' };
  const trimmed = String(content || '').trim();
  if (!trimmed) return { ok: false, status: 400, message: '내용을 입력해 주세요.' };
  if (trimmed.length > 2000) {
    return { ok: false, status: 400, message: '메시지는 2000자 이내여야 합니다.' };
  }
  const now = getNowForDB();
  const [inserted] = await pool.execute(
    `INSERT INTO dm_messages (room_id, sender_id, content, created_at, is_read)
     VALUES (?, ?, ?, ?, FALSE)`,
    [roomId, botUserId, trimmed, now],
  );
  const messageId = inserted.insertId;
  await pool.execute(
    `UPDATE dm_rooms
     SET last_message = ?, last_message_at = ?
     WHERE id = ?`,
    [trimmed.slice(0, 500), now, roomId],
  );
  await pool.execute(
    `UPDATE dm_messages
     SET is_read = TRUE
     WHERE room_id = ? AND sender_id <> ? AND is_read = FALSE`,
    [roomId, botUserId],
  );
  const [roomRows] = await pool.execute(
    `SELECT user1_id, user2_id FROM dm_rooms WHERE id = ? LIMIT 1`,
    [roomId],
  );
  const roomRow = roomRows[0];
  const otherUserId = roomRow
    ? Number(roomRow.user1_id) === Number(botUserId)
      ? Number(roomRow.user2_id)
      : Number(roomRow.user1_id)
    : null;
  try {
    const { emitNewMessage, isUserInRoom } = await import('../socketServer.js');
    emitNewMessage(
      roomId,
      {
        id: messageId,
        room_id: roomId,
        sender_id: botUserId,
        content: trimmed,
        is_read: 0,
        is_deleted: 0,
        created_at: now,
        images: [],
      },
      { roomType: 'dm' },
    );
    if (otherUserId && !isUserInRoom(roomId, otherUserId)) {
      const bot = timerBotByUsername(
        (
          await pool.execute(`SELECT username FROM users WHERE id = ? LIMIT 1`, [botUserId])
        )[0][0]?.username,
      );
      const senderName = bot?.name || '친구';
      await enqueueNotification({
        userId: otherUserId,
        type: 'mail',
        category: 'mail',
        title: senderName,
        body: trimmed.slice(0, 80),
        relatedType: 'dm_room',
        relatedId: roomId,
        sourceId: `dm_message:${messageId}`,
        senderUserId: botUserId,
        senderName,
      });
    }
  } catch (error) {
    console.error('[timerBots] 답장 전달 실패', error?.message || error);
  }
  return { ok: true };
}

export async function adminMarkBotChatRead(botUserId, roomId) {
  const room = await botRoom(botUserId, roomId);
  if (!room) return false;
  await pool.execute(
    `UPDATE dm_messages
     SET is_read = TRUE
     WHERE room_id = ? AND sender_id <> ? AND is_read = FALSE`,
    [roomId, botUserId],
  );
  return true;
}

export async function adminListBotPokes() {
  const bots = await botUserIds();
  if (!bots.length) return [];
  const ids = bots.map((bot) => bot.id);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT n.id, n.user_id, n.type, n.body, n.created_at, u.username AS bot_username
     FROM notifications n
     INNER JOIN users u ON u.id = n.user_id
     WHERE n.user_id IN (${placeholders})
       AND n.type IN ('poke', 'friend_poke')
     ORDER BY n.id DESC
     LIMIT 50`,
    ids,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    botUserId: Number(row.user_id),
    botUsername: row.bot_username,
    type: row.type,
    body: row.body || '',
    createdAt: row.created_at,
  }));
}
