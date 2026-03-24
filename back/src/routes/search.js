import express from 'express';
import pool from '../config/database.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/search/preview?query=...
// - 학교 이름만 미리보기 (최대 2개)
router.get('/preview', async (req, res) => {
  try {
    const { query = '' } = req.query;
    const q = String(query || '').trim();
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { schools: [] },
      });
    }

    const like = `%${q}%`;

    // 학교 이름에 query 를 포함하는 학교 (최대 2개)
    const [schoolRows] = await pool.execute(
      `SELECT school_id, name
       FROM schools
       WHERE name LIKE ?
       ORDER BY name
       LIMIT 2`,
      [like],
    );

    res.json({
      success: true,
      data: {
        schools: schoolRows.map((s) => ({
          schoolId: s.school_id,
          name: s.name,
        })),
      },
    });
  } catch (error) {
    console.error('검색 미리보기 오류:', error);
    res.status(500).json({
      success: false,
      message: '검색 미리보기 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/search/posts?query=...&page=1&limit=20
// - 게시글 전체 검색 (섹션별로 클라이언트에서 board_type 기반 그룹핑)
// - matchedSchools: 검색어를 포함하는 학교 최대 5개 반환
router.get('/posts', optionalAuthenticate, async (req, res) => {
  try {
    const {
      query = '',
      page = 1,
      limit = 20,
    } = req.query;

    const q = String(query || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: {
          posts: [],
          matchedSchools: [],
          pagination: {
            page: 1,
            limit: Number(limit) || 20,
            total: 0,
            totalPages: 1,
            hasMore: false,
          },
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const offsetNum = (pageNum - 1) * limitNum;
    const like = `%${q}%`;

    // 현재 사용자 학교 ID 조회 (있으면 학교 게시판/학교 우편을 해당 학교로 제한)
    let userSchoolId = null;
    const userId = req.user?.userId ?? null;
    if (userId) {
      const [users] = await pool.execute(
        'SELECT school_id FROM users WHERE id = ?',
        [userId],
      );
      if (users.length > 0) {
        userSchoolId = users[0].school_id;
      }
    }

    // 게시글 검색 (삭제되지 않은 것만)
    // - 전체게시판(national): 모든 학교
    // - 학교게시판(school): 로그인한 경우에만 본인 학교의 글
    const postWhereParts = ['p.is_deleted = FALSE', 'p.content LIKE ?'];
    const postParams = [like];
    if (userSchoolId) {
      postWhereParts.push(
        `(p.board_type = 'national' OR (p.board_type = 'school' AND p.school_id = ?))`,
      );
      postParams.push(userSchoolId);
    } else {
      postWhereParts.push(`p.board_type = 'national'`);
    }
    const postWhere = `WHERE ${postWhereParts.join(' AND ')}`;

    const [rows] = await pool.execute(
      `SELECT 
         p.id,
         p.board_type,
         p.school_id,
         p.content,
         p.like_count,
         p.comment_count,
         p.created_at,
         s.name AS school_name
       FROM posts p
       LEFT JOIN schools s ON p.school_id = s.school_id
       ${postWhere}
       ORDER BY p.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      postParams,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM posts p
       ${postWhere}`,
      postParams,
    );
    const total = Number(countResult[0]?.total ?? 0);

    const posts = rows.map((p) => ({
      id: p.id,
      boardType: p.board_type,
      schoolId: p.school_id,
      schoolName: p.school_name,
      content: p.content,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      createdAt: p.created_at,
    }));

    // 학교 매칭: 이름에 query 를 포함하는 학교 최대 5개 (소속학교와 무관하게 전역 검색)
    let matchedSchools = [];
    const [schoolRows] = await pool.execute(
      `SELECT school_id, name
       FROM schools
       WHERE name LIKE ?
       ORDER BY RAND()
       LIMIT 5`,
      [`%${q}%`],
    );
    matchedSchools = schoolRows.map((s) => ({
      schoolId: s.school_id,
      name: s.name,
    }));

    // 학교 우편(학교우편) 검색: 로그인 + 사용자 학교가 있는 경우에만
    let schoolMails = [];
    if (userSchoolId) {
      const [mailRows] = await pool.execute(
        `SELECT id, content, created_at
         FROM school_mails
         WHERE is_deleted = FALSE
           AND school_id = ?
           AND content LIKE ?
         ORDER BY created_at DESC
         LIMIT 20`,
        [userSchoolId, like],
      );
      schoolMails = mailRows.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.created_at,
      }));
    }

    res.json({
      success: true,
      data: {
        posts,
        schoolMails,
        matchedSchools,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
          hasMore: pageNum * limitNum < total,
        },
      },
    });
  } catch (error) {
    console.error('검색 결과 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '검색 결과 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;

