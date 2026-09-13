import express from 'express';
import { authenticate, requireStudentVerified } from '../middleware/auth.js';
import {
  checkInAttendance,
  getMyAttendances,
  getAttendanceStatus,
} from '../services/attendance.service.js';
import { evaluateAndUnlockBadges } from '../services/badge.service.js';

const router = express.Router();

router.post('/check-in', authenticate, requireStudentVerified, async (req, res) => {
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
      message: '?�교 체크가 ?�료?�었?�니??',
      data: result.data,
    });
  } catch (error) {
    console.error('?�교 체크 ?�류:', error);
    return res.status(500).json({
      success: false,
      message: '?�교 체크 �??�류가 발생?�습?�다.',
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
    console.error('?�교 ?�태 조회 ?�류:', error);
    return res.status(500).json({
      success: false,
      message: '?�교 ?�태 조회 �??�류가 발생?�습?�다.',
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
    console.error('출석 조회 ?�류:', error);
    return res.status(500).json({
      success: false,
      message: '출석 조회 �??�류가 발생?�습?�다.',
    });
  }
});

export default router;
