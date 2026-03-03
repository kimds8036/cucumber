import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 댓글 작성 (대댓글 포함)
router.post('/:postId/comments', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: '댓글 내용을 입력해주세요.' 
      });
    }

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 대댓글인 경우 부모 댓글 확인
    if (parentCommentId) {
      const [parentComments] = await pool.execute(
        'SELECT id FROM comments WHERE id = ? AND post_id = ?',
        [parentCommentId, postId]
      );
      if (parentComments.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: '부모 댓글을 찾을 수 없습니다.' 
        });
      }
    }

    // 해당 게시글의 댓글 수 계산하여 익명 번호 부여
    const [commentCountResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
      [postId]
    );
    const anonymousIndex = (commentCountResult[0].count % 100) + 1;

    // 댓글 생성
    const [result] = await pool.execute(
      `INSERT INTO comments (post_id, user_id, parent_comment_id, content, anonymous_index) 
       VALUES (?, ?, ?, ?, ?)`,
      [postId, userId, parentCommentId || null, content, anonymousIndex]
    );

    // 게시글의 댓글 수 증가
    await pool.execute(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
      [postId]
    );

    // 생성된 댓글 정보 조회
    const [comments] = await pool.execute(
      `SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.parent_comment_id,
        c.content,
        c.anonymous_index,
        c.like_count,
        c.created_at,
        u.name as author_name,
        u.color_id
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다.',
      data: comments[0]
    });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '댓글 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 댓글 목록 조회
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.headers.authorization ? req.user?.userId : null;

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 댓글 조회 (대댓글 포함)
    const [comments] = await pool.execute(
      `SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.parent_comment_id,
        c.content,
        c.anonymous_index,
        c.like_count,
        c.created_at,
        u.name as author_name,
        u.color_id
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.parent_comment_id IS NULL DESC, c.created_at ASC`,
      [postId]
    );

    // 사용자가 좋아요를 눌렀는지 확인
    const commentIds = comments.map(c => c.id);
    let likedCommentIds = [];
    if (userId && commentIds.length > 0) {
      const placeholders = commentIds.map(() => '?').join(',');
      const [likes] = await pool.execute(
        `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`,
        [userId, ...commentIds]
      );
      likedCommentIds = likes.map(l => l.comment_id);
    }

    // 댓글에 isLiked 속성 추가
    const commentsWithLikes = comments.map(comment => ({
      ...comment,
      isLiked: likedCommentIds.includes(comment.id)
    }));

    res.json({
      success: true,
      data: {
        comments: commentsWithLikes
      }
    });
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '댓글 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 댓글 좋아요
router.post('/:commentId/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    // 댓글 존재 확인
    const [comments] = await pool.execute('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '댓글을 찾을 수 없습니다.' 
      });
    }

    // 이미 좋아요를 눌렀는지 확인
    const [existingLikes] = await pool.execute(
      'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );

    if (existingLikes.length > 0) {
      // 좋아요 취소
      await pool.execute(
        'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
      );
      await pool.execute(
        'UPDATE comments SET like_count = like_count - 1 WHERE id = ?',
        [commentId]
      );

      res.json({
        success: true,
        message: '좋아요가 취소되었습니다.',
        data: { isLiked: false }
      });
    } else {
      // 좋아요 추가
      await pool.execute(
        'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
        [userId, commentId]
      );
      await pool.execute(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = ?',
        [commentId]
      );

      res.json({
        success: true,
        message: '좋아요가 추가되었습니다.',
        data: { isLiked: true }
      });
    }
  } catch (error) {
    console.error('댓글 좋아요 오류:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 좋아요를 누른 댓글입니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '좋아요 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 댓글 신고
router.post('/:commentId/report', authenticate, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { commentId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: '신고 사유를 입력해주세요.' 
      });
    }

    // 댓글 존재 확인
    const [comments] = await pool.execute('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '댓글을 찾을 수 없습니다.' 
      });
    }

    // 중복 신고 확인
    const [existingReports] = await pool.execute(
      'SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?',
      [reporterId, 'comment', commentId]
    );

    if (existingReports.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 신고한 댓글입니다.' 
      });
    }

    // 신고 생성
    await pool.execute(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [reporterId, 'comment', commentId, reason, description || null]
    );

    res.status(201).json({
      success: true,
      message: '신고가 접수되었습니다.'
    });
  } catch (error) {
    console.error('댓글 신고 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '신고 처리 중 오류가 발생했습니다.' 
    });
  }
});

export default router;
