import pool from '../config/database.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { isBlockedBy } from '../utils/userBlock.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { ensurePersonalMailSchema } from '../db/ensurePersonalMailSchema.js';
import {
  nameLookupBindParams,
  nameLookupWhereClause,
  packNameOnly,
} from './userPii.service.js';
import {
  PERSONAL_MAIL_STATUS,
  PERSONAL_MAIL_DUPLICATE_CODE,
  PERSONAL_MAIL_RETURN_RELATED_TYPE,
  PERSONAL_MAIL_RETURN_NOTIFICATION_TYPE,
  DEFAULT_PERSONAL_MAIL_RETURN_HOURS,
} from '../constants/personalMail.js';

/** 운영 반송 대기(시간). PERSONAL_MAIL_RETURN_HOURS 우선, 레거시 DAYS면 ×24 */
export function getPersonalMailReturnHours() {
  const hours = parseInt(process.env.PERSONAL_MAIL_RETURN_HOURS || '', 10);
  if (Number.isFinite(hours) && hours > 0) return hours;
  const days = parseInt(process.env.PERSONAL_MAIL_RETURN_DAYS || '', 10);
  if (Number.isFinite(days) && days > 0) return days * 24;
  return DEFAULT_PERSONAL_MAIL_RETURN_HOURS;
}

/** @deprecated getPersonalMailReturnHours 사용 */
export function getPersonalMailReturnDays() {
  return Math.max(1, Math.round(getPersonalMailReturnHours() / 24));
}

/**
 * school_id + grade + class_num + name (+ username) 로 수신자 조회 (목록 API 없음)
 */
export async function findRecipientsForPersonalSend({
  schoolId,
  grade,
  classNum,
  name,
  username,
}) {
  const baseSql = `
    SELECT id, username FROM users
    WHERE school_id = ? AND grade = ? AND class_number = ? AND ${nameLookupWhereClause()}
      AND is_deleted = FALSE
  `;
  const baseParams = [schoolId, grade, classNum, ...nameLookupBindParams(name)];

  if (username && String(username).trim()) {
    const [rows] = await pool.execute(
      `${baseSql} AND username = ?`,
      [...baseParams, String(username).trim()],
    );
    return rows;
  }

  const [rows] = await pool.execute(baseSql, baseParams);
  return rows;
}

async function insertDeliveredPersonalMail(connection, {
  senderId,
  recipientId,
  content,
  snapshot,
}) {
  const now = getNowForDB();
  const isShadowBlocked = await isBlockedBy({
    blockerUserId: Number(recipientId),
    targetUserId: senderId,
  });
  const namePacked = packNameOnly(snapshot.name);

  const [result] = await connection.execute(
    `INSERT INTO personal_mails (
      sender_id, recipient_id, content, status, is_match_failed,
      recipient_school_id, recipient_grade, recipient_class_num,
      recipient_name_enc, recipient_name_lookup, recipient_user_id, sent_at, created_at,
      is_shadow_blocked, shadow_blocked_for_user_id
    ) VALUES (?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      senderId,
      recipientId,
      content.trim(),
      PERSONAL_MAIL_STATUS.SENT,
      snapshot.schoolId,
      snapshot.grade,
      snapshot.classNum,
      namePacked.name_enc,
      namePacked.name_lookup,
      snapshot.username || null,
      now,
      now,
      isShadowBlocked,
      isShadowBlocked ? Number(recipientId) : null,
    ],
  );

  const rootMailId = Number(result.insertId);

  const [roomResult] = await connection.execute(
    `INSERT INTO personal_mail_rooms (
      root_mail_id, root_author_id, user1_id, user2_id, last_mail_id, last_mail_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      rootMailId,
      senderId,
      Math.min(Number(senderId), Number(recipientId)),
      Math.max(Number(senderId), Number(recipientId)),
      rootMailId,
      now,
    ],
  );
  const roomId = Number(roomResult.insertId);

  await connection.execute(
    `UPDATE personal_mails SET root_mail_id = ?, room_id = ? WHERE id = ?`,
    [rootMailId, roomId, rootMailId],
  );

  await connection.execute(
    `UPDATE personal_mail_rooms
     SET is_deleted_by_user1 = IF(user2_id = ?, FALSE, is_deleted_by_user1),
         is_deleted_by_user2 = IF(user1_id = ?, FALSE, is_deleted_by_user2)
     WHERE id = ?`,
    [senderId, senderId, roomId],
  );

  return { mailId: rootMailId, roomId, isShadowBlocked };
}

async function insertMatchFailedPersonalMail(connection, {
  senderId,
  content,
  snapshot,
}) {
  const now = getNowForDB();
  const namePacked = packNameOnly(snapshot.name);
  const [result] = await connection.execute(
    `INSERT INTO personal_mails (
      sender_id, recipient_id, content, status, is_match_failed,
      recipient_school_id, recipient_grade, recipient_class_num,
      recipient_name_enc, recipient_name_lookup, recipient_user_id, sent_at, created_at,
      root_mail_id, room_id
    ) VALUES (?, NULL, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    [
      senderId,
      content.trim(),
      PERSONAL_MAIL_STATUS.SENT,
      snapshot.schoolId,
      snapshot.grade,
      snapshot.classNum,
      namePacked.name_enc,
      namePacked.name_lookup,
      snapshot.username || null,
      now,
      now,
    ],
  );
  const mailId = Number(result.insertId);
  await connection.execute(
    `UPDATE personal_mails SET root_mail_id = ? WHERE id = ?`,
    [mailId, mailId],
  );
  return { mailId };
}

export async function sendPersonalMailByAddress(senderId, body) {
  await ensurePersonalMailSchema();

  const schoolId = String(body.school_id || body.schoolId || '').trim();
  const grade = parseInt(body.grade, 10);
  const classNum = parseInt(body.class_num ?? body.classNumber, 10);
  const name = String(body.name || body.recipientName || '').trim();
  const content = String(body.content || '').trim();
  const username = String(body.user_id || body.recipientUsername || '').trim();

  if (!schoolId || !Number.isFinite(grade) || !Number.isFinite(classNum) || !name || !content) {
    const err = new Error('학교, 학년, 반, 이름, 내용을 모두 입력해주세요.');
    err.status = 400;
    throw err;
  }

  const snapshot = {
    schoolId,
    grade,
    classNum,
    name,
    username: username || null,
  };

  const recipients = await findRecipientsForPersonalSend({
    schoolId,
    grade,
    classNum,
    name,
    username: username || undefined,
  });

  if (recipients.length >= 2 && !username) {
    return {
      duplicate: true,
      status: 'DUPLICATE',
      code: PERSONAL_MAIL_DUPLICATE_CODE,
      message: '동명이인이 있습니다. 아이디를 입력해주세요.',
    };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (recipients.length === 0) {
      const { mailId } = await insertMatchFailedPersonalMail(connection, {
        senderId,
        content,
        snapshot,
      });
      await connection.commit();
      return {
        success: true,
        message: '우편이 전송되었습니다.',
        data: {
          id: mailId,
          status: PERSONAL_MAIL_STATUS.SENT,
          is_match_failed: true,
        },
      };
    }

    const recipientId = Number(recipients[0].id);
    if (recipientId === Number(senderId)) {
      await connection.rollback();
      const err = new Error('자기 자신에게는 우편을 보낼 수 없습니다.');
      err.status = 400;
      throw err;
    }

    const { mailId, isShadowBlocked } = await insertDeliveredPersonalMail(connection, {
      senderId,
      recipientId,
      content,
      snapshot,
    });

    await connection.commit();

    if (!isShadowBlocked) {
      await enqueueNotification({
        userId: recipientId,
        type: 'mail',
        category: 'mail',
        title: '우편함',
        body: '새로운 우편이 도착했습니다',
        relatedType: 'personal_mail',
        relatedId: mailId,
        sourceId: `personal_mail:${mailId}`,
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, sender_id, recipient_id, content, status, is_match_failed,
              recipient_school_id, recipient_grade, recipient_class_num,
              recipient_name_enc, recipient_user_id, sent_at, created_at, room_id
       FROM personal_mails WHERE id = ?`,
      [mailId],
    );

    return {
      success: true,
      message: '우편이 전송되었습니다.',
      data: rows[0],
    };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

export async function getPersonalMailRetryPayload(mailId, senderId) {
  await ensurePersonalMailSchema();
  const [rows] = await pool.execute(
    `SELECT pm.id, pm.sender_id, pm.status,
            pm.recipient_school_id AS school_id,
            s.name AS school_name,
            s.region AS school_region,
            pm.recipient_grade AS grade,
            pm.recipient_class_num AS class_num,
            pm.recipient_name_enc AS name_enc,
            pm.recipient_user_id AS user_id,
            pm.content
     FROM personal_mails pm
     LEFT JOIN schools s ON s.school_id = pm.recipient_school_id
     WHERE pm.id = ? AND pm.sender_id = ? AND pm.is_deleted = FALSE`,
    [mailId, senderId],
  );
  if (rows.length === 0) {
    const err = new Error('우편을 찾을 수 없습니다.');
    err.status = 404;
    throw err;
  }
  const mail = rows[0];
  if (mail.status !== PERSONAL_MAIL_STATUS.RETURNED) {
    const err = new Error('반송된 우편만 다시 보낼 수 있습니다.');
    err.status = 403;
    throw err;
  }
  return mail;
}

export async function runPersonalMailReturnJob(options = {}) {
  await ensurePersonalMailSchema();
  const { returnAfterMinutes } = options;
  const useMinutes =
    returnAfterMinutes != null &&
    Number.isFinite(returnAfterMinutes) &&
    returnAfterMinutes > 0;
  const intervalUnit = useMinutes ? 'MINUTE' : 'HOUR';
  const intervalValue = useMinutes
    ? returnAfterMinutes
    : getPersonalMailReturnHours();

  const [candidates] = await pool.execute(
    `SELECT pm.id, pm.sender_id, pm.recipient_id, pm.recipient_name_enc,
            ru.name_enc AS recipient_user_name_enc, pm.is_match_failed,
            pm.root_mail_id, pm.sent_at
     FROM personal_mails pm
     LEFT JOIN users ru ON ru.id = pm.recipient_id
     WHERE pm.status = ?
       AND pm.is_deleted = FALSE
       AND pm.parent_mail_id IS NULL
       AND pm.sent_at <= DATE_SUB(NOW(), INTERVAL ? ${intervalUnit})
       AND (
         (pm.is_match_failed = TRUE AND pm.recipient_id IS NULL)
         OR (
           pm.recipient_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM personal_mails reply
             WHERE reply.is_deleted = FALSE
               AND reply.sender_id = pm.recipient_id
               AND COALESCE(reply.root_mail_id, reply.id) = COALESCE(pm.root_mail_id, pm.id)
               AND reply.id != pm.id
           )
         )
       )`,
    [PERSONAL_MAIL_STATUS.SENT, intervalValue],
  );

  let returned = 0;
  for (const row of candidates) {
    const [upd] = await pool.execute(
      `UPDATE personal_mails
       SET status = ?, returned_at = ?
       WHERE id = ? AND status = ?`,
      [
        PERSONAL_MAIL_STATUS.RETURNED,
        getNowForDB(),
        row.id,
        PERSONAL_MAIL_STATUS.SENT,
      ],
    );
    if (upd.affectedRows === 0) continue;
    returned += 1;

    const recipientName =
      String(row.recipient_name ?? '').trim() ||
      String(row.recipient_user_name ?? '').trim() ||
      '상대방';
    await enqueueNotification({
      userId: Number(row.sender_id),
      type: PERSONAL_MAIL_RETURN_NOTIFICATION_TYPE,
      category: 'mail',
      title: '우편함',
      body: `${recipientName} 님에게 보낸 우편이 반송되었습니다`,
      relatedType: PERSONAL_MAIL_RETURN_RELATED_TYPE,
      relatedId: Number(row.id),
      sourceId: `personal_mail_returned:${row.id}`,
    });
  }

  return { scanned: candidates.length, returned };
}
