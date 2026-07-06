import express from 'express';
import { body, param } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createNotification } from '../utils/notifications.js';
import { emitNotification } from '../socketServer.js';
import { checkNotificationAllowed } from '../utils/notificationUtils.js';
import { getStudyingFriends } from '../socket/socketService.js';
import { submitContentReport } from '../services/reportSubmission.service.js';

const router = express.Router();

// 검증 체이너 — username 정규화(@ prefix 제거 등) 는 핸들러에 그대로 둔다.
const sendFriendRequestValidators = [
  body('username').isString().withMessage('username 이(가) 필요합니다.')
    .bail().trim().isLength({ min: 1, max: 50 })
    .withMessage('username 형식이 올바르지 않습니다.'),
];

const friendshipIdParamValidator = [
  param('id').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 친구 요청 ID 입니다.'),
];

const friendUserIdParamValidator = [
  param('friendUserId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 사용자 ID 입니다.'),
];

// 친구 목록 조회
router.get('/list', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.execute(
      `SELECT 
         uf.id,
         CASE 
           WHEN uf.requester_id = ? THEN uf.addressee_id
           ELSE uf.requester_id
         END AS friend_user_id,
         u.name_enc,
         u.name,
         u.username,
         u.color_id,
         c.hex_code AS profile_color_hex,
         u.school_id,
         s.name AS school_name,
         u.grade,
         u.class_number,
         c.color_number AS profile_color_number,
         uf.created_at
       FROM user_friendships uf
       JOIN users u 
         ON u.id = CASE 
                    WHEN uf.requester_id = ? THEN uf.addressee_id
                    ELSE uf.requester_id
                  END
      LEFT JOIN colors c ON c.id = u.color_id
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE (uf.requester_id = ? OR uf.addressee_id = ?)
         AND uf.status = 'accepted'`,
      [userId, userId, userId, userId]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        friendshipId: r.id,
        userId: r.friend_user_id,
        name: r.name,
        username: r.username ? `@${r.username}` : '',
        colorId: r.color_id,
        profileColor: {
          id: r.color_id,
          hexCode: r.profile_color_hex,
        },
        school: r.school_name || '',
        grade:
          r.grade != null && r.class_number != null
            ? `${r.grade}학년 ${r.class_number}반`
            : '',
        profileColor: {
          id: r.color_id,
          hexCode: r.profile_color_hex,
          colorNumber: r.profile_color_number,
        },
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('친구 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 현재 공부 중인 친구 상태 조회
router.get('/studying-status', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const data = await getStudyingFriends({ userId });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('공부 중 친구 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '공부 중 친구 상태 조회 중 오류가 발생했습니다.',
    });
  }
});

// 받은 친구 요청 목록
router.get('/requests/received', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.execute(
      `SELECT 
         uf.id,
         uf.requester_id,
         u.name_enc,
         u.name,
         u.username,
         u.color_id,
         c.hex_code AS profile_color_hex,
         u.school_id,
         s.name AS school_name,
         u.grade,
         u.class_number,
         c.color_number AS profile_color_number,
         uf.created_at
       FROM user_friendships uf
       JOIN users u ON uf.requester_id = u.id
      LEFT JOIN colors c ON c.id = u.color_id
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE uf.addressee_id = ?
         AND uf.status = 'pending'`,
      [userId]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        requestId: r.id,
        userId: r.requester_id,
        name: r.name,
        username: r.username ? `@${r.username}` : '',
        colorId: r.color_id,
        profileColor: {
          id: r.color_id,
          hexCode: r.profile_color_hex,
        },
        school: r.school_name || '',
        grade:
          r.grade != null && r.class_number != null
            ? `${r.grade}학년 ${r.class_number}반`
            : '',
        profileColor: {
          id: r.color_id,
          hexCode: r.profile_color_hex,
          colorNumber: r.profile_color_number,
        },
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('받은 친구 요청 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 친구 요청 수락
router.post('/requests/:id/accept', authenticate, validate(friendshipIdParamValidator), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT requester_id, addressee_id, status 
       FROM user_friendships 
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '친구 요청을 찾을 수 없습니다.',
      });
    }

    const reqRow = rows[0];
    if (reqRow.addressee_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '해당 친구 요청에 대한 권한이 없습니다.',
      });
    }

    if (reqRow.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 친구 요청입니다.',
      });
    }

    await pool.execute(
      `UPDATE user_friendships 
       SET status = 'accepted', responded_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: '친구 요청을 수락했습니다.',
    });
  } catch (error) {
    console.error('친구 요청 수락 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 수락 중 오류가 발생했습니다.',
    });
  }
});

// 친구 요청 거절
router.post('/requests/:id/reject', authenticate, validate(friendshipIdParamValidator), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT requester_id, addressee_id, status 
       FROM user_friendships 
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '친구 요청을 찾을 수 없습니다.',
      });
    }

    const reqRow = rows[0];
    if (reqRow.addressee_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '해당 친구 요청에 대한 권한이 없습니다.',
      });
    }

    if (reqRow.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 친구 요청입니다.',
      });
    }

    await pool.execute(
      `UPDATE user_friendships 
       SET status = 'rejected', responded_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: '친구 요청을 거절했습니다.',
    });
  } catch (error) {
    console.error('친구 요청 거절 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 거절 중 오류가 발생했습니다.',
    });
  }
});

// 친구 삭제
router.delete('/:friendUserId', authenticate, validate(friendUserIdParamValidator), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendUserId } = req.params;

    const [rows] = await pool.execute(
      `SELECT id 
       FROM user_friendships 
       WHERE status = 'accepted'
         AND ((requester_id = ? AND addressee_id = ?)
           OR (requester_id = ? AND addressee_id = ?))`,
      [userId, friendUserId, friendUserId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '친구 관계를 찾을 수 없습니다.',
      });
    }

    await pool.execute('DELETE FROM user_friendships WHERE id = ?', [rows[0].id]);

    res.json({
      success: true,
      message: '친구가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('친구 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 삭제 중 오류가 발생했습니다.',
    });
  }
});

// 사용자 신고 (DM·개인우편 등 — target_type user)
router.post(
  '/:friendUserId/report',
  authenticate,
  validate(friendUserIdParamValidator),
  async (req, res) => {
    try {
      const reporterId = req.user.userId;
      const { friendUserId } = req.params;
      const { reason, description } = req.body;

      if (Number(friendUserId) === reporterId) {
        return res.status(400).json({
          success: false,
          message: '본인은 신고할 수 없습니다.',
        });
      }

      const result = await submitContentReport({
        reporterId,
        targetType: 'user',
        targetId: friendUserId,
        reason,
        description,
        options: {
          forbidSelfReport: true,
          targetExistsCheck: {
            notFoundMessage: '사용자를 찾을 수 없습니다.',
            check: async (db) => {
              const [rows] = await db.execute(
                'SELECT id FROM users WHERE id = ? LIMIT 1',
                [friendUserId],
              );
              return rows.length > 0;
            },
          },
        },
      });

      return res.status(result.httpStatus).json(result.body);
    } catch (error) {
      console.error('사용자 신고 오류:', error);
      return res.status(500).json({
        success: false,
        message: '신고 처리 중 오류가 발생했습니다.',
      });
    }
  },
);

// 사용자 차단
router.post('/:friendUserId/block', authenticate, validate(friendUserIdParamValidator), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendUserId } = req.params;
    const { reason } = req.body;

    if (Number(friendUserId) === userId) {
      return res.status(400).json({
        success: false,
        message: '자기 자신을 차단할 수 없습니다.',
      });
    }

    await pool.execute(
      `INSERT INTO user_blocks (user_id, blocked_user_id, reason)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [userId, friendUserId, reason || null]
    );

    // 친구 관계가 있으면 삭제
    await pool.execute(
      `DELETE FROM user_friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`,
      [userId, friendUserId, friendUserId, userId]
    );

    res.json({
      success: true,
      message: '해당 사용자가 차단되었습니다.',
    });
  } catch (error) {
    console.error('사용자 차단 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 차단 중 오류가 발생했습니다.',
    });
  }
});

// 친구 요청 보내기
router.post('/requests', authenticate, validate(sendFriendRequestValidators), async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const { username } = req.body || {};

    console.log('친구 요청 생성 시도:', {
      requesterId,
      rawBody: req.body,
    });

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'username 이(가) 필요합니다.',
      });
    }

    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: '유효한 아이디를 입력해주세요.',
      });
    }

    // 대상 사용자 찾기
    const [userRows] = await pool.execute(
      'SELECT id, username, name, name_enc FROM users WHERE username = ?',
      [trimmed],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 아이디의 사용자를 찾을 수 없습니다.',
      });
    }

    const target = userRows[0];

    if (target.id === requesterId) {
      return res.status(400).json({
        success: false,
        message: '자기 자신에게 친구 요청을 보낼 수 없습니다.',
      });
    }

    // 이미 친구이거나 요청이 존재하는지 확인
    const [existingRows] = await pool.execute(
      `SELECT id, status
       FROM user_friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`,
      [requesterId, target.id, target.id, requesterId],
    );

    if (existingRows.length > 0) {
      const status = existingRows[0].status;
      if (status === 'pending') {
        return res.status(400).json({
          success: false,
          message: '이미 처리 중인 친구 요청이 있습니다.',
        });
      }
      if (status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: '이미 친구 상태입니다.',
        });
      }
      if (status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: '이미 친구 요청을 보냈던 사용자입니다. (거절된 요청이 있음)',
        });
      }
      // 그 외 상태도 중복으로 간주
      return res.status(400).json({
        success: false,
        message: '이미 해당 사용자와 친구 요청 기록이 있습니다.',
      });
    }

    // 친구 요청 생성 (요청 시각은 created_at 기본값 사용)
    console.log('[Friends][FriendRequest] DB INSERT 직전', {
      requesterId,
      addresseeId: target.id,
      addresseeUsername: target.username,
    });
    let insertResult;
    try {
      [insertResult] = await pool.execute(
        `INSERT INTO user_friendships (requester_id, addressee_id, status)
         VALUES (?, ?, 'pending')`,
        [requesterId, target.id],
      );
    } catch (insertErr) {
      if (insertErr?.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: '이미 친구 요청이 있거나 친구 상태입니다.',
        });
      }
      throw insertErr;
    }
    const requestId = insertResult.insertId;
    console.log('[Friends][FriendRequest] DB INSERT 완료', {
      requestId,
      addresseeId: target.id,
    });

    // 알림 생성 (선택적)
    try {
      const allowed = await checkNotificationAllowed(
        target.id,
        'friend_request'
      );
      if (allowed) {
        await createNotification({
          userId: target.id,
          type: 'friend_request',
          category: 'system',
          title: '시스템',
          body: '새 친구 요청이 도착했어요! 친구 목록에서 확인해 보세요',
          relatedType: 'friendship',
          relatedId: requestId,
        });
        console.log('[Friends][FriendRequest] DB 알림 생성 완료 → 소켓 emit 예정', {
          targetUserId: target.id,
          requestId,
        });
        // 수신자에게 소켓으로 즉시 push (빨간점/친구 뱃지 반영)
        emitNotification(target.id, {
          type: 'friend_request',
          category: 'system',
          title: '시스템',
          body: '새 친구 요청이 도착했어요! 친구 목록에서 확인해 보세요',
          relatedType: 'friendship',
          relatedId: requestId,
        });
        console.log('[Friends][FriendRequest] emitNotification 호출 완료 (수신자 userId=%s)', target.id);
      }
    } catch (notifyError) {
      // 알림 실패는 전체 요청을 막지 않음
      console.error('[Friends][FriendRequest] 알림 생성/소켓 오류:', notifyError);
    }

    res.status(201).json({
      success: true,
      message: '친구 요청을 보냈습니다.',
      data: {
        requestId,
        targetUserId: target.id,
        targetUsername: target.username,
        targetName: target.name,
      },
    });
  } catch (error) {
    console.error('친구 요청 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 생성 중 오류가 발생했습니다.',
    });
  }
});

export default router;

