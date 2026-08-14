import express from 'express';
import { body, param } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { closeIncompleteStudySessions } from '../socket/socketService.js';
import {
  expandLegacyInvertedIntervalSessions,
  flattenSessionsForTimerIntervals,
  isoFromMysqlKstNaiveString,
  legacySecondsRangeToUtcMs,
  parseClientInstant,
  timerDayAnchorUtcMs,
  utcMsToKstMysqlDatetime3,
} from '../utils/timerSessionTimes.js';
import { upsertStudyDayTotalForUserKey } from '../utils/studyDayTotal.js';
import { evaluateAndUnlockBadges } from '../services/badge.service.js';

const router = express.Router();

// ─────────────────────────────────────────────────────
// 검증 체이너 — sanitizeDayKey 같은 후처리는 핸들러에 그대로 둔다.
// dayKey 형식은 너무 빡빡하게 잡으면 정상 클라이언트가 막힐 수 있어
// "비어있지 않은 짧은 문자열" 정도로만 1차 게이트를 깐다.
// ─────────────────────────────────────────────────────
const SUBJECT_NAME_MAX = 100;
const SUBJECT_COLOR_MAX = 20;
const TASK_CONTENT_MAX = 500;
const VALID_TASK_STATUS = ['pending', 'done'];

const dayBodyValidators = [
  body('dayKey').isString().withMessage('dayKey가 필요합니다.')
    .bail().trim().isLength({ min: 1, max: 32 })
    .withMessage('dayKey 형식이 올바르지 않습니다.'),
  body('totalElapsedMs').optional({ values: 'falsy' }).toFloat().isFloat({ min: 0 })
    .withMessage('totalElapsedMs 가 올바르지 않습니다.'),
  body('sessions').optional({ values: 'null' }).isArray().withMessage('sessions 는 배열이어야 합니다.'),
  body('subjects').optional({ values: 'null' }).isArray().withMessage('subjects 는 배열이어야 합니다.'),
  body('tasks').optional({ values: 'null' }).isArray().withMessage('tasks 는 배열이어야 합니다.'),
];

const createSubjectValidators = [
  body('dayKey').isString().bail().trim().isLength({ min: 1, max: 32 })
    .withMessage('dayKey가 필요합니다.'),
  body('name').isString().bail().trim().isLength({ min: 1, max: SUBJECT_NAME_MAX })
    .withMessage('과목 이름은 1-100자여야 합니다.'),
  body('color').optional({ values: 'falsy' }).isString().trim().isLength({ max: SUBJECT_COLOR_MAX }),
];

const createTaskValidators = [
  body('dayKey').isString().bail().trim().isLength({ min: 1, max: 32 })
    .withMessage('dayKey가 필요합니다.'),
  body('content').isString().bail().trim().isLength({ min: 1, max: TASK_CONTENT_MAX })
    .withMessage(`할 일 내용은 1-${TASK_CONTENT_MAX}자여야 합니다.`),
  body('subjectId').optional({ values: 'falsy' }).toInt().isInt({ min: 1 })
    .withMessage('subjectId 가 올바르지 않습니다.'),
  body('status').optional({ values: 'falsy' }).isIn(VALID_TASK_STATUS),
];

const updateTaskStatusValidators = [
  param('taskId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 taskId 입니다.'),
  body('status').optional({ values: 'falsy' }).isIn(VALID_TASK_STATUS),
];

const subjectIdParamValidator = [
  param('subjectId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 subjectId 입니다.'),
];

const taskIdParamValidator = [
  param('taskId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 taskId 입니다.'),
];

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

const sanitizeSession = (session, postDayKey) => {
  const id = session?.id != null ? Number(session.id) : null;
  let startedAtMs = parseClientInstant(session?.startedAt ?? session?.started_at);
  let endedAtMs = parseClientInstant(session?.endedAt ?? session?.ended_at);

  if (startedAtMs == null) {
    const startSec = clampSecond(session?.startSeconds, { allowDayEnd: false });
    const endSec =
      session?.endSeconds != null
        ? clampSecond(session.endSeconds, { allowDayEnd: true })
        : null;
    const legacy = legacySecondsRangeToUtcMs(postDayKey, startSec, endSec);
    startedAtMs = legacy.startMs;
    endedAtMs = legacy.endMs;
  }

  return {
    id: Number.isFinite(id) ? id : null,
    subjectId: session?.subjectId != null ? Number(session.subjectId) : null,
    subjectName:
      session?.subjectName != null
        ? String(session.subjectName).trim().slice(0, 100)
        : null,
    subjectColor:
      session?.subjectColor != null
        ? String(session.subjectColor).trim().slice(0, 20)
        : null,
    startedAtMs,
    endedAtMs:
      endedAtMs != null && !Number.isFinite(endedAtMs) ? null : endedAtMs,
  };
};

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
    const startKey = String(Number(session?.startedAtMs) || 0);
    const key = `${subjectKey}:${startKey}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, session);
      return;
    }
    const existingClosed = existing.endedAtMs != null;
    const incomingClosed = session.endedAtMs != null;
    if (!existingClosed && incomingClosed) {
      byKey.set(key, session);
      return;
    }
    if (existingClosed === incomingClosed) {
      const existingEnd =
        existing.endedAtMs != null ? Number(existing.endedAtMs) : -1;
      const incomingEnd =
        session.endedAtMs != null ? Number(session.endedAtMs) : -1;
      if (incomingEnd > existingEnd) {
        byKey.set(key, session);
      }
    }
  });
  return Array.from(byKey.values()).sort(
    (a, b) => Number(a.startedAtMs || 0) - Number(b.startedAtMs || 0),
  );
};

function groupAndDedupeSessionsByDay(rows) {
  const byDay = new Map();
  rows.forEach((r) => {
    if (!byDay.has(r.targetDayKey)) {
      byDay.set(r.targetDayKey, []);
    }
    byDay.get(r.targetDayKey).push(r.session);
  });
  const out = new Map();
  for (const [dk, arr] of byDay) {
    out.set(dk, dedupeSessionsPreferClosed(arr));
  }
  return out;
}

async function persistStudySessionsForDayKey(
  connection,
  userId,
  dayKey,
  sessionsList,
  subjectIdMap,
) {
  if (!sessionsList || sessionsList.length === 0) return;

  const subjectMetaMap = new Map();
  const [dbSubjects] = await connection.execute(
    `SELECT id, name, color
     FROM timer_subjects
     WHERE user_id = ? AND day_key = ? AND is_deleted = FALSE`,
    [userId, dayKey],
  );
  dbSubjects.forEach((s) => {
    subjectMetaMap.set(Number(s.id), { name: s.name, color: s.color });
  });

  for (const session of sessionsList) {
    const resolvedSubjectId = session.subjectId != null
      ? (subjectIdMap.get(session.subjectId) || session.subjectId)
      : null;
    const subjectMeta =
      resolvedSubjectId != null
        ? subjectMetaMap.get(Number(resolvedSubjectId))
        : null;
    const snapshotName = session.subjectName || subjectMeta?.name || null;
    const snapshotColor = session.subjectColor || subjectMeta?.color || null;

    const startedSql = utcMsToKstMysqlDatetime3(session.startedAtMs);
    const endedSql =
      session.endedAtMs == null
        ? null
        : utcMsToKstMysqlDatetime3(session.endedAtMs);

    if (session.id != null) {
      const [updateResult] = await connection.execute(
        `UPDATE study_sessions
         SET subject_id = ?, subject_name = ?, subject_color = ?, started_at = ?, ended_at = ?
         WHERE id = ? AND user_id = ? AND day_key = ?`,
        [
          resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
          snapshotName,
          snapshotColor,
          startedSql,
          endedSql,
          Number(session.id),
          userId,
          dayKey,
        ],
      );
      if (updateResult.affectedRows > 0) continue;
    }

    const [openRows] = await connection.execute(
      `SELECT id
       FROM study_sessions
       WHERE user_id = ? AND day_key = ? AND subject_id <=> ? AND started_at = ? AND ended_at IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [
        userId,
        dayKey,
        resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
        startedSql,
      ],
    );

    if (openRows.length > 0) {
      await connection.execute(
        `UPDATE study_sessions
         SET ended_at = COALESCE(?, ended_at),
             subject_name = COALESCE(?, subject_name),
             subject_color = COALESCE(?, subject_color),
             subject_id = COALESCE(?, subject_id)
         WHERE id = ?`,
        [
          endedSql,
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
       WHERE user_id = ? AND day_key = ? AND subject_id <=> ? AND started_at = ? AND ended_at <=> ?
       ORDER BY id DESC
       LIMIT 1`,
      [
        userId,
        dayKey,
        resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
        startedSql,
        endedSql,
      ],
    );
    if (existingRows.length > 0) {
      continue;
    }

    await connection.execute(
      `INSERT INTO study_sessions
         (user_id, day_key, subject_name, subject_color, subject_id, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        dayKey,
        snapshotName,
        snapshotColor,
        resolvedSubjectId != null ? Number(resolvedSubjectId) : null,
        startedSql,
        endedSql,
      ],
    );
  }
}

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
router.post('/day', authenticate, validate(dayBodyValidators), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { dayKey, sessions, totalElapsedMs, subjects, tasks } = req.body;
    const normalizedDayKey = sanitizeDayKey(dayKey);
    const sessionsArrRaw = Array.isArray(sessions)
      ? sessions.map((s) => sanitizeSession(s, normalizedDayKey))
      : [];
    const expandedSessions = expandLegacyInvertedIntervalSessions(
      sessionsArrRaw,
      normalizedDayKey,
    );
    const dedupedInputSessions = dedupeSessionsPreferClosed(expandedSessions);
    const splitRows = flattenSessionsForTimerIntervals(dedupedInputSessions);
    const sessionsByDay = groupAndDedupeSessionsByDay(splitRows);
    const primarySessionsForDerive =
      sessionsByDay.get(normalizedDayKey) || [];
    const subjectsArr = Array.isArray(subjects)
      ? subjects.map(sanitizeSubject).filter((s) => s.name.length > 0)
      : [];
    const tasksArr = Array.isArray(tasks)
      ? tasks.map(sanitizeTask).filter((t) => t.content.length > 0)
      : [];

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
      : deriveSubjectsFromSessions(primarySessionsForDerive);

    if (process.env.NODE_ENV !== 'production') {
      const sessionsPersistedByDay = {};
      sessionsByDay.forEach((arr, dk) => {
        sessionsPersistedByDay[dk] = arr;
      });
      console.log('[TimerTimetablePaint][POST /day]', {
        userId,
        dayKey: normalizedDayKey,
        sessionsPersistedByDay,
        legacyInvertedExpandedCount:
          expandedSessions.length - sessionsArrRaw.length,
        subjects: normalizedSubjects,
        clientTotalElapsedMs: Number(totalElapsedMs) || 0,
      });
    }

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

    const sortedPersistDays = [...sessionsByDay.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    for (const [persistDayKey, sessionsList] of sortedPersistDays) {
      await persistStudySessionsForDayKey(
        connection,
        userId,
        persistDayKey,
        sessionsList,
        subjectIdMap,
      );
    }

    const dayKeysForTotals = [
      ...new Set([normalizedDayKey, ...sessionsByDay.keys()]),
    ].sort((a, b) => a.localeCompare(b));

    for (const dk of dayKeysForTotals) {
      await upsertStudyDayTotalForUserKey(connection, userId, dk);
    }

    await connection.commit();

    evaluateAndUnlockBadges(userId).catch((e) => {
      console.warn('[timer] badge eval', e?.message || e);
    });

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
router.delete('/subjects/:subjectId', authenticate, validate(subjectIdParamValidator), async (req, res) => {
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
router.delete('/tasks/:taskId', authenticate, validate(taskIdParamValidator), async (req, res) => {
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
      `SELECT subject_id, subject_name, subject_color,
         CAST(started_at AS CHAR(30)) AS started_at_s,
         CAST(ended_at AS CHAR(30)) AS ended_at_s
       FROM study_sessions 
       WHERE user_id = ? AND day_key = ?
       ORDER BY started_at ASC`,
      [userId, dayKey],
    );

    const day = days[0] || null;
    const anchorMs = timerDayAnchorUtcMs(dayKey);
    const sessionsDataRaw = sessionsRows.map((s) => {
      const startedAt = isoFromMysqlKstNaiveString(s.started_at_s);
      const endedAt = s.ended_at_s
        ? isoFromMysqlKstNaiveString(s.ended_at_s)
        : null;
      const startedAtMs =
        typeof startedAt === 'string' ? Date.parse(startedAt) : NaN;
      const endedAtMs =
        typeof endedAt === 'string' ? Date.parse(endedAt) : null;
      const startSeconds =
        Number.isFinite(anchorMs) && Number.isFinite(startedAtMs)
          ? Math.round((startedAtMs - anchorMs) / 1000)
          : 0;
      let endSeconds =
        endedAtMs == null
          ? null
          : Number.isFinite(anchorMs) && Number.isFinite(endedAtMs)
            ? Math.round((endedAtMs - anchorMs) / 1000)
            : null;
      if (
        endSeconds != null &&
        Number.isFinite(startSeconds) &&
        endSeconds < startSeconds
      ) {
        endSeconds = 86400;
      }
      return {
        subjectId: s.subject_id != null ? Number(s.subject_id) : null,
        subjectName: s.subject_name || null,
        subjectColor: s.subject_color || null,
        startedAt,
        endedAt,
        startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : undefined,
        endedAtMs:
          endedAtMs != null && Number.isFinite(endedAtMs) ? endedAtMs : undefined,
        startSeconds,
        endSeconds,
      };
    });
    const sessionsData = dedupeSessionsPreferClosed(sessionsDataRaw);
    const normalized = await loadNormalizedDayData(pool, userId, dayKey);
    const subjectsData = normalized.subjects;
    const fallbackSubjectsFromSessions = deriveSubjectsFromSessions(sessionsData);
    const effectiveSubjectsData =
      subjectsData.length > 0 ? subjectsData : fallbackSubjectsFromSessions;

    const tasksData = normalized.tasks;

    const responseData = {
      sessions: sessionsData,
      totalElapsedMs: day ? Number(day.total_elapsed_ms) : 0,
      subjects: effectiveSubjectsData,
      tasks: tasksData,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TimerTimetablePaint][GET /day]', {
        userId,
        dayKey,
        studyDaysRowExists: Boolean(day),
        totalElapsedMs: responseData.totalElapsedMs,
        sessions: responseData.sessions,
        subjects: responseData.subjects,
      });
    }

    res.json({
      success: true,
      data: responseData,
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
router.post('/subjects', authenticate, validate(createSubjectValidators), async (req, res) => {
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
router.post('/tasks', authenticate, validate(createTaskValidators), async (req, res) => {
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
router.patch('/tasks/:taskId', authenticate, validate(updateTaskStatusValidators), async (req, res) => {
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

