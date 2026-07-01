#!/usr/bin/env node
/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../back/.env') });

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`[FATAL] ${name} 환경변수가 필요합니다.`);
  return String(v).trim();
}

const tunnelHost = process.env.DB_TUNNEL_HOST?.trim();
const dbConfig = {
  host: tunnelHost || process.env.DB_PRIVATE_HOST?.trim() || requireEnv('DB_HOST'),
  port: Number(process.env.DB_TUNNEL_PORT || process.env.DB_PRIVATE_PORT || process.env.DB_PORT) || 3306,
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_NAME'),
  timezone: 'Z',
};

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSubject(subject) {
  const name = String(subject?.name || '').trim().slice(0, 100);
  const color = String(subject?.color || '#A6DA95').trim().slice(0, 20);
  const legacyId =
    subject?.id != null && Number.isFinite(Number(subject.id))
      ? Number(subject.id)
      : null;
  return { legacyId, name, color };
}

function normalizeTask(task) {
  const content = String(task?.content || '').trim().slice(0, 500);
  const status = task?.status === 'done' ? 'done' : 'pending';
  const legacySubjectId =
    task?.subjectId != null && Number.isFinite(Number(task.subjectId))
      ? Number(task.subjectId)
      : null;
  return { content, status, legacySubjectId };
}

async function migrateOneDay(connection, row) {
  const userId = Number(row.user_id);
  const dayKey = row.day_key;

  const [[subjectCountRow]] = await connection.execute(
    `SELECT COUNT(*) AS cnt
     FROM timer_subjects
     WHERE user_id = ? AND day_key = ?`,
    [userId, dayKey],
  );
  const hasNormalizedSubjects = Number(subjectCountRow?.cnt || 0) > 0;
  if (hasNormalizedSubjects) {
    return {
      skipped: true,
      reason: 'normalized-subjects-exist',
      insertedSubjects: 0,
      insertedTasks: 0,
    };
  }

  const subjects = parseJsonArray(row.subjects).map(normalizeSubject);
  const tasks = parseJsonArray(row.tasks).map(normalizeTask);
  const validSubjects = subjects.filter((s) => s.name.length > 0);
  const validTasks = tasks.filter((t) => t.content.length > 0);

  if (validSubjects.length === 0 && validTasks.length === 0) {
    return {
      skipped: true,
      reason: 'empty-legacy-json',
      insertedSubjects: 0,
      insertedTasks: 0,
    };
  }

  await connection.beginTransaction();
  try {
    const subjectIdMap = new Map();
    let insertedSubjects = 0;
    let insertedTasks = 0;

    for (let index = 0; index < validSubjects.length; index += 1) {
      const subject = validSubjects[index];
      const [insertResult] = await connection.execute(
        `INSERT INTO timer_subjects
           (user_id, day_key, name, color, is_deleted)
         VALUES (?, ?, ?, ?, FALSE)`,
        [userId, dayKey, subject.name, subject.color],
      );
      const newId = Number(insertResult.insertId);
      insertedSubjects += 1;
      if (subject.legacyId != null) {
        subjectIdMap.set(subject.legacyId, newId);
      }
      // legacy id가 없을 때를 대비해 배열 순서 매핑도 보조로 유지
      subjectIdMap.set(`idx:${index}`, newId);
    }

    for (const task of validTasks) {
      let mappedSubjectId = null;
      if (task.legacySubjectId != null) {
        mappedSubjectId = subjectIdMap.get(task.legacySubjectId) ?? null;
      }

      await connection.execute(
        `INSERT INTO timer_tasks
           (user_id, day_key, subject_id, content, status, is_deleted)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [userId, dayKey, mappedSubjectId, task.content, task.status],
      );
      insertedTasks += 1;
    }

    await connection.commit();
    return {
      skipped: false,
      reason: null,
      insertedSubjects,
      insertedTasks,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query("SET SESSION time_zone = '+00:00'");

    const [rows] = await connection.execute(
      `SELECT user_id, day_key, subjects, tasks
       FROM study_days
       WHERE (subjects IS NOT NULL AND JSON_LENGTH(subjects) > 0)
          OR (tasks IS NOT NULL AND JSON_LENGTH(tasks) > 0)
       ORDER BY user_id ASC, day_key ASC`,
    );

    let scanned = 0;
    let migrated = 0;
    let skipped = 0;
    let insertedSubjects = 0;
    let insertedTasks = 0;

    for (const row of rows) {
      scanned += 1;
      try {
        const result = await migrateOneDay(connection, row);
        if (result.skipped) {
          skipped += 1;
          console.log(
            `[SKIP] user=${row.user_id} day=${row.day_key} reason=${result.reason}`,
          );
          continue;
        }

        migrated += 1;
        insertedSubjects += result.insertedSubjects;
        insertedTasks += result.insertedTasks;
        console.log(
          `[OK] user=${row.user_id} day=${row.day_key} subjects=${result.insertedSubjects} tasks=${result.insertedTasks}`,
        );
      } catch (error) {
        console.error(
          `[FAIL] user=${row.user_id} day=${row.day_key} message=${error.message}`,
        );
        throw error;
      }
    }

    console.log('--- Migration Summary ---');
    console.log(`scanned: ${scanned}`);
    console.log(`migrated: ${migrated}`);
    console.log(`skipped: ${skipped}`);
    console.log(`inserted timer_subjects: ${insertedSubjects}`);
    console.log(`inserted timer_tasks: ${insertedTasks}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});

