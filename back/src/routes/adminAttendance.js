import express from 'express';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { getAttendanceOverview } from '../services/adminAttendance.service.js';
import { getSuspiciousFromFlags } from '../services/attendanceSuspicion.service.js';
import { getSuspiciousLowAttendance } from '../services/adminAttendance.service.js';
import { refreshAttendanceSuspicionFlags } from '../services/attendanceSuspicion.service.js';

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
    const days = req.query.days;
    const maxRate = req.query.maxRate;
    const minAccountDays = req.query.minAccountDays;
    const limit = req.query.limit;
    const refresh = req.query.refresh === '1';

    if (refresh) {
      await refreshAttendanceSuspicionFlags({ days, maxRate, minAccountDays });
    }

    let data;
    try {
      data = await getSuspiciousFromFlags({ days, maxRate, limit });
    } catch (cacheErr) {
      console.warn('[attendance] suspicious cache read failed', cacheErr?.message || cacheErr);
      data = { fromCache: false, users: [], totalSuspicious: 0 };
    }
    if (!data.fromCache || refresh) {
      const live = await getSuspiciousLowAttendance({
        days,
        maxRate,
        minAccountDays,
        limit,
      });
      data = { ...live, fromCache: false, computedAt: new Date().toISOString() };
    }
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
