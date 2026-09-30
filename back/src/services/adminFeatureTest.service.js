import pool from '../config/database.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { resolveAnonNo } from '../utils/resolveAnonNo.js';
import { API_ERROR_CODES } from '../constants/apiErrorCodes.js';
import { getIO } from '../socketServer.js';

function fail(status, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.body = { success: false, message, ...extra };
  return error;
}

async function loadUser(conn, userId) {
  const [rows] = await conn.execute(
    'SELECT id, school_id, student_verified FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (!rows.length) throw fail(404, '사용자를 찾을 수 없습니다.');
  return rows[0];
}

export async function dryRunPost({ targetUserId, boardType, schoolId, content }) {
  const userId = Number(targetUserId);
  const rawContent = typeof content === 'string' ? content : String(content ?? '');
  if (!Number.isFinite(userId) || userId <= 0) throw fail(400, '대상 유저 ID가 올바르지 않습니다.');
  if (!boardType || !rawContent.trim()) {
    throw fail(400, '게시판 유형과 내용을 입력해주세요.');
  }
  if (boardType === 'school' && !schoolId) {
    throw fail(400, '학교 게시판은 학교 ID가 필요합니다.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const user = await loadUser(conn, userId);
    if ((boardType === 'school' || boardType === 'student') && !user.student_verified) {
      throw fail(403, '학생 인증이 필요한 기능입니다. 학생증으로 인증해 주세요.', {
        code: API_ERROR_CODES.STUDENT_VERIFICATION_REQUIRED,
      });
    }
    if (boardType === 'school' && String(user.school_id) !== String(schoolId)) {
      throw fail(403, '본인 학교 게시판에만 글을 작성할 수 있습니다.');
    }

    const [result] = await conn.execute(
      `INSERT INTO posts (user_id, board_type, school_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        boardType,
        boardType === 'school' ? schoolId : null,
        rawContent.trim(),
        getNowForDB(),
      ],
    );
    const postId = result.insertId;
    await conn.rollback();

    const bypassedExternalCalls = ['evaluateAndUnlockBadges'];
    if (boardType === 'school' && schoolId) bypassedExternalCalls.push('scheduleSchoolStats');

    return {
      success: true,
      message: 'Dry-run: 게시글은 저장되지 않았습니다.',
      dryRun: true,
      bypassedExternalCalls,
      data: { postId, userId, boardType, content: rawContent.trim() },
    };
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
}

export async function dryRunComment({
  targetUserId,
  postId,
  content,
  parentCommentId,
}) {
  const userId = Number(targetUserId);
  const pid = Number(postId);
  if (!Number.isFinite(userId) || userId <= 0) throw fail(400, '대상 유저 ID가 올바르지 않습니다.');
  if (!Number.isFinite(pid) || pid <= 0) throw fail(400, '게시글 ID가 올바르지 않습니다.');
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) throw fail(400, '댓글 내용을 입력해주세요.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [posts] = await conn.execute(
      'SELECT id, user_id, board_type FROM posts WHERE id = ? FOR UPDATE',
      [pid],
    );
    if (!posts.length) throw fail(404, '게시글을 찾을 수 없습니다.');
    const post = posts[0];

    if (post.board_type === 'school' || post.board_type === 'student') {
      const user = await loadUser(conn, userId);
      if (!user.student_verified) {
        throw fail(403, '학생 인증이 필요한 기능입니다. 학생증으로 인증해 주세요.', {
          code: API_ERROR_CODES.STUDENT_VERIFICATION_REQUIRED,
        });
      }
    }

    let parentComment = null;
    const parentId = Number(parentCommentId);
    if (parentCommentId != null && parentCommentId !== '' && Number.isFinite(parentId)) {
      const [parents] = await conn.execute(
        'SELECT id, user_id FROM comments WHERE id = ? AND post_id = ?',
        [parentId, pid],
      );
      if (!parents.length) throw fail(404, '부모 댓글을 찾을 수 없습니다.');
      parentComment = parents[0];
    }

    const anonNo = await resolveAnonNo(conn, pid, userId);
    const anonymousIndex = anonNo == null ? 0 : anonNo;
    const [result] = await conn.execute(
      `INSERT INTO comments (post_id, user_id, parent_comment_id, content, anonymous_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pid, userId, parentComment ? parentComment.id : null, text, anonymousIndex, getNowForDB()],
    );
    const commentId = result.insertId;
    await conn.execute(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
      [pid],
    );
    const [rows] = await conn.execute(
      `SELECT id, post_id, user_id, parent_comment_id, content, anonymous_index, like_count, created_at
       FROM comments WHERE id = ?`,
      [commentId],
    );
    await conn.rollback();

    const bypassedExternalCalls = [];
    if (post.user_id && Number(post.user_id) !== userId) {
      bypassedExternalCalls.push('enqueueNotification:postAuthor');
    }
    if (
      parentComment &&
      parentComment.user_id &&
      Number(parentComment.user_id) !== userId &&
      Number(parentComment.user_id) !== Number(post.user_id)
    ) {
      bypassedExternalCalls.push('enqueueNotification:parentComment');
    }

    return {
      success: true,
      message: 'Dry-run: 댓글은 저장되지 않았습니다.',
      dryRun: true,
      bypassedExternalCalls,
      data: rows[0] || { id: commentId },
    };
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
}

const ALLOWED_TOAST_EVENTS = [
  'notification',
  'friend_poke',
  'friend_study_finished_summary',
  'new_message',
];

function toastPayloads(eventType, variant) {
  if (eventType === 'notification') {
    const type = variant === 'reply' ? 'reply' : 'comment';
    return [
      {
        event: 'notification',
        payload: {
          type,
          category: 'post',
          title: '게시글',
          body:
            type === 'reply'
              ? '내 댓글에 새로운 답글이 달렸어요'
              : '내 게시글에 새로운 댓글이 달렸어요',
          relatedType: 'post',
          relatedId: '1',
        },
      },
    ];
  }
  if (eventType === 'friend_poke') {
    return [
      {
        event: 'friend_poke',
        payload: {
          type: 'friend_poke',
          fromUserId: 1,
          fromName: '테스트',
          fromNickname: '테스트',
          createdAt: new Date().toISOString(),
        },
      },
    ];
  }
  if (eventType === 'friend_study_finished_summary') {
    const watchers = [{ userId: 1, name: '테스트', colorId: 0 }];
    return [
      {
        event: 'friend_study_finished_summary',
        payload: {
          type: 'friend_study_finished_summary',
          userId: null,
          finishedAt: new Date().toISOString(),
          watchers,
        },
      },
      {
        event: 'notification',
        payload: {
          type: 'study_finished_summary',
          category: 'system',
          title: '공부 완료!',
          body: '공부 완료! 테스트 님이 기다렸어요',
          relatedType: 'study_summary_single',
          relatedId: '1',
          watchers,
        },
      },
    ];
  }
  return [
    {
      event: 'new_message',
      payload: {
        type: 'new_message',
        roomType: 'message',
        message: {
          room_id: 1,
          room_type: 'message',
          content: '기능 테스트 쪽지입니다',
          sender_id: 1,
          sender_name: '테스트',
        },
      },
    },
  ];
}

export function dispatchSocketToast({ targetUserId, eventType, variant }) {
  const userId = Number(targetUserId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw fail(400, '대상 유저 ID가 올바르지 않습니다.');
  }
  if (!ALLOWED_TOAST_EVENTS.includes(eventType)) {
    throw fail(400, '지원하지 않는 토스트 이벤트입니다.');
  }

  const io = getIO();
  if (!io) throw fail(503, '소켓 서버가 떠 있지 않습니다.');

  const roomName = `user:${userId}`;
  const room = io.sockets.adapter?.rooms?.get(roomName);
  const socketCount = room ? room.size : 0;
  if (!socketCount) {
    throw fail(409, '대상 유저가 소켓에 연결되어 있지 않습니다.', {
      targetUserId: userId,
      roomName,
    });
  }

  const sentEvents = toastPayloads(eventType, variant).map((item) => {
    const payload = { ...item.payload };
    if (item.event === 'friend_study_finished_summary') payload.userId = userId;
    io.to(roomName).emit(item.event, payload);
    return { event: item.event, payload };
  });

  return {
    success: true,
    targetUserId: userId,
    roomName,
    socketCount,
    sentEvents,
    timestamp: new Date().toISOString(),
  };
}
