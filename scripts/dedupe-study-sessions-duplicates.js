#!/usr/bin/env node
/**
 * study_sessions: 동일 (user_id, day_key, subject_id, started_at, ended_at) 중복 행 제거
 * - id가 큰 행만 삭제 (가장 작은 id 1행 유지)
 *
 * 사용: 노드가 back/node_modules 의 mysql2 를 찾을 수 있게 NODE_PATH 설정 권장
 *   cd C:\y\back
 *   $env:NODE_PATH="C:\y\back\node_modules"
 *   node ..\scripts\dedupe-study-sessions-duplicates.js
 *   node ..\scripts\dedupe-study-sessions-duplicates.js --apply
 */
/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const pathMod = require('path');
dotenv.config({ path: pathMod.join(__dirname, '../.env') });
dotenv.config({ path: pathMod.join(__dirname, '../back/.env') });
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'cucumber',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cucumber',
};

const APPLY = process.argv.includes('--apply');

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [[{ cnt }]] = await connection.execute(`
      SELECT COUNT(*) AS cnt
      FROM study_sessions t1
      INNER JOIN study_sessions t2
        ON t1.user_id = t2.user_id
        AND t1.day_key = t2.day_key
        AND t1.subject_id <=> t2.subject_id
        AND t1.started_at = t2.started_at
        AND t1.ended_at <=> t2.ended_at
        AND t1.id > t2.id
    `);

    const duplicateGroups = Number(cnt) || 0;
    console.log(
      `[dedupe-study-sessions] 중복 쌍(삭제 후보 행) 개수: ${duplicateGroups}`,
    );

    if (!APPLY) {
      console.log('적용하려면 같은 명령에 --apply 를 붙이세요.');
      return;
    }

    if (duplicateGroups === 0) {
      console.log('삭제할 행 없음.');
      return;
    }

    const [result] = await connection.execute(`
      DELETE t1 FROM study_sessions t1
      INNER JOIN study_sessions t2
        ON t1.user_id = t2.user_id
        AND t1.day_key = t2.day_key
        AND t1.subject_id <=> t2.subject_id
        AND t1.started_at = t2.started_at
        AND t1.ended_at <=> t2.ended_at
        AND t1.id > t2.id
    `);

    console.log('[dedupe-study-sessions] 삭제 완료', {
      affectedRows: result.affectedRows,
    });

    console.warn(
      'study_days 집계가 어긋날 수 있습니다. 필요한 user_id/day_key 는 타이머 화면 재저장 또는 별도 재집계를 실행하세요.',
    );
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
