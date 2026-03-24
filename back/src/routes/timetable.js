import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const DAYS = ['월', '화', '수', '목', '금'];

function cellsToColumns(cells = {}) {
  const cols = {};
  DAYS.forEach((day, dayIdx) => {
    const prefix = ['mon', 'tue', 'wed', 'thu', 'fri'][dayIdx];
    // DB 스키마는 1~7교시까지만 존재
    for (let period = 1; period <= 7; period += 1) {
      const key = `${day}-${period}`;
      const col = `${prefix}_${period}`;
      cols[col] = cells[key] || null;
    }
  });
  return cols;
}

function rowToCells(row) {
  if (!row) return {};
  const cells = {};
  DAYS.forEach((day, dayIdx) => {
    const prefix = ['mon', 'tue', 'wed', 'thu', 'fri'][dayIdx];
    // DB 스키마는 1~7교시까지만 존재
    for (let period = 1; period <= 7; period += 1) {
      const col = `${prefix}_${period}`;
      const key = `${day}-${period}`;
      if (Object.prototype.hasOwnProperty.call(row, col) && row[col]) {
        cells[key] = row[col];
      }
    }
  });
  return cells;
}

// 시간표 조회
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.execute(
      `SELECT 
         id,
         user_id,
         school_id,
         grade,
         class_number,
         mon_1, mon_2, mon_3, mon_4, mon_5, mon_6, mon_7,
         tue_1, tue_2, tue_3, tue_4, tue_5, tue_6, tue_7,
         wed_1, wed_2, wed_3, wed_4, wed_5, wed_6, wed_7,
         thu_1, thu_2, thu_3, thu_4, thu_5, thu_6, thu_7,
         fri_1, fri_2, fri_3, fri_4, fri_5, fri_6, fri_7
       FROM timetables
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          timetable: {},
        },
      });
    }

    const row = rows[0];
    const timetable = rowToCells(row);

    res.json({
      success: true,
      data: {
        timetable,
      },
    });
  } catch (error) {
    console.error('시간표 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시간표 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시간표 저장/업데이트
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

    const [users] = await pool.execute(
      'SELECT school_id, grade, class_number FROM users WHERE id = ?',
      [userId],
    );
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    const user = users[0];

    const cols = cellsToColumns(timetable);

    const [existing] = await pool.execute(
      'SELECT id FROM timetables WHERE user_id = ?',
      [userId],
    );

    if (existing.length === 0) {
      const columns = Object.keys(cols);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((c) => cols[c]);

      await pool.execute(
        `INSERT INTO timetables
           (user_id, school_id, grade, class_number, ${columns.join(', ')})
         VALUES (?, ?, ?, ?, ${placeholders})`,
        [userId, user.school_id, user.grade, user.class_number, ...values],
      );
    } else {
      const columns = Object.keys(cols);
      const sets = columns.map((c) => `${c} = ?`).join(', ');
      const values = columns.map((c) => cols[c]);

      await pool.execute(
        `UPDATE timetables
         SET ${sets}
         WHERE user_id = ?`,
        [...values, userId],
      );
    }

    res.json({
      success: true,
      message: '시간표가 저장되었습니다.',
    });
  } catch (error) {
    console.error('시간표 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '시간표 저장 중 오류가 발생했습니다.',
    });
  }
});

export default router;

