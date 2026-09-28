/**
 * develop 시드 계정으로 타이머/스터디룸 입장 (가상 사용자 테스트).
 *
 *   node scripts/study-room-dev-bots.mjs
 *   node scripts/study-room-dev-bots.mjs --stop
 *
 * 앱에서 본인 타이머를 켠 뒤 이 스크립트를 실행하면 같은 방에 합류한다.
 */
import { io } from 'socket.io-client';
import { DEV_TEST_ACCOUNTS } from '../src/db/seed-dev-test-user.js';
import { getTimerDayKey } from '../src/utils/timerDayKey.js';

const BASE = (
  process.env.STUDY_ROOM_BOT_API ||
  'https://cucumber-develop.up.railway.app'
).replace(/\/+$/, '');
const STOP = process.argv.includes('--stop');

function dayKey() {
  return getTimerDayKey(new Date());
}

async function login(account) {
  const deviceId = `study-room-bot-${account.username}`;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: account.username,
      password: account.password,
      deviceId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  const token = json?.data?.token;
  const userId = json?.data?.user?.id;
  if (!res.ok || !token) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new Error(`${account.username} 로그인 실패: ${msg}`);
  }
  return { token, userId, username: account.username };
}

async function persistOpenSession(token, startedAtMs) {
  const res = await fetch(`${BASE}/api/timer/day`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dayKey: dayKey(),
      sessions: [
        {
          startedAt: new Date(startedAtMs).toISOString(),
          endedAt: null,
          subjectId: null,
        },
      ],
      totalElapsedMs: 0,
      subjects: [],
      tasks: [],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`timer/day 실패: ${json?.message || res.status}`);
  }
}

async function persistIdle(token) {
  const res = await fetch(`${BASE}/api/timer/day`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dayKey: dayKey(),
      sessions: [],
      totalElapsedMs: 0,
      subjects: [],
      tasks: [],
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(`timer/day idle 실패: ${json?.message || res.status}`);
  }
}

function emitStatus(token, status) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      auth: { token },
      transports: ['websocket'],
      timeout: 12000,
    });
    const done = (err) => {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        // noop
      }
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => done(new Error('소켓 타임아웃')), 15000);
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      done(err);
    });
    socket.on('connect', () => {
      socket.emit('friend_timer_status', { status, dayKey: dayKey() });
      setTimeout(() => {
        clearTimeout(timer);
        done();
      }, 800);
    });
  });
}

async function runOne(account) {
  const auth = await login(account);
  if (STOP) {
    await persistIdle(auth.token);
    await emitStatus(auth.token, 'idle');
    console.log(`stopped uid=${auth.userId} @${auth.username}`);
    return;
  }
  const startedAtMs = Date.now() - 3 * 60 * 1000;
  await persistOpenSession(auth.token, startedAtMs);
  await emitStatus(auth.token, 'studying');
  console.log(`studying uid=${auth.userId} @${auth.username}`);
}

async function main() {
  console.log(`${STOP ? 'STOP' : 'START'} bots → ${BASE}`);
  for (const account of DEV_TEST_ACCOUNTS) {
    await runOne(account);
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
