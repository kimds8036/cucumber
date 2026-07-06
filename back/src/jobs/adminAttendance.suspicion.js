import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import { refreshAttendanceSuspicionFlags } from '../services/attendanceSuspicion.service.js';

const LOCK_KEY = 'batch:lock:attendance-suspicion';
const LOCK_TTL = 300;

export async function runAttendanceSuspicionJob() {
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) return { skipped: true };
  try {
    const result = await refreshAttendanceSuspicionFlags();
    return { skipped: false, ...result };
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}
