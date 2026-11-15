/**
 * 스터디 카페(snowmap 3D) REST API — 방 목록, 방명록 그림 획.
 * 실시간 위치·채팅은 소켓(socket/studyCafeEvents.js)이 맡는다.
 *
 * GET    /api/study-cafe/rooms
 * GET    /api/study-cafe/rooms/:roomId/boards/:boardId/strokes
 * POST   /api/study-cafe/rooms/:roomId/boards/:boardId/strokes        { color, width, points }
 * DELETE /api/study-cafe/rooms/:roomId/boards/:boardId/strokes/mine
 * DELETE /api/study-cafe/rooms/:roomId/boards/:boardId/strokes/:strokeId
 * POST   /api/study-cafe/strokes/:strokeId/report                     { reason, description? }
 *
 * 방명록은 그 방에 들어와 있는 사람만 보고 쓸 수 있다(소켓 cafe:join 이후).
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { blockWhenFlag } from '../middleware/systemFlags.js';
import { submitContentReport } from '../services/reportSubmission.service.js';
import {
  CAFE_STROKE_AUTO_HIDE_REPORTS,
  countPendingStrokeReports,
  deleteAllOwnCafeStrokes,
  deleteOwnCafeStroke,
  getCafeRoom,
  getCafeStrokeMeta,
  insertCafeStroke,
  isInCafeRoom,
  isValidBoardId,
  listCafeRooms,
  listCafeStrokes,
  loadCafeBlockSet,
  publicStroke,
  sanitizeStrokeInput,
  setCafeStrokeHidden,
  takeStrokeQuota,
} from '../services/studyCafe.service.js';
import {
  emitCafeStrokeAdded,
  emitCafeStrokesRemoved,
} from '../socket/studyCafeEvents.js';

const router = express.Router();

function fail(res, status, message, code = null) {
  return res.status(status).json({ success: false, message, ...(code ? { code } : {}) });
}

/** :roomId, :boardId 확인 + 그 방에 들어와 있는지 */
function requireBoardAccess(req, res, next) {
  const { roomId, boardId } = req.params;
  if (!getCafeRoom(roomId)) return fail(res, 404, '방을 찾을 수 없어요.');
  if (!isValidBoardId(boardId)) return fail(res, 400, '방명록을 찾을 수 없어요.');
  if (!isInCafeRoom(req.user.userId, roomId)) {
    return fail(res, 403, '이 방에 들어와 있을 때만 방명록을 쓸 수 있어요.', 'NOT_IN_ROOM');
  }
  return next();
}

router.get('/rooms', authenticate, (req, res) => {
  res.json({ success: true, data: { rooms: listCafeRooms(req.user.userId) } });
});

router.get('/rooms/:roomId/boards/:boardId/strokes', authenticate, requireBoardAccess, async (req, res) => {
  try {
    const userId = String(req.user.userId);
    const blocked = await loadCafeBlockSet(userId);
    const strokes = await listCafeStrokes(req.params.roomId, req.params.boardId, {
      userId,
      blocked,
    });
    res.json({ success: true, data: { strokes } });
  } catch (err) {
    console.error('[StudyCafe] 방명록 조회 오류:', err);
    fail(res, 500, '방명록을 불러오지 못했어요.');
  }
});

router.post('/rooms/:roomId/boards/:boardId/strokes', authenticate, requireBoardAccess, async (req, res) => {
  try {
    const input = sanitizeStrokeInput(req.body);
    if (input.error) return fail(res, 400, input.error);
    if (!takeStrokeQuota(req.user.userId)) {
      return fail(res, 429, '너무 빨리 그리고 있어요. 잠시 뒤에 다시 그려 주세요.', 'RATE_LIMITED');
    }
    const stroke = await insertCafeStroke({
      roomId: req.params.roomId,
      boardId: req.params.boardId,
      userId: req.user.userId,
      ...input,
    });
    if (!stroke) return fail(res, 500, '저장하지 못했어요.');
    emitCafeStrokeAdded(req.params.roomId, stroke);
    res.status(201).json({ success: true, data: { stroke: publicStroke(stroke) } });
  } catch (err) {
    console.error('[StudyCafe] 방명록 저장 오류:', err);
    fail(res, 500, '저장하지 못했어요.');
  }
});

// '/mine'이 ':strokeId'보다 먼저 와야 한다
router.delete('/rooms/:roomId/boards/:boardId/strokes/mine', authenticate, requireBoardAccess, async (req, res) => {
  try {
    const ids = await deleteAllOwnCafeStrokes({
      roomId: req.params.roomId,
      boardId: req.params.boardId,
      userId: req.user.userId,
    });
    emitCafeStrokesRemoved(req.params.roomId, req.params.boardId, ids);
    res.json({ success: true, data: { strokeIds: ids } });
  } catch (err) {
    console.error('[StudyCafe] 내 획 전체 지우기 오류:', err);
    fail(res, 500, '지우지 못했어요.');
  }
});

router.delete('/rooms/:roomId/boards/:boardId/strokes/:strokeId', authenticate, requireBoardAccess, async (req, res) => {
  try {
    const strokeId = Number(req.params.strokeId);
    if (!Number.isInteger(strokeId) || strokeId <= 0) return fail(res, 400, '획을 찾을 수 없어요.');
    const ok = await deleteOwnCafeStroke({
      roomId: req.params.roomId,
      boardId: req.params.boardId,
      strokeId,
      userId: req.user.userId,
    });
    if (!ok) return fail(res, 404, '내가 그린 획만 지울 수 있어요.');
    emitCafeStrokesRemoved(req.params.roomId, req.params.boardId, [strokeId]);
    res.json({ success: true, data: { strokeIds: [String(strokeId)] } });
  } catch (err) {
    console.error('[StudyCafe] 획 지우기 오류:', err);
    fail(res, 500, '지우지 못했어요.');
  }
});

router.post(
  '/strokes/:strokeId/report',
  authenticate,
  blockWhenFlag('report_submission_disabled'),
  async (req, res) => {
    try {
      const strokeId = Number(req.params.strokeId);
      if (!Number.isInteger(strokeId) || strokeId <= 0) return fail(res, 400, '획을 찾을 수 없어요.');
      const meta = await getCafeStrokeMeta(strokeId);
      const reason = String(req.body?.reason || '부적절한 그림').slice(0, 100);
      const description = [
        `[스터디 카페 방명록] ${meta?.room_id || '-'} / ${meta?.board_id || '-'}`,
        req.body?.description ? String(req.body.description).slice(0, 500) : null,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await submitContentReport({
        reporterId: req.user.userId,
        targetType: 'cafe_stroke',
        targetId: strokeId,
        reason,
        description,
        options: {
          forbidSelfReport: true,
          targetExistsCheck: {
            notFoundMessage: '획을 찾을 수 없어요.',
            check: async () => Boolean(meta && !meta.is_deleted),
          },
        },
      });

      // 신고가 쌓이면 관리자 확인 전이라도 숨긴다 (게시글 자동 숨김과 같은 기준)
      if (result.httpStatus < 300 && meta && !meta.is_hidden) {
        const pending = await countPendingStrokeReports(strokeId);
        if (pending >= CAFE_STROKE_AUTO_HIDE_REPORTS) {
          await setCafeStrokeHidden(strokeId, true);
          emitCafeStrokesRemoved(meta.room_id, meta.board_id, [strokeId]);
        }
      }
      return res.status(result.httpStatus).json(result.body);
    } catch (err) {
      console.error('[StudyCafe] 획 신고 오류:', err);
      return fail(res, 500, '신고 처리 중 오류가 발생했어요.');
    }
  },
);

export default router;
