import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 사용자 설정 조회
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 설정 행이 없으면 기본값으로 생성
    await pool.execute(
      `INSERT IGNORE INTO user_settings (user_id) VALUES (?)`,
      [userId]
    );

    const [rows] = await pool.execute(
      `SELECT 
         user_id,
         push_enabled,
         new_post,
         new_comment,
         new_like,
         announcement,
         friend_request,
         mail_outgoing,
         board_distance_km,
         last_username_change_at,
         created_at,
         updated_at
       FROM user_settings
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자 설정을 찾을 수 없습니다.',
      });
    }

    const s = rows[0];
    res.json({
      success: true,
      data: {
        pushEnabled: !!s.push_enabled,
        newPost: !!s.new_post,
        newComment: !!s.new_comment,
        newLike: !!s.new_like,
        announcement: !!s.announcement,
        friendRequest: !!(s.friend_request ?? 1),
        mailOutgoing: !!(s.mail_outgoing ?? 1),
        boardDistanceKm: s.board_distance_km,
        lastUsernameChangeAt: s.last_username_change_at,
      },
    });
  } catch (error) {
    console.error('사용자 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 설정 조회 중 오류가 발생했습니다.',
    });
  }
});

// 사용자 설정 업데이트
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      pushEnabled,
      newPost,
      newComment,
      newLike,
      announcement,
      friendRequest,
      mailOutgoing,
      boardDistanceKm,
      lastUsernameChangeAt,
    } = req.body;

    // 존재 보장
    await pool.execute(
      `INSERT IGNORE INTO user_settings (user_id) VALUES (?)`,
      [userId]
    );

    const fields = [];
    const params = [];

    if (pushEnabled !== undefined) {
      fields.push('push_enabled = ?');
      params.push(pushEnabled ? 1 : 0);
    }
    if (newPost !== undefined) {
      fields.push('new_post = ?');
      params.push(newPost ? 1 : 0);
    }
    if (newComment !== undefined) {
      fields.push('new_comment = ?');
      params.push(newComment ? 1 : 0);
    }
    if (newLike !== undefined) {
      fields.push('new_like = ?');
      params.push(newLike ? 1 : 0);
    }
    if (announcement !== undefined) {
      fields.push('announcement = ?');
      params.push(announcement ? 1 : 0);
    }
    if (friendRequest !== undefined) {
      fields.push('friend_request = ?');
      params.push(friendRequest ? 1 : 0);
    }
    if (mailOutgoing !== undefined) {
      fields.push('mail_outgoing = ?');
      params.push(mailOutgoing ? 1 : 0);
    }
    if (boardDistanceKm !== undefined) {
      const km = Math.min(100, Math.max(1, parseInt(boardDistanceKm, 10) || 10));
      fields.push('board_distance_km = ?');
      params.push(km);
    }
    if (lastUsernameChangeAt !== undefined) {
      fields.push('last_username_change_at = ?');
      params.push(lastUsernameChangeAt || null);
    }

    if (fields.length === 0) {
      return res.json({
        success: true,
        message: '변경된 설정이 없습니다.',
      });
    }

    params.push(userId);

    await pool.execute(
      `UPDATE user_settings
       SET ${fields.join(', ')}
       WHERE user_id = ?`,
      params
    );

    res.json({
      success: true,
      message: '사용자 설정이 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('사용자 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 설정 업데이트 중 오류가 발생했습니다.',
    });
  }
});

export default router;

