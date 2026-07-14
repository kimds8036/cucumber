import pool from '../config/database.js';

const REVERIFICATION_ACTIVE_STATUSES = new Set(['grace', 'required', 'restricted']);

/** @typedef {'PENDING'|'APPROVED'|'REJECTED'} StudentVerificationStatus */
/** @typedef {'signup'|'resubmit'|'reverification'|null} SubmissionPurpose */

/**
 * @returns {Promise<{
 *   status: StudentVerificationStatus,
 *   rejectReason: string|null,
 *   submissionType: 'student_id'|'certificate'|null,
 *   submissionPurpose: SubmissionPurpose,
 *   reverificationSubmissionPending: boolean,
 * }>}
 */
export async function getStudentVerificationStatus(userId) {
  const base = {
    submissionPurpose: null,
    reverificationSubmissionPending: false,
  };

  const [userRows] = await pool.execute(
    `SELECT student_verified, reverification_status FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  if (!userRows.length) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null, ...base };
  }

  const userRow = userRows[0];
  const reverificationStatus = userRow.reverification_status || 'none';

  const [studentRows] = await pool.execute(
    `SELECT status, review_note, created_at, submission_purpose
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
  let studentPurpose = null;

  if (latestStudent && latestCert) {
    const studentAt = new Date(latestStudent.created_at).getTime();
    const certAt = new Date(latestCert.created_at).getTime();
    if (studentAt >= certAt) {
      submission = latestStudent;
      submissionType = 'student_id';
      studentPurpose = latestStudent.submission_purpose || 'signup';
    } else {
      submission = latestCert;
      submissionType = 'certificate';
    }
  } else if (latestStudent) {
    submission = latestStudent;
    submissionType = 'student_id';
    studentPurpose = latestStudent.submission_purpose || 'signup';
  } else if (latestCert) {
    submission = latestCert;
    submissionType = 'certificate';
  }

  const rawStatus = submission
    ? String(submission.status || '').toLowerCase()
    : null;

  if (
    userRow.student_verified &&
    REVERIFICATION_ACTIVE_STATUSES.has(reverificationStatus) &&
    submission &&
    submissionType === 'student_id' &&
    rawStatus === 'pending' &&
    studentPurpose === 'reverification'
  ) {
    return {
      status: 'APPROVED',
      rejectReason: null,
      submissionType: 'student_id',
      submissionPurpose: 'reverification',
      reverificationSubmissionPending: true,
    };
  }

  if (userRow.student_verified) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null, ...base };
  }

  if (!submission) {
    return { status: 'APPROVED', rejectReason: null, submissionType: null, ...base };
  }

  if (rawStatus === 'pending') {
    return {
      status: 'PENDING',
      rejectReason: null,
      submissionType,
      submissionPurpose:
        submissionType === 'student_id' ? studentPurpose || 'signup' : null,
      reverificationSubmissionPending: false,
    };
  }
  if (rawStatus === 'rejected') {
    return {
      status: 'REJECTED',
      rejectReason: submission.review_note || null,
      submissionType,
      submissionPurpose:
        submissionType === 'student_id' ? studentPurpose || 'signup' : null,
      reverificationSubmissionPending: false,
    };
  }

  return {
    status: 'PENDING',
    rejectReason: null,
    submissionType,
    submissionPurpose:
      submissionType === 'student_id' ? studentPurpose || 'signup' : null,
    reverificationSubmissionPending: false,
  };
}
