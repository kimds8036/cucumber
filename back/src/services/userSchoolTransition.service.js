import pool from '../config/database.js';
import { shouldSetPreviousSchool } from './reverification.service.js';
import { scheduleSchoolTermSync } from './schoolTerms.service.js';

/**
 * 학교 변경 시 previous_school_id·재인증 상태 갱신
 */
export async function applyUserSchoolUpdate(
  connection,
  { userId, newSchoolId, grade, classNumber, gradeException, graduationYear },
) {
  const [rows] = await connection.execute(
    'SELECT school_id, grade_exception FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (!rows.length) return;

  const oldSchoolId = rows[0].school_id;
  const sets = [];
  const params = [];

  if (shouldSetPreviousSchool(oldSchoolId, newSchoolId)) {
    sets.push('previous_school_id = ?');
    params.push(oldSchoolId);
  }

  if (newSchoolId) {
    sets.push('school_id = ?');
    params.push(newSchoolId);
  }
  if (grade != null) {
    sets.push('grade = ?');
    params.push(Number(grade));
  }
  if (classNumber != null) {
    sets.push('class_number = ?');
    params.push(Number(classNumber));
  }
  if (gradeException != null) {
    sets.push('grade_exception = ?');
    params.push(gradeException ? 1 : 0);
  }
  if (graduationYear != null) {
    sets.push('graduation_year = ?');
    params.push(Number(graduationYear));
  }

  sets.push("reverification_status = 'none'");
  sets.push('reverification_deadline = NULL');

  if (!sets.length) return;

  params.push(userId);
  await connection.execute(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
    params,
  );

  if (newSchoolId && String(newSchoolId) !== String(oldSchoolId || '')) {
    scheduleSchoolTermSync(newSchoolId);
  }
}

export async function getUserReverificationPayload(userId) {
  const [rows] = await pool.execute(
    `SELECT reverification_status, reverification_deadline, grade_exception, previous_school_id
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    reverificationStatus: row.reverification_status,
    reverificationDeadline: row.reverification_deadline,
    gradeException: Boolean(row.grade_exception),
    previousSchoolId: row.previous_school_id,
  };
}
