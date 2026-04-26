import express from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { cloudinary, upload } from '../config/cloudinary.js';

const router = express.Router();

// 댓글 삭제 (본인 댓글만, 소프트 삭제)
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    const [comments] = await pool.execute(
      'SELECT id, user_id, post_id FROM comments WHERE id = ? AND is_deleted = FALSE',
      [commentId],
    );
    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }
    if (comments[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '본인이 작성한 댓글만 삭제할 수 있습니다.',
      });
    }

    await pool.execute('UPDATE comments SET is_deleted = TRUE WHERE id = ?', [
      commentId,
    ]);
    const postId = comments[0].post_id;
    await pool.execute(
      'UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?',
      [postId],
    );

    res.json({
      success: true,
      message: '댓글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 삭제 중 오류가 발생했습니다.',
    });
  }
});

// 댓글 작성 (대댓글 포함)
router.post('/:postId/comments', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content?.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        message: '댓글 내용을 입력해주세요.',
      });
    }

    // 게시글 존재 확인
    const [posts] = await pool.execute(
      'SELECT id, user_id, content FROM posts WHERE id = ?',
      [postId],
    );
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // 대댓글인 경우 부모 댓글 확인
    let parentComment = null;
    if (parentCommentId) {
      const [parentComments] = await pool.execute(
        'SELECT id, user_id, content FROM comments WHERE id = ? AND post_id = ?',
        [parentCommentId, postId],
      );
      if (parentComments.length === 0) {
        return res.status(404).json({
          success: false,
          message: '부모 댓글을 찾을 수 없습니다.',
        });
      }
      parentComment = parentComments[0];
    }

    // 익명 번호: 게시글 내 동일 유저는 같은 번호 유지, 신규 유저는 고유 작성자 수 기준 순번
    const [existingIndex] = await pool.execute(
      `SELECT anonymous_index FROM comments
       WHERE post_id = ? AND user_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [postId, userId],
    );

    let anonymousIndex;
    if (existingIndex.length > 0) {
      anonymousIndex = existingIndex[0].anonymous_index;
    } else {
      const [uniqueAuthors] = await pool.execute(
        `SELECT COUNT(DISTINCT user_id) as count FROM comments
         WHERE post_id = ? AND is_deleted = FALSE`,
        [postId],
      );
      anonymousIndex = uniqueAuthors[0].count + 1;
    }

    // 댓글 생성
    const [result] = await pool.execute(
      `INSERT INTO comments (post_id, user_id, parent_comment_id, content, anonymous_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        postId,
        userId,
        parentCommentId || null,
        content?.trim() || null,
        anonymousIndex,
        getNowForDB(),
      ],
    );
    const commentId = result.insertId;
    if (req.files && req.files.length > 0) {
      const imageValues = req.files.map((file, index) => [
        commentId,
        file.path,
        file.filename,
        index,
      ]);
      await pool.query(
        'INSERT INTO comment_images (comment_id, cloudinary_url, cloudinary_public_id, display_order) VALUES ?',
        [imageValues]
      );
    }

    // 게시글의 댓글 수 증가
    await pool.execute(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
      [postId],
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
      [commentId],
    );

    const post = posts[0];

    // 게시글 작성자에게 댓글/대댓글 알림 (비동기 큐로 위임)
    if (post.user_id && post.user_id !== userId) {
      const isReplyToPost = !parentCommentId;
      await enqueueNotification({
        userId: post.user_id,
        type: isReplyToPost ? 'comment' : 'reply',
        category: 'post',
        title: '내 게시글에 새로운 댓글이 달렸어요',
        body: content.slice(0, 80),
        relatedType: 'post',
        relatedId: post.id,
      });
    }

    // 부모 댓글 작성자에게 대댓글 알림 (게시글 작성자와 다를 때, 비동기 큐)
    if (
      parentComment &&
      parentComment.user_id &&
      parentComment.user_id !== userId &&
      parentComment.user_id !== post.user_id
    ) {
      await enqueueNotification({
        userId: parentComment.user_id,
        type: 'reply',
        category: 'post',
        title: '내 댓글에 새 답글이 달렸어요',
        body: content.slice(0, 80),
        relatedType: 'post',
        relatedId: post.id,
      });
    }

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다.',
      data: comments[0],
    });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 작성 중 오류가 발생했습니다.',
    });
  }
});

// 댓글 목록 조회 (로그인 시 각 댓글 isLiked 반영 — optionalAuthenticate로 req.user 설정)
router.get('/:postId/comments', optionalAuthenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId ?? null;

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [
      postId,
    ]);
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // 댓글 조회 (대댓글 포함, 삭제된 댓글 제외)
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
        u.color_id,
        (SELECT JSON_ARRAYAGG(cloudinary_url)
          FROM comment_images
          WHERE comment_id = c.id AND deleted_at IS NULL
          ORDER BY display_order ASC) AS images
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.is_deleted = FALSE
      ORDER BY c.parent_comment_id IS NULL DESC, c.created_at ASC`,
      [postId],
    );

    // 사용자가 좋아요를 눌렀는지 확인
    const commentIds = comments.map((c) => c.id);
    let likedCommentIds = [];
    if (userId && commentIds.length > 0) {
      const placeholders = commentIds.map(() => '?').join(',');
      const [likes] = await pool.execute(
        `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`,
        [userId, ...commentIds],
      );
      likedCommentIds = likes.map((l) => l.comment_id);
    }

    // 댓글에 isLiked 속성 추가
    const likedSet = new Set(likedCommentIds);
    const result = comments.map(comment => ({
      ...comment,
      images: comment.images ? JSON.parse(comment.images) : [],
      isLiked: likedSet.has(comment.id),
    }));

    res.json({
      success: true,
      data: {
        comments: result,
      },
    });
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 댓글 좋아요
router.post('/:commentId/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    // 댓글 존재 확인 (삭제되지 않은 댓글만)
    const [comments] = await pool.execute(
      'SELECT id, user_id, content FROM comments WHERE id = ? AND is_deleted = FALSE',
      [commentId],
    );
    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    // 이미 좋아요를 눌렀는지 확인
    const [existingLikes] = await pool.execute(
      'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId],
    );

    if (existingLikes.length > 0) {
      // 좋아요 취소
      await pool.execute(
        'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
        [userId, commentId],
      );
      await pool.execute(
        'UPDATE comments SET like_count = like_count - 1 WHERE id = ?',
        [commentId],
      );

      res.json({
        success: true,
        message: '좋아요가 취소되었습니다.',
        data: { isLiked: false },
      });
    } else {
      // 좋아요 추가
      await pool.execute(
        'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
        [userId, commentId],
      );
      await pool.execute(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = ?',
        [commentId],
      );

      const comment = comments[0];
      // 댓글 좋아요 알림은 정책 변경으로 더 이상 생성하지 않는다.

      res.json({
        success: true,
        message: '좋아요가 추가되었습니다.',
        data: { isLiked: true },
      });
    }
  } catch (error) {
    console.error('댓글 좋아요 오류:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: '이미 좋아요를 누른 댓글입니다.',
      });
    }

    res.status(500).json({
      success: false,
      message: '좋아요 처리 중 오류가 발생했습니다.',
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
        message: '신고 사유를 입력해주세요.',
      });
    }

    // 댓글 존재 확인
    const [comments] = await pool.execute(
      'SELECT id FROM comments WHERE id = ? AND is_deleted = FALSE',
      [commentId],
    );
    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    // 중복 신고 확인
    const [existingReports] = await pool.execute(
      'SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?',
      [reporterId, 'comment', commentId],
    );

    if (existingReports.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 신고한 댓글입니다.',
      });
    }

    // 신고 생성
    await pool.execute(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [reporterId, 'comment', commentId, reason, description || null],
    );

    res.status(201).json({
      success: true,
      message: '신고가 접수되었습니다.',
    });
  } catch (error) {
    console.error('댓글 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '신고 처리 중 오류가 발생했습니다.',
    });
  }
});

export default router;
