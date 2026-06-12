import pool from '../config/database.js';

/** @typedef {'PENDING'|'APPROVED'|'REJECTED'} StudentVerificationStatus */

/**
 * 사용자 학생증/증명서 검수 상태 (앱 게이트·/me용)
 * @returns {Promise<{ status: StudentVerificationStatus, rejectReason: string|null, submissionType: 'student_id'|'certificate'|null }>}
 */
export async function getStudentVerificationStatus(userId) {
  const [userRows] = await pool.execute(
    `SELECT student_verified FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  if (!userRows.length) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null };
  }

  if (userRows[0].student_verified) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null };
  }

  const [studentRows] = await pool.execute(
    `SELECT status, review_note, created_at
     FROM signup_student_id_submissions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  const [certRows] = await pool.execute(
    `SELECT status, review_note, created_at
     FROM signup_certificate_submissions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  const latestStudent = studentRows[0] || null;
  const latestCert = certRows[0] || null;

  let submission = null;
  let submissionType = null;

  if (latestStudent && latestCert) {
    const studentAt = new Date(latestStudent.created_at).getTime();
    const certAt = new Date(latestCert.created_at).getTime();
    if (studentAt >= certAt) {
      submission = latestStudent;
      submissionType = 'student_id';
    } else {
      submission = latestCert;
      submissionType = 'certificate';
    }
  } else if (latestStudent) {
    submission = latestStudent;
    submissionType = 'student_id';
  } else if (latestCert) {
    submission = latestCert;
    submissionType = 'certificate';
  }

  if (!submission) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null };
  }

  const rawStatus = String(submission.status || '').toLowerCase();
  if (rawStatus === 'pending') {
    return { status: 'PENDING', rejectReason: null, submissionType };
  }
  if (rawStatus === 'rejected') {
    return {
      status: 'REJECTED',
      rejectReason: submission.review_note || null,
      submissionType,
    };
  }

  return { status: 'PENDING', rejectReason: null, submissionType };
}
