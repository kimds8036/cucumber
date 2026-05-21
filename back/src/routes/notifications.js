import express from 'express';
import pool from '../config/database.js';
import { getUserFcmTokens } from '../utils/pushTokens.js';
import { authenticate } from '../middleware/auth.js';
import { emitNotification, getIO } from '../socketServer.js';
import { getMessaging } from '../config/firebase.js';

const router = express.Router();

function parseWatchersJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emitNotificationReadToUser(userId, payload = {}) {
  try {
    const io = getIO?.();
    if (!io) return;
    io.to(`user:${userId}`).emit('notification_read', {
      type: 'notification_read',
      ...payload,
    });
  } catch {
    // no-op
  }
}

function maskToken(token = '') {
  if (!token) return '';
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}

// 클라이언트에서 직접 알림 한 건 기록 (타이머 요약 등)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, category, title, body } = req.body || {};
    const tit = title != null && String(title).trim() !== '' ? String(title).slice(0, 255) : '알림';
    const bod = body != null ? String(body) : '';
    await pool.execute(
      `INSERT INTO notifications (user_id, type, category, title, body, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [userId, type || 'system', category || 'general', tit, bod],
    );
    res.json({ success: true });
  } catch (e) {
    console.error('알림 저장 오류:', e);
    res.status(500).json({ success: false });
  }
});

// 알림 목록 조회 (페이지네이션: page, limit)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // 일부 MySQL 버전에서 LIMIT/OFFSET 에 placeholer(?)를 쓰면
    // ER_WRONG_ARGUMENTS 가 나는 경우가 있어, 검증된 정수만 직접 문자열에 삽입한다.
    const limitSql = Number.isFinite(limit) ? limit : 20;
    const offsetSql = Number.isFinite(offset) ? offset : 0;

    console.log('[GET /api/notifications] 요청', {
      userId,
      page,
      limit,
      offset,
    });

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = ?
         AND type <> 'like'
         AND (related_type IS NULL OR related_type NOT IN ('message_room', 'dm_room'))`,
      [userId],
    );
    const total = Number(countRows?.[0]?.total) || 0;

    const [rows] = await pool.execute(
      `SELECT
         id,
         type,
         category,
         title,
         body,
         related_type,
         related_id,
         watchers_json,
         is_read,
         created_at,
         read_at
       FROM notifications
       WHERE user_id = ?
         AND type <> 'like'
         AND (related_type IS NULL OR related_type NOT IN ('message_room', 'dm_room'))
       ORDER BY created_at DESC
       LIMIT ${limitSql} OFFSET ${offsetSql}`,
      [userId]
    );

    console.log('[GET /api/notifications] 결과', {
      userId,
      total,
      page,
      limit,
      returned: rows.length,
      hasUnread: rows.some((n) => !n.is_read),
    });

    res.json({
      success: true,
      meta: {
        total,
        page,
        limit,
        returned: rows.length,
      },
      data: rows.map((n) => ({
        id: n.id,
        type: n.type,
        category: n.category,
        title: n.title,
        content: n.body,
        isRead: !!n.is_read,
        createdAt: n.created_at,
        relatedType: n.related_type,
        relatedId: n.related_id,
        watchers: parseWatchersJson(n.watchers_json),
      })),
    });
  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 개별 알림 읽음 처리 (Optimistic UI + Batch를 위해 개별도 유지)
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log('[POST /api/notifications/:id/read] 요청', {
      userId,
      id,
    });

    const [result] = await pool.execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    if (result.affectedRows === 0) {
      console.warn('[POST /api/notifications/:id/read] 대상 없음', {
        userId,
        id,
      });
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없거나 권한이 없습니다.',
      });
    }

    console.log('[POST /api/notifications/:id/read] 업데이트 완료', {
      userId,
      id,
      updatedCount: result.affectedRows,
    });

    res.json({
      success: true,
      message: '알림을 읽음으로 표시했습니다.',
      data: { updatedCount: result.affectedRows },
    });

    emitNotificationReadToUser(userId, { relatedType: null, relatedId: Number(id) });
  } catch (error) {
    console.error('알림 개별 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

// 여러 알림 읽음 처리 (Batch API)
router.post('/read-batch', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      console.warn('[POST /api/notifications/read-batch] 잘못된 ids', {
        userId,
        ids,
      });
      return res.status(400).json({
        success: false,
        message: 'ids 배열을 전달해주세요.',
      });
    }

    // 숫자로 정제
    const cleanIds = Array.from(
      new Set(
        ids
          .map((v) => Number(v))
          .filter((v) => Number.isInteger(v) && v > 0),
      ),
    );

    if (cleanIds.length === 0) {
      console.warn('[POST /api/notifications/read-batch] 유효한 ID 없음', {
        userId,
        ids,
      });
      return res.status(400).json({
        success: false,
        message: '유효한 알림 ID가 없습니다.',
      });
    }

    const placeholders = cleanIds.map(() => '?').join(',');
    const params = [userId, ...cleanIds];

    console.log('[POST /api/notifications/read-batch] 요청', {
      userId,
      ids: cleanIds,
    });

    const [result] = await pool.execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = ? 
         AND is_read = FALSE 
         AND id IN (${placeholders})`,
      params,
    );

    console.log('[POST /api/notifications/read-batch] 업데이트 완료', {
      userId,
      updatedCount: result.affectedRows,
    });

    res.json({
      success: true,
      message: '여러 알림을 읽음으로 표시했습니다.',
      data: { updatedCount: result.affectedRows },
    });

    emitNotificationReadToUser(userId, { relatedType: null, relatedId: null });
  } catch (error) {
    console.error('알림 배치 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

// 디버그용: 소켓 경로가 살아있는지 즉시 테스트하는 API
// - 클라이언트에서 이 엔드포인트를 치면, 현재 로그인한 유저에게 바로 notification 이벤트를 emit
// - 나중에 필요 없으면 삭제해도 됨
router.post('/debug/socket-ping', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('[POST /api/notifications/debug/socket-ping] 호출', {
      userId,
    });

    // 단순한 테스트용 페이로드
    emitNotification(userId, {
      type: 'debug',
      category: 'system',
      title: '소켓 테스트 알림',
      body: '이 알림이 헤더 빨간 점을 바로 켜는지 확인용입니다.',
      relatedType: null,
      relatedId: null,
    });

    res.json({
      success: true,
      message: 'socket-ping emit 호출 완료',
    });
  } catch (error) {
    console.error('[POST /api/notifications/debug/socket-ping] 오류:', error);
    res.status(500).json({
      success: false,
      message: 'socket-ping 처리 중 오류가 발생했습니다.',
    });
  }
});

// 디버그용: Firebase Admin SDK로 FCM 직접 전송
// - 목적: iOS/Android 토큰 대상 전송 결과(messageId, error.code)를 즉시 확인
// - 기본은 fcm_tokens 활성 토큰 1개, 필요 시 body.token으로 override
router.post('/debug/fcm-test', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      token: inputToken,
      title = 'FCM 디버그 테스트',
      body = '서버 직접 전송 테스트 알림입니다.',
      data = {},
      dryRun = false,
    } = req.body || {};

    let token = String(inputToken || '').trim();
    if (!token) {
      const tokens = await getUserFcmTokens(userId);
      token = tokens[0] || '';
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          '테스트 대상 FCM 토큰이 없습니다. body.token 또는 fcm_tokens 활성 토큰이 필요합니다.',
      });
    }

    const messaging = getMessaging();
    if (!messaging) {
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin SDK(messaging) 초기화에 실패했습니다.',
      });
    }

    const payload = {
      token,
      notification: {
        title: String(title),
        body: String(body),
      },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [String(k), String(v)]),
      ),
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    console.log('[POST /api/notifications/debug/fcm-test] 전송 시도', {
      userId,
      dryRun: !!dryRun,
      token: maskToken(token),
    });

    const messageId = await messaging.send(payload, !!dryRun);

    console.log('[POST /api/notifications/debug/fcm-test] 전송 성공', {
      userId,
      dryRun: !!dryRun,
      token: maskToken(token),
      messageId,
    });

    return res.json({
      success: true,
      message: 'FCM 테스트 전송 성공',
      data: {
        dryRun: !!dryRun,
        token: maskToken(token),
        messageId,
      },
    });
  } catch (error) {
    console.error('[POST /api/notifications/debug/fcm-test] 전송 실패', {
      code: error?.code || null,
      errorInfo: error?.errorInfo || null,
      message: error?.message || null,
      stack: error?.stack || null,
    });

    return res.status(500).json({
      success: false,
      message: 'FCM 테스트 전송 실패',
      error: {
        code: error?.code || null,
        errorInfo: error?.errorInfo || null,
        message: error?.message || null,
      },
    });
  }
});

// relatedType + relatedId 기준으로 알림 읽음 처리
router.post('/read-by-related', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { relatedType, relatedId } = req.body || {};

    if (!relatedType || !relatedId) {
      console.warn('[POST /api/notifications/read-by-related] 잘못된 파라미터', {
        userId,
        relatedType,
        relatedId,
      });
      return res.status(400).json({
        success: false,
        message: 'relatedType과 relatedId를 모두 전달해주세요.',
      });
    }

    console.log('[POST /api/notifications/read-by-related] 요청', {
      userId,
      relatedType,
      relatedId,
    });

    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = ?
         AND related_type = ?
         AND related_id = ?
         AND is_read = FALSE`,
      [userId, relatedType, relatedId],
    );

    console.log('[POST /api/notifications/read-by-related] 업데이트 완료', {
      userId,
      relatedType,
      relatedId,
      updatedCount: result.affectedRows,
    });

    res.json({
      success: true,
      message: '관련 리소스의 알림을 모두 읽음으로 표시했습니다.',
      data: { updatedCount: result.affectedRows },
    });

    emitNotificationReadToUser(userId, { relatedType, relatedId });
  } catch (error) {
    console.error('알림 read-by-related 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

// 모든 알림 읽음 처리
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('[POST /api/notifications/mark-all-read] 요청', {
      userId,
    });

    const [result] = await pool.execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    console.log('[POST /api/notifications/mark-all-read] 업데이트 완료', {
      userId,
      updatedCount: result.affectedRows,
    });

    res.json({
      success: true,
      message: '모든 알림을 읽음으로 표시했습니다.',
      data: { updatedCount: result.affectedRows },
    });

    emitNotificationReadToUser(userId, { relatedType: null, relatedId: null });
  } catch (error) {
    console.error('알림 모두 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

// 개인 우편 스레드(= root mail 기준) 관련 알림을 일괄 읽음 처리
// - relatedType: personal_mail
// - 관련 relatedId는 personal_mails에서 root_mail_id 또는 id로 매칭
router.post('/read-personal-mail-thread', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadRootId } = req.body || {};
    const rootId = Number(threadRootId);

    if (!Number.isFinite(rootId)) {
      return res.status(400).json({
        success: false,
        message: 'threadRootId를 올바르게 전달해주세요.',
      });
    }

    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = ?
         AND related_type = 'personal_mail'
         AND is_read = FALSE
         AND related_id IN (
           SELECT pm2.id
           FROM personal_mails pm2
           WHERE COALESCE(pm2.root_mail_id, pm2.id) = ?
         )`,
      [userId, rootId],
    );

    res.json({
      success: true,
      message: '개인 우편 스레드 관련 알림을 읽음 처리했습니다.',
      data: { updatedCount: result.affectedRows },
    });

    emitNotificationReadToUser(userId, { relatedType: 'personal_mail', relatedId: rootId });
  } catch (error) {
    console.error('알림 개인 우편 스레드 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '개인 우편 스레드 알림 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

export default router;

