import pool from '../config/database.js';
import { getKstTodayRangeUtcForSql, getNowForDB } from '../utils/dateUtils.js';
import {
  notifyPostAutoHidden,
  notifyReportCreated,
} from './discordWebhook.service.js';

export const REPORT_CODE = {
  ALREADY_REPORTED: 'ALREADY_REPORTED',
};

const DAILY_REPORT_QUOTA = 5;
const AUTO_HIDE_REPORT_THRESHOLD = 3;

/** @returns {Promise<number|null>} */
export async function resolveReportedUserId(targetType, targetId, connection = pool) {
  const id = Number(targetId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const t = String(targetType || '').toLowerCase();

  if (t === 'user') return id;

  if (t === 'post') {
    const [rows] = await connection.execute(
      'SELECT user_id FROM posts WHERE id = ? AND is_deleted = FALSE LIMIT 1',
      [id],
    );
    return rows[0]?.user_id ?? null;
  }
  if (t === 'comment') {
    const [rows] = await connection.execute(
      'SELECT user_id FROM comments WHERE id = ? AND is_deleted = FALSE LIMIT 1',
      [id],
    );
    return rows[0]?.user_id ?? null;
  }
  if (t === 'school_mail') {
    const [rows] = await connection.execute(
      'SELECT user_id FROM school_mails WHERE id = ? AND is_deleted = FALSE LIMIT 1',
      [id],
    );
    return rows[0]?.user_id ?? null;
  }
  if (t === 'school_mail_comment') {
    const [rows] = await connection.execute(
      'SELECT user_id FROM school_mail_comments WHERE id = ? AND is_deleted = FALSE LIMIT 1',
      [id],
    );
    return rows[0]?.user_id ?? null;
  }

  return null;
}

async function countDailyReports(reporterId, connection = pool) {
  const { start, end } = getKstTodayRangeUtcForSql();
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS c
     FROM reports
     WHERE reporter_id = ?
       AND created_at >= ?
       AND created_at <= ?`,
    [reporterId, start, end],
  );
  return Number(rows[0]?.c ?? 0);
}

async function findExistingReport(reporterId, targetType, targetId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, reported_user_id
     FROM reports
     WHERE reporter_id = ? AND target_type = ? AND target_id = ?
     LIMIT 1`,
    [reporterId, targetType, targetId],
  );
  return rows[0] || null;
}

function alreadyReportedResponse(reportedUserId) {
  return {
    httpStatus: 409,
    body: {
      success: false,
      code: REPORT_CODE.ALREADY_REPORTED,
      message: '이미 신고된 항목입니다.',
      data: {
        reportedUserId: reportedUserId ?? null,
      },
    },
  };
}

/**
 * @returns {Promise<{ httpStatus: number, body: object }>}
 */
export async function submitContentReport({
  reporterId,
  targetType,
  targetId,
  reason,
  description,
  options = {},
}) {
  const {
    forbidSelfReport = true,
    autoHidePost = false,
    targetExistsCheck,
  } = options;

  if (!reason) {
    return {
      httpStatus: 400,
      body: { success: false, message: '신고 사유를 입력해주세요.' },
    };
  }

  if (targetExistsCheck?.check) {
    const exists = await targetExistsCheck.check(pool);
    if (!exists) {
      return {
        httpStatus: 404,
        body: {
          success: false,
          message:
            targetExistsCheck.notFoundMessage || '신고 대상을 찾을 수 없습니다.',
        },
      };
    }
  }

  const reportedUserId = await resolveReportedUserId(targetType, targetId);
  if (
    forbidSelfReport &&
    reportedUserId != null &&
    Number(reportedUserId) === Number(reporterId)
  ) {
    return {
      httpStatus: 400,
      body: { success: false, message: '본인 콘텐츠는 신고할 수 없습니다.' },
    };
  }

  const todayCount = await countDailyReports(reporterId);
  if (todayCount >= DAILY_REPORT_QUOTA) {
    return {
      httpStatus: 429,
      body: {
        success: false,
        message:
          '오늘 신고 가능 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.',
      },
    };
  }

  const existing = await findExistingReport(reporterId, targetType, targetId);
  if (existing) {
    return alreadyReportedResponse(
      existing.reported_user_id ?? reportedUserId,
    );
  }

  const connection = await pool.getConnection();
  let autoHidden = false;
  let pendingCountAtHide = 0;
  let reportId = null;
  try {
    await connection.beginTransaction();

    const [reportInsert] = await connection.execute(
      `INSERT INTO reports (reporter_id, target_type, target_id, reported_user_id, reason, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        reporterId,
        targetType,
        targetId,
        reportedUserId,
        reason,
        description || null,
      ],
    );
    reportId = reportInsert.insertId;

    if (autoHidePost && targetType === 'post') {
      const [pendingRows] = await connection.execute(
        `SELECT COUNT(*) AS c
         FROM reports
         WHERE target_type = 'post'
           AND target_id = ?
           AND status = 'pending'`,
        [targetId],
      );
      const pendingCount = Number(pendingRows[0]?.c ?? 0);
      if (pendingCount >= AUTO_HIDE_REPORT_THRESHOLD) {
        autoHidden = true;
        pendingCountAtHide = pendingCount;
        await connection.execute(
          `UPDATE posts
           SET is_hidden = TRUE,
               hidden_reason = 'REPORT_THRESHOLD',
               hidden_at = ?,
               hidden_by_report_count = ?
           WHERE id = ?
             AND is_deleted = FALSE`,
          [getNowForDB(), pendingCount, targetId],
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    if (err?.code === 'ER_DUP_ENTRY') {
      const dup = await findExistingReport(reporterId, targetType, targetId);
      return alreadyReportedResponse(
        dup?.reported_user_id ?? reportedUserId,
      );
    }
    throw err;
  } finally {
    connection.release();
  }

  notifyReportCreated({
    reportId,
    targetType,
    targetId,
    reason,
    description,
    reporterId,
    reportedUserId,
  });
  if (autoHidden) {
    notifyPostAutoHidden({
      postId: targetId,
      reportCount: pendingCountAtHide,
    });
  }

  return {
    httpStatus: 201,
    body: {
      success: true,
      message:
        '신고가 접수되었습니다. 더 안전한 커뮤니티를 위해 함께해 주셔서 감사합니다.',
      data: {
        reportedUserId,
        autoHidden: autoHidden || undefined,
      },
    },
  };
}
