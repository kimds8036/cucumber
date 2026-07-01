import express from 'express';
import { requireAdminApi } from '../middleware/adminAuth.js';
import {
  getAttendanceOverview,
  getSuspiciousLowAttendance,
} from '../services/adminAttendance.service.js';

const router = express.Router();

router.get('/overview', requireAdminApi, async (req, res) => {
  try {
    const data = await getAttendanceOverview(req.query.days);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('관리자 등교 overview 오류:', error);
    return res.status(500).json({
      success: false,
      message: '등교 현황을 불러오지 못했습니다.',
    });
  }
});

router.get('/suspicious', requireAdminApi, async (req, res) => {
  try {
    const data = await getSuspiciousLowAttendance({
      days: req.query.days,
      maxRate: req.query.maxRate,
      minAccountDays: req.query.minAccountDays,
      limit: req.query.limit,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('관리자 등교 suspicious 오류:', error);
    return res.status(500).json({
      success: false,
      message: '미등교 의심 사용자 목록을 불러오지 못했습니다.',
    });
  }
});

export default router;
