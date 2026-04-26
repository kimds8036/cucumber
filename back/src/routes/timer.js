import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { closeIncompleteStudySessions } from '../socket/socketService.js';

const router = express.Router();

const sanitizeDayKey = (dayKey) =>
  typeof dayKey === 'string' ? dayKey.slice(0, 10) : null;

const clampSecond = (value, { allowDayEnd = false } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const max = allowDayEnd ? 86400 : 86399;
  if (n <= 0) return 0;
  if (n >= max) return max;
  return Math.floor(n);
};

const sanitizeSubject = (subject) => ({
  id: subject?.id != null ? Number(subject.id) : null,
  name: String(subject?.name || '').trim().slice(0, 100),
  color: String(subject?.color || '#A6DA95').trim().slice(0, 20),
});

const sanitizeTask = (task) => ({
  id: task?.id != null ? Number(task.id) : null,
  subjectId: task?.subjectId != null ? Number(task.subjectId) : null,
  content: String(task?.content || '').trim().slice(0, 500),
  status: task?.status === 'done' ? 'done' : 'pending',
});

const sanitizeSession = (session) => ({
  id: session?.id != null ? Number(session.id) : null,
  subjectId: session?.subjectId != null ? Number(session.subjectId) : null,
  subjectName:
    session?.subjectName != null
      ? String(session.subjectName).trim().slice(0, 100)
      : null,
  subjectColor:
    session?.subjectColor != null
      ? String(session.subjectColor).trim().slice(0, 20)
      : null,
  startSeconds: clampSecond(session?.startSeconds, { allowDayEnd: false }),
  endSeconds:
    session?.endSeconds != null
      ? clampSecond(session.endSeconds, { allowDayEnd: true })
      : null,
});

const deriveSubjectsFromSessions = (sessions = []) => {
  const byId = new Map();
  sessions.forEach((s) => {
    if (s?.subjectId == null) return;
    if (byId.has(s.subjectId)) return;
    byId.set(s.subjectId, {
      id: Number(s.subjectId),
      name: s?.subjectName || `과목-${s.subjectId}`,
      color: s?.subjectColor || '#A6DA95',
    });
  });
  return Array.from(byId.values());
};

const dedupeSessionsPreferClosed = (sessions = []) => {
  const byKey = new Map();
  sessions.forEach((session) => {
    const subjectKey =
      session?.subjectId == null ? 'null' : String(Number(session.subjectId));
    const startKey = String(Number(session?.startSeconds) || 0);
    const key = `${subjectKey}:${startKey}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, session);
      return;
    }
    const existingClosed = existing.endSeconds != null;
    const incomingClosed = session.endSeconds != null;
    if (!existingClosed && incomingClosed) {
      byKey.set(key, session);
      return;
    }
    if (existingClosed === incomingClosed) {
      const existingEnd = existing.endSeconds != null ? Number(existing.endSeconds) : -1;
      const incomingEnd = session.endSeconds != null ? Number(session.endSeconds) : -1;
      if (incomingEnd > existingEnd) {
        byKey.set(key, session);
      }
    }
  });
  return Array.from(byKey.values()).sort(
    (a, b) => Number(a.startSeconds || 0) - Number(b.startSeconds || 0),
  );
};

async function loadNormalizedDayData(connection, userId, dayKey) {
  const [subjectRows] = await connection.execute(
    `SELECT id, name, color
     FROM timer_subjects
     WHERE user_id = ? AND day_key = ? AND is_deleted = FALSE
     ORDER BY id ASC`,
    [userId, dayKey],
  );
  const [taskRows] = await connection.execute(
    `SELECT id, subject_id, content, status
     FROM timer_tasks
     WHERE user_id = ? AND day_key = ? AND is_deleted = FALSE
     ORDER BY id ASC`,
    [userId, dayKey],
  );
  return {
    subjects: subjectRows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      color: r.color,
    })),
    tasks: taskRows.map((r) => ({
      id: Number(r.id),
      subjectId: r.subject_id != null ? Number(r.subject_id) : null,
      content: r.content,
      status: r.status === 'done' ? 'done' : 'pending',
    })),
  };
}

// 하루 요약/세션 저장
router.post('/day', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { dayKey, sessions, totalElapsedMs, subjects, tasks } = req.body;
    const normalizedDayKey = sanitizeDayKey(dayKey);
    const sessionsArrRaw = Array.isArray(sessions) ? sessions.map(sanitizeSession) : [];
    const sessionsArr = dedupeSessionsPreferClosed(sessionsArrRaw);
    const subjectsArr = Array.isArray(subjects)
      ? subjects.map(sanitizeSubject).filter((s) => s.name.length > 0)
      : [];
    const tasksArr = Array.isArray(tasks)
      ? tasks.map(sanitizeTask).filter((t) => t.content.length > 0)
      : [];

    if (process.env.NODE_ENV !== 'production') {
      const sessionSubjectNullCount = sessionsArr.filter(
        (s) => s?.subjectId == null,
      ).length;
      console.log('[Timer][POST /day] payload summary', {
        userId,
        normalizedDayKey,
        totalElapsedMs: Number(totalElapsedMs) || 0,
        subjectsCount: subjectsArr.length,
        tasksCount: tasksArr.length,
        sessionsCount: sessionsArr.length,
        sessionsNullSubjectCount: sessionSubjectNullCount,
        subjectsSample: subjectsArr.slice(0, 2),
        tasksSample: tasksArr.slice(0, 2),
        sessionsSample: sessionsArr.slice(0, 2),
      });
    }

    if (!normalizedDayKey) {
      return res.status(400).json({
        success: false,
        message: 'dayKey가 필요합니다.',
      });
    }

    await connection.beginTransaction();

    const subjectIdMap = new Map();
    const normalizedSubjects = subjectsArr.length > 0
      ? subjectsArr
      : deriveSubjectsFromSessions(sessionsArr);

    if (normalizedSubjects.length > 0) {
      for (const subject of normalizedSubjects) {
        if (!subject?.name) continue;
        let resolvedId = null;
        if (subject.id != null) {
          const [updateResult] = await connection.execute(
            `UPDATE timer_subjects
             SET name = ?, color = ?, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND day_key = ?`,
            [subject.name, subject.color, Number(subject.id), userId, normalizedDayKey],
          );
          if (updateResult.affectedRows > 0) {
            resolvedId = Number(subject.id);
          } else {
            const [insertResult] = await connection.execute(
              `INSERT INTO timer_subjects (user_id, day_key, name, color, is_deleted)
               VALUES (?, ?, ?, ?, FALSE)`,
              [userId, normalizedDayKey, subject.name, subject.color],
            );
            resolvedId = Number(insertResult.insertId);
          }
        } else {
          const [insertResult] = await connection.execute(
            `INSERT INTO timer_subjects (user_id, day_key, name, color, is_deleted)
             VALUES (?, ?, ?, ?, FALSE)`,
            [userId, normalizedDayKey, subject.name, subject.color],
          );
          resolvedId = Number(insertResult.insertId);
        }
        if (subject.id != null) {
          subjectIdMap.set(Number(subject.id), resolvedId);
        }
      }
    }

    if (tasksArr.length > 0) {
      for (const task of tasksArr) {
        const resolvedSubjectId = task.subjectId != null
          ? (subjectIdMap.get(task.subjectId) || task.subjectId)
          : null;
        let verifiedSubjectId = null;
        if (resolvedSubjectId != null) {
          const [[subjectRow]] = await connection.execute(
            `SELECT id
             FROM timer_subjects
             WHERE id = ? AND user_id = ? AND day_key = ? AND is_deleted = FALSE`,
            [resolvedSubjectId, userId, normalizedDayKey],
          );
          verifiedSubjectId = subjectRow ? Number(subjectRow.id) : null;
        }

        if (task.id != null) {
          const [updateResult] = await connection.execute(
            `UPDATE timer_tasks
             SET subject_id = ?, content = ?, status = ?, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND day_key = ?`,
            [verifiedSubjectId, task.content, task.status, Number(task.id), userId, normalizedDayKey],
          );
          if (updateResult.affectedRows === 0) {
            await connection.execute(
              `INSERT INTO timer_tasks (user_id, day_key, subject_id, content, status, is_deleted)
               VALUES (?, ?, ?, ?, ?, FALSE)`,
              [userId, normalizedDayKey, verifiedSubjectId, task.content, task.status],
            );
          }
        } else {
          await connection.execute(
            `INSERT INTO timer_tasks (user_id, day_key, subject_id, content, status, is_deleted)
             VALUES (?, ?, ?, ?, ?, FALSE)`,
            [userId, normalizedDayKey, verifiedSubjectId, task.content, task.status],
          );
        }
      }
    }

    if (sessionsArr.length > 0) {
      const subjectMetaMap = new Map();
      const [dbSubjects] = await connection.execute(
        `SELECT id, name, color
         FROM timer_subjects
         WHERE user_id = ? AND day_key = ? AND is_deleted = FALSE`,
        [userId, normalizedDayKey],
      );
      dbSubjects.forEach((s) => {
        subjectMetaMap.set(Number(s.id), { name: s.name, color: s.color });
      });

      for (const session of sessionsArr) {
        const resolvedSubjectId = session.subjectId != null
          ? (subjectIdMap.get(session.subjectId) || session.subjectId)
          : null;
        const subjectMeta = resolvedSubjectId != null ? subjectMetaMap.get(Number(resolvedSubjectId)) : null;
        const snapshotName = session.subjectName || subjectMeta?.name || null;
        const snapshotColor = session.subjectColor || subjectMeta?.color || null;

        if (session.id != null) {
          const [updateResult] = await connection.execute(
            `UPDATE study_sessions
             SET subject_id = ?, subject_name = ?, subject_color = ?, start_seconds = ?, end_seconds = ?
             WHERE id = ? AND user_id = ? AND day_key = ?`,
            [
              resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
              snapshotName,
              snapshotColor,
              session.startSeconds,
              session.endSeconds,
              Number(session.id),
              userId,
              normalizedDayKey,
            ],
          );
          if (updateResult.affectedRows > 0) continue;
        }

        const [openRows] = await connection.execute(
          `SELECT id
           FROM study_sessions
           WHERE user_id = ? AND day_key = ? AND subject_id <=> ? AND start_seconds = ? AND end_seconds IS NULL
           ORDER BY id DESC
           LIMIT 1`,
          [
            userId,
            normalizedDayKey,
            resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
            session.startSeconds,
          ],
        );

        if (openRows.length > 0) {
          await connection.execute(
            `UPDATE study_sessions
             SET end_seconds = COALESCE(?, end_seconds),
                 subject_name = COALESCE(?, subject_name),
                 subject_color = COALESCE(?, subject_color),
                 subject_id = COALESCE(?, subject_id)
             WHERE id = ?`,
            [
              session.endSeconds,
              snapshotName,
              snapshotColor,
              resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
              Number(openRows[0].id),
            ],
          );
          continue;
        }

        const [existingRows] = await connection.execute(
          `SELECT id
           FROM study_sessions
           WHERE user_id = ? AND day_key = ? AND subject_id <=> ? AND start_seconds = ? AND end_seconds <=> ?
           ORDER BY id DESC
           LIMIT 1`,
          [
            userId,
            normalizedDayKey,
            resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
            session.startSeconds,
            session.endSeconds,
          ],
        );
        if (existingRows.length > 0) {
          // 동일 세션이 이미 존재하면 추가 UPDATE를 생략해 데드락 가능성을 낮춘다.
          // (스냅샷은 open 세션 close 단계에서 이미 보강된다.)
          continue;
        }

        await connection.execute(
          `INSERT INTO study_sessions
             (user_id, day_key, subject_name, subject_color, subject_id, start_seconds, end_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            normalizedDayKey,
            snapshotName,
            snapshotColor,
            resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
            session.startSeconds,
            session.endSeconds,
          ],
        );
      }
    }

    const [sessionAggRows] = await connection.execute(
      `SELECT COALESCE(SUM(
        CASE
          WHEN end_seconds IS NULL THEN 0
          WHEN end_seconds < start_seconds THEN 0
          ELSE (LEAST(end_seconds, 86400) - start_seconds) * 1000
        END
      ), 0) AS total_ms
       FROM study_sessions
       WHERE user_id = ? AND day_key = ?`,
      [userId, normalizedDayKey],
    );
    const computedElapsedMs = Number(sessionAggRows?.[0]?.total_ms || 0);
    // 클라이언트 payload(totalElapsedMs)는 오염될 수 있으므로 세션 합계를 단일 진실원으로 사용
    const safeElapsedMs = computedElapsedMs;

    await connection.execute(
      `INSERT INTO study_days (user_id, day_key, total_elapsed_ms)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_elapsed_ms = VALUES(total_elapsed_ms),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        normalizedDayKey,
        safeElapsedMs,
      ],
    );

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

// 정규화 과목 삭제 (메타데이터 정리)
// - timer_tasks: 함께 소프트 삭제
// - study_sessions: 레코드는 보존, subject_id만 NULL로 분리
router.delete('/subjects/:subjectId', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const subjectId = Number(req.params.subjectId);
    if (!Number.isFinite(subjectId) || subjectId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 subjectId가 필요합니다.',
      });
    }

    await connection.beginTransaction();
    const [[subjectRow]] = await connection.execute(
      `SELECT id, day_key
       FROM timer_subjects
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [subjectId, userId],
    );
    if (!subjectRow) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '삭제할 과목을 찾지 못했습니다.',
      });
    }

    await connection.execute(
      `UPDATE timer_tasks
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND day_key = ? AND subject_id = ?`,
      [userId, subjectRow.day_key, subjectId],
    );
    await connection.execute(
      `UPDATE study_sessions
       SET subject_id = NULL
       WHERE user_id = ? AND day_key = ? AND subject_id = ?`,
      [userId, subjectRow.day_key, subjectId],
    );
    await connection.execute(
      `UPDATE timer_subjects
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [subjectId, userId],
    );

    await connection.commit();
    return res.json({
      success: true,
      data: { id: subjectId },
    });
  } catch (error) {
    await connection.rollback();
    console.error('타이머 과목 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '타이머 과목 삭제 중 문제가 발생했어요',
    });
  } finally {
    connection.release();
  }
});

// 정규화 할일 삭제 (소프트 삭제)
router.delete('/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = Number(req.params.taskId);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 taskId가 필요합니다.',
      });
    }
    const [result] = await pool.execute(
      `UPDATE timer_tasks
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [taskId, userId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 할일을 찾지 못했습니다.',
      });
    }
    return res.json({
      success: true,
      data: { id: taskId },
    });
  } catch (error) {
    console.error('타이머 할일 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '타이머 할일 삭제 중 오류가 발생했습니다.',
    });
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
    const dayKey = sanitizeDayKey(req.query?.dayKey);

    if (!dayKey) {
      return res.status(400).json({
        success: false,
        message: 'dayKey가 필요합니다.',
      });
    }

    const [days] = await pool.execute(
      `SELECT total_elapsed_ms
       FROM study_days 
       WHERE user_id = ? AND day_key = ?`,
      [userId, dayKey]
    );

    const [sessionsRows] = await pool.execute(
      `SELECT subject_id, subject_name, subject_color, start_seconds, end_seconds 
       FROM study_sessions 
       WHERE user_id = ? AND day_key = ?
       ORDER BY start_seconds ASC`,
      [userId, dayKey]
    );

    const day = days[0] || null;
    const sessionsDataRaw = sessionsRows.map((s) => ({
      subjectId: s.subject_id != null ? Number(s.subject_id) : null,
      subjectName: s.subject_name || null,
      subjectColor: s.subject_color || null,
      startSeconds: s.start_seconds,
      endSeconds: s.end_seconds,
    }));
    const sessionsData = dedupeSessionsPreferClosed(sessionsDataRaw);
    const normalized = await loadNormalizedDayData(pool, userId, dayKey);
    const subjectsData = normalized.subjects;
    const fallbackSubjectsFromSessions = deriveSubjectsFromSessions(sessionsData);
    const effectiveSubjectsData =
      subjectsData.length > 0 ? subjectsData : fallbackSubjectsFromSessions;

    const tasksData = normalized.tasks;

    if (process.env.NODE_ENV !== 'production') {
      const nullSubjectCount = sessionsData.filter(
        (s) => s.subjectId == null,
      ).length;
      console.log('[Timer][GET /day] payload summary', {
        userId,
        dayKey,
        subjectsCount: effectiveSubjectsData.length,
        tasksCount: tasksData.length,
        sessionsCount: sessionsData.length,
        sessionsNullSubjectCount: nullSubjectCount,
        subjectsSample: effectiveSubjectsData.slice(0, 2),
        tasksSample: tasksData.slice(0, 2),
        sessionsSample: sessionsData.slice(0, 2),
      });
    }

    res.json({
      success: true,
      data: {
        sessions: sessionsData,
        totalElapsedMs: day ? Number(day.total_elapsed_ms) : 0,
        subjects: effectiveSubjectsData,
        tasks: tasksData,
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

// 정규화 과목 생성 (서버 발급 ID)
router.post('/subjects', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const dayKey = sanitizeDayKey(req.body?.dayKey);
    const name = String(req.body?.name || '').trim().slice(0, 100);
    const color = String(req.body?.color || '#A6DA95').trim().slice(0, 20);
    if (!dayKey || !name) {
      return res.status(400).json({
        success: false,
        message: 'dayKey, name이 필요합니다.',
      });
    }
    const [result] = await pool.execute(
      `INSERT INTO timer_subjects (user_id, day_key, name, color)
       VALUES (?, ?, ?, ?)`,
      [userId, dayKey, name, color],
    );
    return res.status(201).json({
      success: true,
      data: {
        id: Number(result.insertId),
        name,
        color,
      },
    });
  } catch (error) {
    console.error('타이머 과목 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '타이머 과목 생성 중 오류가 발생했습니다.',
    });
  }
});

// 정규화 할일 생성 (서버 발급 ID)
router.post('/tasks', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const dayKey = sanitizeDayKey(req.body?.dayKey);
    const subjectId = req.body?.subjectId != null ? Number(req.body.subjectId) : null;
    const content = String(req.body?.content || '').trim().slice(0, 500);
    const status = req.body?.status === 'done' ? 'done' : 'pending';
    if (!dayKey || !content) {
      return res.status(400).json({
        success: false,
        message: 'dayKey, content가 필요합니다.',
      });
    }
    const [result] = await pool.execute(
      `INSERT INTO timer_tasks (user_id, day_key, subject_id, content, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, dayKey, subjectId, content, status],
    );
    return res.status(201).json({
      success: true,
      data: {
        id: Number(result.insertId),
        subjectId,
        content,
        status,
      },
    });
  } catch (error) {
    console.error('타이머 할일 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '타이머 할일 생성 중 오류가 발생했습니다.',
    });
  }
});

// 정규화 할일 상태 수정
router.patch('/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const status = req.body?.status === 'done' ? 'done' : 'pending';
    if (!Number.isFinite(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 taskId가 필요합니다.',
      });
    }
    const [result] = await pool.execute(
      `UPDATE timer_tasks
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [status, taskId, userId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '수정할 할일을 찾지 못했습니다.',
      });
    }
    return res.json({
      success: true,
      data: { id: taskId, status },
    });
  } catch (error) {
    console.error('타이머 할일 상태 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '타이머 할일 상태 수정 중 오류가 발생했습니다.',
    });
  }
});

export default router;

