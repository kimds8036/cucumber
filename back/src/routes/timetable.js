import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
// 캐시-only 전환 이후, 구버전 앱 호환을 위한 임시 인메모리 저장소
const legacyInMemoryTimetable = new Map();

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timetable = legacyInMemoryTimetable.get(userId) || {};
    return res.json({
      success: true,
      data: {
        timetable,
        source: {
          cacheOnly: true,
          scope: 'frontend-local-cache',
        },
      },
    });
  } catch (error) {
    console.error('시간표 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시간표 조회 중 오류가 발생했습니다.',
    });
  }
});

// 캐시-only 전환 이후, 구버전 앱 요청은 인메모리로만 응답
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timetable } = req.body;

    if (!timetable || typeof timetable !== 'object') {
      return res.status(400).json({
        success: false,
        message: '유효한 시간표 데이터가 필요합니다.',
      });
    }
    legacyInMemoryTimetable.set(userId, timetable);

    return res.json({
      success: true,
      message: '캐시-only 모드로 저장되었습니다.',
      data: { timetable },
    });
  } catch (error) {
    console.error('시간표 저장 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시간표 저장 중 오류가 발생했습니다.',
    });
  }
});

export default router;

