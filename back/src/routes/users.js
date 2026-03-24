import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/search?schoolId=xxx&query=xxx
router.get('/search', authenticate, async (req, res) => {
  try {
    const schoolId = String(req.query?.schoolId || '').trim();
    const query = String(req.query?.query || '').trim();

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId가 필요합니다.' });
    }

    const params = [schoolId];
    let whereQuery = '';
    if (query) {
      whereQuery = ' AND (u.username LIKE ? OR u.name LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }
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
         ${whereQuery}
       ORDER BY u.name ASC
       LIMIT 10`,
      params
    );

    const users = rows.map((u) => ({
      id: u.id,
      displayName: `${u.name} (${u.username})`,
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
