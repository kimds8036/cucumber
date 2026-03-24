import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/schools/search?query=xxx
router.get('/search', async (req, res) => {
  try {
    const query = String(req.query?.query || '').trim();

    if (!query) {
      return res.json({ success: true, data: { schools: [] } });
    }

    const [rows] = await pool.execute(
      `SELECT school_id, name, region
       FROM schools
       WHERE name LIKE ?
       ORDER BY name ASC
       LIMIT 10`,
      [`%${query}%`]
    );

    const schools = rows.map((s) => ({
      id: s.school_id,
      name: s.name,
      region: s.region || '',
    }));

    res.json({ success: true, data: { schools } });
  } catch (error) {
    console.error('학교 검색 오류:', error);
    res.status(500).json({ success: false, message: '학교 검색 중 오류가 발생했습니다.' });
  }
});

// 내 학교 정보 및 통계
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자 + 학교 기본 정보
    const [rows] = await pool.execute(
      `SELECT 
         u.school_id,
         s.name AS school_name,
         s.address,
         s.region,
         s.total_students,
         s.total_posts
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0 || !rows[0].school_id) {
      return res.status(404).json({
        success: false,
        message: '사용자의 학교 정보를 찾을 수 없습니다.',
      });
    }

    const schoolId = rows[0].school_id;

    // 우편 수 (학교 우편)
    const [mailRows] = await pool.execute(
      `SELECT COUNT(*) AS mailCount
       FROM school_mails
       WHERE school_id = ? AND is_deleted = FALSE`,
      [schoolId],
    );

    const mailCount = Number(mailRows[0]?.mailCount ?? 0);

    // 게시글 수는 schools.total_posts 사용 (없는 경우 posts에서 계산)
    let postCount =
      rows[0].total_posts != null ? Number(rows[0].total_posts) : 0;

    if (!postCount) {
      const [postRows] = await pool.execute(
        `SELECT COUNT(*) AS postCount
         FROM posts
         WHERE board_type = 'school' AND school_id = ?`,
        [schoolId],
      );
      postCount = Number(postRows[0]?.postCount ?? 0);
    }

    const studentCount =
      rows[0].total_students != null
        ? Number(rows[0].total_students)
        : 0;

    res.json({
      success: true,
      data: {
        id: schoolId,
        name: rows[0].school_name,
        address: rows[0].address,
        region: rows[0].region,
        studentCount,
        postCount,
        mailCount,
      },
    });
  } catch (error) {
    console.error('내 학교 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 학교 정보 조회 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/schools/:schoolId - 특정 학교 기본 정보 + 게시글/우편함 개수
// school_id 가 VARCHAR(50)이므로 숫자 변환 없이 문자열 그대로 사용
router.get('/:schoolId', async (req, res) => {
  const { schoolId } = req.params;

  try {
    const [[schoolRow]] = await pool.execute(
      `SELECT school_id, name, address, total_students
       FROM schools
       WHERE school_id = ?`,
      [schoolId],
    );

    if (!schoolRow) {
      return res.status(404).json({
        success: false,
        message: '학교를 찾을 수 없습니다.',
      });
    }

    const [[postCountRow]] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM posts
       WHERE is_deleted = FALSE
         AND school_id = ?`,
      [schoolId],
    );

    const [[mailCountRow]] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM school_mails
       WHERE is_deleted = FALSE
         AND school_id = ?`,
      [schoolId],
    );

    const studentCount =
      schoolRow.total_students != null ? Number(schoolRow.total_students) : 0;

    res.json({
      success: true,
      data: {
        schoolId: schoolRow.school_id,
        name: schoolRow.name,
        location: schoolRow.address || '',
        studentCount,
        postCount: Number(postCountRow?.count ?? 0),
        mailCount: Number(mailCountRow?.count ?? 0),
      },
    });
  } catch (error) {
    console.error('학교 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '학교 정보 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;

