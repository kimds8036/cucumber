import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/users/fcm-token
router.post('/fcm-token', authenticate, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const userId = req.user.userId;

    if (!token) {
      return res.status(400).json({ success: false, message: 'token 필요' });
    }

    await pool.execute('UPDATE users SET fcm_token = ? WHERE id = ?', [
      token,
      userId,
    ]);

    return res.json({ success: true });
  } catch (error) {
    console.error('FCM 토큰 저장 오류:', error);
    return res
      .status(500)
      .json({ success: false, message: 'FCM 토큰 저장 중 오류가 발생했습니다.' });
  }
});

// GET /api/users/me/stats
// - 마이페이지 카드용 집계(친구/게시글/스크랩 수)
router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [[friendRows], [postRows], [scrapRows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM user_friendships
         WHERE status = 'accepted'
           AND (requester_id = ? OR addressee_id = ?)`,
        [userId, userId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM posts
         WHERE user_id = ?
           AND is_deleted = FALSE`,
        [userId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM post_scraps
         WHERE user_id = ?`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        friendCount: Number(friendRows[0]?.count ?? 0),
        postCount: Number(postRows[0]?.count ?? 0),
        scrapCount: Number(scrapRows[0]?.count ?? 0),
      },
    });
  } catch (error) {
    console.error('내 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 통계 조회 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/users/search?schoolId=xxx&query=xxx
router.get('/search', authenticate, async (req, res) => {
  try {
    const schoolId = String(req.query?.schoolId || '').trim();
    let matchStr = String(req.query?.query || '').trim();
    if (matchStr.startsWith('@')) {
      matchStr = matchStr.slice(1).trim();
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId가 필요합니다.' });
    }

    if (!matchStr) {
      return res.json({ success: true, data: { users: [] } });
    }

    const params = [schoolId, matchStr, matchStr];
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         u.username,
         u.grade,
         u.class_number,
         s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE u.is_deleted = FALSE
         AND u.school_id = ?
         AND (u.username = ? OR u.name = ?)
       ORDER BY u.name ASC
       LIMIT 10`,
      params
    );

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      displayName: u.name,
      schoolName: u.school_name || '',
      grade: u.grade ?? null,
      class: u.class_number ?? null,
    }));

    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('유저 검색 오류:', error);
    res.status(500).json({ success: false, message: '유저 검색 중 오류가 발생했습니다.' });
  }
});

export default router;
