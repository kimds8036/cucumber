import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { closeIncompleteStudySessions } from '../socket/socketService.js';

const router = express.Router();

// 하루 요약/세션 저장
router.post('/day', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { dayKey, sessions, totalElapsedMs, subjects, tasks } = req.body;

    if (!dayKey) {
      return res.status(400).json({
        success: false,
        message: 'dayKey가 필요합니다.',
      });
    }

    await connection.beginTransaction();

    // study_days upsert
    await connection.execute(
      `INSERT INTO study_days (user_id, day_key, total_elapsed_ms, subjects, tasks)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_elapsed_ms = VALUES(total_elapsed_ms),
         subjects = VALUES(subjects),
         tasks = VALUES(tasks),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        dayKey,
        Number(totalElapsedMs) || 0,
        subjects ? JSON.stringify(subjects) : JSON.stringify([]),
        tasks ? JSON.stringify(tasks) : JSON.stringify([]),
      ]
    );

    // 기존 세션 삭제 후 재삽입
    await connection.execute(
      'DELETE FROM study_sessions WHERE user_id = ? AND day_key = ?',
      [userId, dayKey]
    );

    if (Array.isArray(sessions) && sessions.length > 0) {
      const subjectNameById = new Map(
        (subjects || []).map((sub) => [sub.id, sub.name])
      );
      const values = sessions.map((s) => [
        userId,
        dayKey,
        (s.subjectId != null && subjectNameById.get(s.subjectId)) || null,
        s.subjectId != null ? Number(s.subjectId) : null,
        Number(s.startSeconds) || 0,
        s.endSeconds != null ? Number(s.endSeconds) : null,
      ]);

      await connection.query(
        `INSERT INTO study_sessions 
           (user_id, day_key, subject_name, subject_id, start_seconds, end_seconds)
         VALUES ?`,
        [values]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: '타이머 데이터가 저장되었습니다.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('타이머 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '타이머 데이터 저장 중 오류가 발생했습니다.',
    });
  } finally {
    connection.release();
  }
});

// 미완료 세션 정리 (앱 재실행/타이머 화면 진입 시 호출 권장)
router.post('/session/close-incomplete', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    await closeIncompleteStudySessions({ userId });
    res.json({
      success: true,
      message: '미완료 세션이 있으면 종료 처리되었습니다.',
    });
  } catch (error) {
    console.error('미완료 세션 정리 오류:', error);
    res.status(500).json({
      success: false,
      message: '미완료 세션 정리 중 오류가 발생했습니다.',
    });
  }
});

// 하루 요약/세션 조회
router.get('/day', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dayKey } = req.query;

    if (!dayKey) {
      return res.status(400).json({
        success: false,
        message: 'dayKey가 필요합니다.',
      });
    }

    const [days] = await pool.execute(
      `SELECT total_elapsed_ms, subjects, tasks 
       FROM study_days 
       WHERE user_id = ? AND day_key = ?`,
      [userId, dayKey]
    );

    const [sessionsRows] = await pool.execute(
      `SELECT start_seconds, end_seconds 
       FROM study_sessions 
       WHERE user_id = ? AND day_key = ?
       ORDER BY start_seconds ASC`,
      [userId, dayKey]
    );

    const day = days[0] || null;

    res.json({
      success: true,
      data: {
        sessions: sessionsRows.map((s) => ({
          startSeconds: s.start_seconds,
          endSeconds: s.end_seconds,
        })),
        totalElapsedMs: day ? Number(day.total_elapsed_ms) : 0,
        subjects: day && day.subjects ? JSON.parse(day.subjects) : [],
        tasks: day && day.tasks ? JSON.parse(day.tasks) : [],
      },
    });
  } catch (error) {
    console.error('타이머 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '타이머 데이터 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;

