import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  checkInAttendance,
  getMyAttendances,
  getAttendanceStatus,
} from '../services/attendance.service.js';
import { evaluateAndUnlockBadges } from '../services/badge.service.js';

const router = express.Router();

router.post('/check-in', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body || {};
    const result = await checkInAttendance({
      userId: req.user.userId,
      latitude,
      longitude,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        code: result.code || undefined,
      });
    }

    evaluateAndUnlockBadges(req.user.userId).catch((e) => {
      console.warn('[attendance] badge eval', e?.message || e);
    });

    return res.json({
      success: true,
      message: '등교 체크가 완료되었습니다.',
      data: result.data,
    });
  } catch (error) {
    console.error('등교 체크 오류:', error);
    return res.status(500).json({
      success: false,
      message: '등교 체크 중 오류가 발생했습니다.',
    });
  }
});

router.get('/status', authenticate, async (req, res) => {
  try {
    const result = await getAttendanceStatus(req.user.userId);
    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
      });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('등교 상태 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '등교 상태 조회 중 오류가 발생했습니다.',
    });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await getMyAttendances(req.user.userId, req.query.month);
    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
      });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('출석 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출석 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
