/**
 * 관리자 — 스터디 카페 현황과 방명록 정리.
 *
 * GET    /api/admin/study-cafe                         방별 인원(누구) · 방명록 현황
 * GET    /api/admin/study-cafe/boards/:roomId/:boardId 방명록 미리보기용 획 (숨긴 획 포함)
 * DELETE /api/admin/study-cafe/boards                  방명록 비우기 { roomId?, boardId? } (없으면 전체)
 */
import express from 'express';
import { body, param } from 'express-validator';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import {
  clearCafeStrokes,
  getCafeOpsOverview,
  isValidBoardId,
  listCafeStrokesForAdmin,
} from '../services/studyCafe.service.js';
import { emitCafeStrokesRemoved } from '../socket/studyCafeEvents.js';

const router = express.Router();
const viewGuard = [
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
];
const editGuard = [requireAdminApi, requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER)];
const ROOM_RE = /^[\w-]{1,32}$/;

router.get('/', ...viewGuard, async (_req, res) => {
  try {
    const data = await getCafeOpsOverview();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[admin/study-cafe] 현황 조회 오류', error);
    return res.status(500).json({ success: false, message: '스터디 카페 현황을 불러오지 못했습니다.' });
  }
});

router.get(
  '/boards/:roomId/:boardId',
  ...viewGuard,
  validate([
    param('roomId').matches(ROOM_RE),
    param('boardId').custom((v) => isValidBoardId(v)),
  ]),
  async (req, res) => {
    try {
      const strokes = await listCafeStrokesForAdmin(req.params.roomId, req.params.boardId);
      return res.json({ success: true, data: { strokes } });
    } catch (error) {
      console.error('[admin/study-cafe] 방명록 조회 오류', error);
      return res.status(500).json({ success: false, message: '방명록을 불러오지 못했습니다.' });
    }
  },
);

router.delete(
  '/boards',
  ...editGuard,
  validate([
    body('roomId').optional({ nullable: true }).matches(ROOM_RE),
    body('boardId').optional({ nullable: true }).custom((v) => isValidBoardId(v)),
  ]),
  async (req, res) => {
    const roomId = req.body?.roomId || null;
    const boardId = req.body?.boardId || null;
    if (boardId && !roomId) {
      return res.status(400).json({ success: false, message: '방을 함께 골라 주세요.' });
    }
    try {
      const { removed, groups } = await clearCafeStrokes({ roomId, boardId });
      // 지금 그 방명록을 보고 있는 사람 화면에서도 바로 지운다
      for (const g of groups) emitCafeStrokesRemoved(g.roomId, g.boardId, g.strokeIds);
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'study_cafe_board_clear',
        targetType: 'study_cafe_board',
        targetId: 0, // 방명록은 숫자 id가 없어 0 (범위는 extra에)
        note: `${roomId || '전체 방'} / ${boardId || '전체 방명록'} — ${removed}획`,
        extra: { roomId, boardId, removed },
      }).catch((err) => console.warn('[admin/study-cafe] 감사 로그 실패', err?.message || err));
      return res.json({ success: true, data: { removed } });
    } catch (error) {
      console.error('[admin/study-cafe] 방명록 비우기 오류', error);
      return res.status(500).json({ success: false, message: '방명록을 비우지 못했습니다.' });
    }
  },
);

export default router;
