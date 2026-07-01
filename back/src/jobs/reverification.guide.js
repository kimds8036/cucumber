import pool from '../config/database.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import {
  getKstNow,
  getReverificationDeadlineForYear,
  isLegalAdult,
  shouldGraduateBlock,
} from '../services/reverification.service.js';
import { getAcademicYearStart } from '../utils/signupEnrollment.js';
import { hydrateUserPiiRow } from '../services/userPii.service.js';

const LOCK_KEY = 'batch:lock:reverification-guide';

async function runReverificationGuide() {
  const kst = getKstNow();
  const month = kst.getMonth();
  const day = kst.getDate();
  const academicYear = getAcademicYearStart(kst);
  const deadline = getReverificationDeadlineForYear(academicYear);

  const [users] = await pool.execute(
    `SELECT id, birth_date, birth_date_enc, graduation_year, grade, reverification_status
     FROM users
     WHERE is_deleted = FALSE`,
  );

  for (const raw of users) {
    const user = hydrateUserPiiRow({ ...raw }, ['birth_date']);
    const userId = user.id;

    if (isLegalAdult(user.birth_date, kst)) {
      if (user.reverification_status !== 'adult_blocked') {
        await pool.execute(
          `UPDATE users SET reverification_status = 'adult_blocked', reverification_deadline = NULL WHERE id = ?`,
          [userId],
        );
      }
      continue;
    }

    if (shouldGraduateBlock(user)) {
      if (user.reverification_status !== 'graduated_blocked') {
        await pool.execute(
          `UPDATE users SET reverification_status = 'graduated_blocked', reverification_deadline = NULL WHERE id = ?`,
          [userId],
        );
      }
      continue;
    }

    if (month === 2 && day >= 1 && day <= 7) {
      if (!['grace', 'graduated_blocked', 'adult_blocked'].includes(user.reverification_status)) {
        await pool.execute(
          `UPDATE users SET reverification_status = 'grace', reverification_deadline = ? WHERE id = ?`,
          [deadline, userId],
        );
      }
      continue;
    }

    if (month === 2 && day >= 8) {
      if (user.reverification_status === 'grace' || user.reverification_status === 'required') {
        await pool.execute(
          `UPDATE users SET reverification_status = 'restricted' WHERE id = ?`,
          [userId],
        );
      }
    }
  }
}

export async function runReverificationGuideJob() {
  const lock = await acquireBatchLock(LOCK_KEY, 300);
  if (!lock.acquired) {
    console.log('[reverification] skip — lock held');
    return;
  }
  try {
    await runReverificationGuide();
    console.log('[reverification] guide job 완료');
  } catch (err) {
    console.error('[reverification] guide job 실패:', err?.message ?? err);
  } finally {
    await releaseBatchLock(LOCK_KEY, lock.owner);
  }
}
