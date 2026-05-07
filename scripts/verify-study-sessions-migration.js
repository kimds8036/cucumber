#!/usr/bin/env node
/**
 * 032 마이그레이션 후: started_at 이 타이머일 day_key(06:00 경계)와 맞는지 샘플 검사
 * - 0~6시 새벽 타임스탬프는 "표시 day_key"와 캘린더 날짜가 다를 수 있음 → getTimerDayKey 기대값과 비교
 *
 *   cd C:\cucumber\back
 *   $env:NODE_PATH="C:\cucumber\back\node_modules"
 *   node ..\scripts\verify-study-sessions-migration.js
 *   node ..\scripts\verify-study-sessions-migration.js --limit=200
 */
/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const pathMod = require('path');
dotenv.config({ path: pathMod.join(__dirname, '../.env') });
dotenv.config({ path: pathMod.join(__dirname, '../back/.env') });
dotenv.config();

const TIMER_TIMEZONE = 'Asia/Seoul';

function getKstDateParts(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

function formatUtcDateAsYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 백엔드 timerDayKey.js 와 동일 계약 */
function expectedTimerDayKeyFromInstant(date) {
  const kst = getKstDateParts(date);
  const baseUtc = new Date(Date.UTC(kst.year, kst.month - 1, kst.day));
  if (kst.hour < 6) {
    baseUtc.setUTCDate(baseUtc.getUTCDate() - 1);
  }
  return formatUtcDateAsYmd(baseUtc);
}

function parseArgs() {
  const lim = process.argv.find((a) => a.startsWith('--limit='));
  const n = lim ? Number(lim.slice('--limit='.length)) : 100;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 100;
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'cucumber',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cucumber',
};

async function main() {
  const limit = parseArgs();
  const connection = await mysql.createConnection({
    ...dbConfig,
    timezone: 'Z',
  });

  try {
    await connection.execute(`SET SESSION time_zone = '+09:00'`);

    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'study_sessions'
         AND COLUMN_NAME IN ('started_at')`,
    );
    if (!cols.length) {
      console.error(
        '[verify] study_sessions.started_at 컬럼이 없습니다. 032 마이그레이션을 적용했는지 확인하세요.',
      );
      process.exit(2);
    }

    const safeLimit = Math.max(1, Math.min(5000, Math.floor(Number(limit) || 100)));
    const [rows] = await connection.execute(
      `SELECT id, user_id, DATE_FORMAT(day_key, '%Y-%m-%d') AS dk,
              CAST(started_at AS CHAR(30)) AS st,
              CAST(ended_at AS CHAR(30)) AS en
       FROM study_sessions
       ORDER BY id DESC
       LIMIT ${safeLimit}`,
    );

    let mismatch = 0;
    const samples = [];

    for (const r of rows) {
      const iso = r.st
        ? `${String(r.st).trim().replace(' ', 'T')}+09:00`
        : null;
      if (!iso) continue;
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms)) continue;
      const expected = expectedTimerDayKeyFromInstant(new Date(ms));
      const dbKey = String(r.dk || '').slice(0, 10);
      if (expected !== dbKey) {
        mismatch += 1;
        if (samples.length < 15) {
          samples.push({
            id: r.id,
            user_id: r.user_id,
            day_key_row: dbKey,
            started_at: r.st,
            expected_timer_day: expected,
          });
        }
      }
    }

    console.log(
      `[verify] 샘플 ${rows.length}건 중 started_at 기준 day_key 불일치: ${mismatch}건`,
    );
    if (samples.length) {
      console.log('[verify] 불일치 예시(최대 15건):');
      console.dir(samples, { depth: null });
      console.log(
        '※ 분할된 두 번째 조각(예: 익일 06:00 시작)은 행의 day_key 가 그 조각의 타이머일과 일치해야 합니다.',
      );
    } else {
      console.log('[verify] 불일치 없음 (샘플 범위 내).');
    }

    const [night] = await connection.execute(
      `SELECT COUNT(*) AS c
       FROM study_sessions
       WHERE HOUR(started_at) >= 0 AND HOUR(started_at) < 6`,
    );
    console.log(
      `[verify] started_at 시각이 KST 표기 00~05시 행 개수(DB 전체): ${Number(night[0]?.c) || 0}`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
