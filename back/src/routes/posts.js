import express from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

// 해시태그 자동완성용 검색 API
// GET /api/posts/tags/search?query=중간
router.get('/tags/search', async (req, res) => {
  try {
    const { query = '' } = req.query;
    let q = String(query || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: { tags: [] },
      });
    }
    if (!q.startsWith('#')) {
      q = `#${q}`;
    }
    const like = `${q}%`;

    const [rows] = await pool.execute(
      'SELECT id, name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 20',
      [like],
    );

    res.json({
      success: true,
      data: { tags: rows },
    });
  } catch (error) {
    console.error('태그 검색 오류:', error);
    res.status(500).json({
      success: false,
      message: '태그 검색 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 목록 조회 (검색 포함) - 선택적 인증으로 본인 글 여부 반환
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const userId = req.user?.userId ?? null;
    const { 
      boardType, 
      schoolId, 
      page = 1, 
      limit = 20, 
      search, 
      sort = 'latest' 
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, offset);
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE` : 'WHERE p.is_deleted = FALSE';

    // 정렬
    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy = 'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    // 게시글 조회 (삭제되지 않은 것만)
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
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );

    // 전체 개수 조회 (삭제 제외)
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const postsForClient = posts.map((p) => {
      const { user_id, ...rest } = p;
      return {
        ...rest,
        is_author: !!userId && user_id === userId,
        author_user_id: user_id,
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsForClient,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    const detail = error?.message || String(error);
    res.status(500).json({
      success: false,
      message: '게시글 목록 조회 중 오류가 발생했습니다.',
      errorDetail: detail,
    });
  }
});

// 내가 쓴 글 목록
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
    } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(
      0,
      (parseInt(page, 10) - 1) * limitNum,
    );

    const conditions = ['p.user_id = ?'];
    const params = [userId];

    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    if (search) {
      conditions.push('p.content LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE`
        : 'WHERE p.is_deleted = FALSE';

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy =
        'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

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
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM posts p
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내가 쓴 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내가 쓴 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 좋아요 누른 글 목록
router.get('/liked', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
    } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(
      0,
      (parseInt(page, 10) - 1) * limitNum,
    );

    const conditions = ['pl.user_id = ?'];
    const params = [userId];

    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    if (search) {
      conditions.push('p.content LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE`
        : 'WHERE p.is_deleted = FALSE';

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy =
        'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

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
       FROM post_likes pl
       INNER JOIN posts p ON pl.post_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN schools s ON p.school_id = s.school_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM post_likes pl
       INNER JOIN posts p ON pl.post_id = p.id
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('좋아요 누른 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '좋아요 누른 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 상세 조회 - 선택적 인증으로 본인 글 여부 반환
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? null;

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
      WHERE p.id = ? AND p.is_deleted = FALSE`,
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    const post = posts[0];

    // 해시태그 목록 조회
    const [postTags] = await pool.execute(
      `SELECT 
        t.id,
        t.name
      FROM post_tags pt
      INNER JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = ?
      ORDER BY t.name`,
      [id]
    );

    // 사용자가 좋아요를 눌렀는지 확인
    let isLiked = false;
    if (userId) {
      const [likes] = await pool.execute(
        'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      isLiked = likes.length > 0;
    }

    const isMine = !!userId && post.user_id === userId;
    const postAuthorId = post.user_id;
    const { user_id, ...postSafe } = post;

    res.json({
      success: true,
      data: {
        ...postSafe,
        isLiked,
        isMine,
        post_author_id: postAuthorId,
        current_user_id: userId ?? null,
        tags: postTags,
      },
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
    const { boardType, schoolId, content, tags } = req.body;

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
      `INSERT INTO posts (user_id, board_type, school_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, boardType, boardType === 'school' ? schoolId : null, content, getNowForDB()]
    );

    const postId = result.insertId;

    // 전체 게시판(national)에서만 해시태그 허용
    if (boardType === 'national' && Array.isArray(tags) && tags.length > 0) {
      for (let rawTag of tags) {
        if (rawTag == null) continue;
        let name = String(rawTag).trim();
        if (!name) continue;
        if (!name.startsWith('#')) {
          name = `#${name}`;
        }
        // 최대 길이 제한 (DB는 VARCHAR(50))
        if (name.length > 50) {
          name = name.slice(0, 50);
        }

        // 태그 존재 여부 확인
        let tagId;
        const [existingTags] = await pool.execute(
          'SELECT id FROM tags WHERE name = ?',
          [name]
        );
        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          const [tagResult] = await pool.execute(
            'INSERT INTO tags (name, created_at) VALUES (?, ?)',
            [name, getNowForDB()]
          );
          tagId = tagResult.insertId;
        }

        // 게시글-태그 매핑 (중복은 무시)
        await pool.execute(
          'INSERT IGNORE INTO post_tags (post_id, tag_id, created_at) VALUES (?, ?, ?)',
          [postId, tagId, getNowForDB()]
        );
      }
    }

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
        postId,
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

// 게시글 삭제 (본인 글만)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [posts] = await pool.execute(
      'SELECT id, user_id, board_type, school_id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '본인이 작성한 글만 삭제할 수 있습니다.',
      });
    }

    await pool.execute('UPDATE posts SET is_deleted = TRUE WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '게시글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '게시글 삭제 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 좋아요
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 게시글 존재 확인 (삭제되지 않은 글만)
    const [posts] = await pool.execute(
      'SELECT id, user_id, content FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id],
    );
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

    // 게시글 존재 확인 (삭제된 글은 신고 불가)
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ? AND is_deleted = FALSE', [id]);
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
