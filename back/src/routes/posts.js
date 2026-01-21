import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 게시글 목록 조회 (검색 포함)
router.get('/', async (req, res) => {
  try {
    const { 
      boardType, 
      schoolId, 
      page = 1, 
      limit = 20, 
      search, 
      sort = 'latest' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    // 게시판 타입 필터
    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    // 학교 게시판 필터
    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    // 검색어 필터
    if (search) {
      conditions.push('p.content LIKE ?');
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 정렬
    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy = 'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    // 게시글 조회
    const [posts] = await pool.execute(
      `SELECT 
        p.id, 
        p.user_id, 
        p.board_type, 
        p.school_id, 
        p.content, 
        p.like_count, 
        p.comment_count, 
        p.created_at,
        u.name as author_name,
        u.color_id,
        s.name as school_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN schools s ON p.school_id = s.school_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '게시글 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization ? req.user?.userId : null;

    // 게시글 조회
    const [posts] = await pool.execute(
      `SELECT 
        p.id, 
        p.user_id, 
        p.board_type, 
        p.school_id, 
        p.content, 
        p.like_count, 
        p.comment_count, 
        p.created_at,
        u.name as author_name,
        u.color_id,
        s.name as school_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN schools s ON p.school_id = s.school_id
      WHERE p.id = ?`,
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    const post = posts[0];

    // 사용자가 좋아요를 눌렀는지 확인
    let isLiked = false;
    if (userId) {
      const [likes] = await pool.execute(
        'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      isLiked = likes.length > 0;
    }

    res.json({
      success: true,
      data: {
        ...post,
        isLiked
      }
    });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '게시글 상세 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 작성
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardType, schoolId, content } = req.body;

    if (!boardType || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '게시판 유형과 내용을 입력해주세요.' 
      });
    }

    if (boardType === 'school' && !schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: '학교 게시판은 학교 ID가 필요합니다.' 
      });
    }

    // 사용자 정보 확인
    const [users] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = users[0];

    // 학교 게시판인 경우 사용자의 학교와 일치하는지 확인
    if (boardType === 'school' && user.school_id !== parseInt(schoolId)) {
      return res.status(403).json({ 
        success: false, 
        message: '본인 학교 게시판에만 글을 작성할 수 있습니다.' 
      });
    }

    // 게시글 생성
    const [result] = await pool.execute(
      `INSERT INTO posts (user_id, board_type, school_id, content) 
       VALUES (?, ?, ?, ?)`,
      [userId, boardType, boardType === 'school' ? schoolId : null, content]
    );

    // 학교 게시판인 경우 학교의 총 게시글 수 증가
    if (boardType === 'school' && schoolId) {
      await pool.execute(
        'UPDATE schools SET total_posts = total_posts + 1 WHERE school_id = ?',
        [schoolId]
      );
    }

    res.status(201).json({
      success: true,
      message: '게시글이 작성되었습니다.',
      data: {
        postId: result.insertId
      }
    });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '게시글 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 좋아요
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 이미 좋아요를 눌렀는지 확인
    const [existingLikes] = await pool.execute(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, id]
    );

    if (existingLikes.length > 0) {
      // 좋아요 취소
      await pool.execute(
        'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      await pool.execute(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: '좋아요가 취소되었습니다.',
        data: { isLiked: false }
      });
    } else {
      // 좋아요 추가
      await pool.execute(
        'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
        [userId, id]
      );
      await pool.execute(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: '좋아요가 추가되었습니다.',
        data: { isLiked: true }
      });
    }
  } catch (error) {
    console.error('게시글 좋아요 오류:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 좋아요를 누른 게시글입니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '좋아요 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 신고
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: '신고 사유를 입력해주세요.' 
      });
    }

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 중복 신고 확인 (같은 사용자가 같은 게시글을 신고)
    const [existingReports] = await pool.execute(
      'SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?',
      [reporterId, 'post', id]
    );

    if (existingReports.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 신고한 게시글입니다.' 
      });
    }

    // 신고 생성
    await pool.execute(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [reporterId, 'post', id, reason, description || null]
    );

    res.status(201).json({
      success: true,
      message: '신고가 접수되었습니다.'
    });
  } catch (error) {
    console.error('게시글 신고 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '신고 처리 중 오류가 발생했습니다.' 
    });
  }
});

export default router;
