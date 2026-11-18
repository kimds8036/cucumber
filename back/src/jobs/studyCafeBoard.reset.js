/**
 * 스터디 카페 방명록 주간 정리 — 모든 방의 방명록을 비운다 (기본 월요일 새벽 5시, KST).
 * 지운 획은 30일 동안 남겨 두었다가(신고 확인용) DB에서 뺀다.
 * CRON_CAFE_BOARD_RESET=off 이면 돌지 않는다 (jobs/index.js).
 */
import { acquireBatchLock, releaseBatchLock } from '../services/batchLock.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';
import { clearCafeStrokes, purgeDeletedCafeStrokes } from '../services/studyCafe.service.js';
import { emitCafeStrokesRemoved } from '../socket/studyCafeEvents.js';

const LOCK_KEY = 'batch:lock:study-cafe-board-reset';
const LOCK_TTL = 300;

export async function runStudyCafeBoardResetJob() {
  const context = createBatchExecutionContext('study-cafe-board-reset');
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }
  try {
    const { removed, groups } = await clearCafeStrokes();
    // 스케줄러가 API 서버와 같은 프로세스일 때만 실시간으로 지워진다. 아니면 방명록을 다시 열 때 비어 있다
    for (const g of groups) emitCafeStrokesRemoved(g.roomId, g.boardId, g.strokeIds);
    const purged = await purgeDeletedCafeStrokes(30);
    logBatchSuccess(context, { removed, purged });
    return { skipped: false, removed, purged };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}
