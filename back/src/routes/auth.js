import express from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { deactivateFcmTokenForSession } from '../utils/pushTokens.js';
import { 
  generateVerificationCode, 
  hashPassword, 
  comparePassword, 
  generateToken,
  createUserAccessToken,
  getClientIp,
  getDeviceInfo
} from '../utils/auth.js';
import { validatePhone, validateUsername, validatePassword, validateBirthDate } from '../utils/validation.js';
import { blockWhenFlag } from '../middleware/systemFlags.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
// OCR 자동 인증 — 수동 검수 전환으로 당분간 미사용 (studentIdOcr.service.js 참고)
// import {
//   extractTextFromImageBase64,
//   verifyStudentIdOcrForSignup,
// } from '../services/studentIdOcr.service.js';
import { uploadSignupStudentIdPhoto } from '../services/signupStudentIdPhoto.service.js';
import {
  inferExpectedSchoolLevel,
  inferGradeFromBirthDate,
  inferGraduationYear,
  pickRandomProfileColorId,
} from '../utils/signupEnrollment.js';
import { verifyFirebaseIdToken } from '../config/firebase.js';
import {
  normalizeLocalKrPhone,
} from '../utils/phone.js';
import {
  packPhoneOnly,
  packSubmissionPii,
  packUserPii,
  phoneLookupBindParams,
  phoneLookupWhereClause,
  USER_PII_INSERT_COLUMNS,
  userPiiInsertValues,
  normalizeBirthDateInput,
} from '../services/userPii.service.js';
import {
  signupOcrLimiter,
  signupPhoneBackendLimiter,
  recoveryPhoneBackendLimiter,
} from '../middleware/signupRateLimit.js';
import {
  findRegisteredUserByPhoneAndName,
  findRegisteredUserByPhoneNameUsername,
  issuePasswordRecoveryToken,
  consumePasswordRecoveryToken,
  mapRecoveryError,
  mapInicisRecoveryError,
} from '../services/accountRecovery.service.js';
import {
  issueStudentIdManualVerificationToken,
  consumeStudentIdManualVerificationToken,
} from '../services/signupVerificationToken.service.js';
import { getStudentVerificationStatus } from '../services/studentVerificationStatus.service.js';
import {
  consumeRefreshToken,
  generateRefreshTokenPlain,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from '../services/refreshToken.service.js';
import { incrementTokenVersion } from '../services/session.service.js';
import { getReverificationBlockCode } from '../services/reverification.service.js';
import { getUserReverificationPayload } from '../services/userSchoolTransition.service.js';
import { API_ERROR_CODES } from '../constants/apiErrorCodes.js';
import { isProductionEnv } from '../utils/httpError.js';
import {
  consumeIdentityVerificationClientToken,
  getIdentityVerificationByClientToken,
  isInicisEnabled,
} from '../services/inicis.service.js';

const router = express.Router();

function isUnder14YearsOld(birthDateStr) {
  const m = String(birthDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age < 14;
}

async function ensureInicisPhoneVerificationRecord(phone, connection) {
  const normalized = normalizeLocalKrPhone(phone);
  if (!normalized || !validatePhone(normalized)) return;
  const phonePacked = packPhoneOnly(normalized);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await connection.execute(
    `DELETE FROM phone_verifications WHERE ${phoneLookupWhereClause()} AND is_verified = FALSE`,
    phoneLookupBindParams(normalized),
  );
  await connection.execute(
    `INSERT INTO phone_verifications (phone_enc, phone_lookup, verification_code, expires_at, is_verified)
     VALUES (?, ?, ?, ?, TRUE)`,
    [phonePacked.phone_enc, phonePacked.phone_lookup, 'INICIS', expiresAt],
  );
}

function mapIdentityTokenError(code) {
  const messages = {
    IDENTITY_TOKEN_REQUIRED: '학생 본인인증을 먼저 완료해 주세요.',
    INVALID_IDENTITY_TOKEN: '본인인증 정보가 유효하지 않습니다. 다시 인증해 주세요.',
    IDENTITY_PURPOSE_MISMATCH: '본인인증 용도가 올바르지 않습니다.',
    IDENTITY_NOT_SUCCESS: '본인인증이 완료되지 않았습니다.',
    IDENTITY_TOKEN_USED: '이미 사용된 본인인증입니다. 다시 인증해 주세요.',
    IDENTITY_TOKEN_EXPIRED: '본인인증이 만료되었습니다. 다시 인증해 주세요.',
    IDENTITY_NAME_MISMATCH: '본인인증 이름이 가입 정보와 일치하지 않습니다.',
    IDENTITY_PHONE_MISMATCH: '본인인증 전화번호가 가입 정보와 일치하지 않습니다.',
    IDENTITY_BIRTH_MISMATCH: '본인인증 생년월일이 가입 정보와 일치하지 않습니다.',
    GUARDIAN_TOKEN_REQUIRED: '보호자 본인인증이 필요합니다.',
  };
  return messages[code] || '본인인증 검증에 실패했습니다.';
}

function identityTokenErrorResponse(tokenErr) {
  const code = tokenErr?.code || 'INVALID_IDENTITY_TOKEN';
  let message = mapIdentityTokenError(code);
  if (message === '본인인증 검증에 실패했습니다.') {
    console.error('[signup/inicis-token]', code, tokenErr?.message || tokenErr);
    if (tokenErr?.message && !String(code).startsWith('ER_')) {
      message = tokenErr.message;
    } else if (code) {
      message = `본인인증 검증에 실패했습니다. (${code})`;
    }
  }
  return {
    status: 400,
    body: {
      success: false,
      message,
      code,
    },
  };
}

function studentVerificationTokenErrorResponse(tokenErr) {
  const code = tokenErr?.code || 'INVALID_STUDENT_VERIFICATION_TOKEN';
  const messages = {
    STUDENT_VERIFICATION_TOKEN_REQUIRED:
      '학생증 촬영을 먼저 완료해 주세요.',
    INVALID_STUDENT_VERIFICATION_TOKEN:
      '학생증 제출이 만료되었거나 유효하지 않습니다. 다시 촬영해 주세요.',
    STUDENT_VERIFICATION_TOKEN_USED:
      '이미 사용된 학생증 제출입니다. 다시 촬영해 주세요.',
    STUDENT_VERIFICATION_TOKEN_EXPIRED:
      '학생증 제출이 만료되었습니다. 다시 촬영해 주세요.',
    STUDENT_VERIFICATION_MISMATCH:
      '제출 정보가 학생증 촬영 시점과 일치하지 않습니다.',
    STUDENT_VERIFICATION_PHONE_MISMATCH:
      '전화번호가 학생증 촬영 시점과 일치하지 않습니다.',
    SCHOOL_ID_REQUIRED: '재학 학교를 선택해 주세요.',
    STUDENT_ID_IMAGE_MISSING:
      '학생증 이미지가 없습니다. 다시 촬영해 주세요.',
    INVALID_SCHOOL_ID: '유효하지 않은 학교 정보입니다.',
  };
  return {
    status: 400,
    body: {
      success: false,
      message: messages[code] || '학생증 제출 검증에 실패했습니다.',
      code,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// express-validator 체이너 모음
// 핸들러 내부의 ad-hoc 체크(정규식, 중복 확인 등) 는 그대로 둔다.
// 여기서는 타입/길이/필수값 같은 1차 게이트만 깐다.
// ─────────────────────────────────────────────────────────────────────────────

const loginValidators = [
  body('username').isString().withMessage('사용자명을 입력해주세요.')
    .bail().trim().isLength({ min: 1, max: 50 }).withMessage('사용자명 형식이 올바르지 않습니다.'),
  body('password').isString().withMessage('비밀번호를 입력해주세요.')
    .bail().isLength({ min: 1, max: 200 }).withMessage('비밀번호 형식이 올바르지 않습니다.'),
  body('deviceId').optional({ values: 'falsy' }).isString().isLength({ max: 200 }),
];

const signupValidators = [
  body('username').isString().bail().trim().isLength({ min: 3, max: 20 })
    .withMessage('사용자명은 3-20자여야 합니다.'),
  body('password').isString().bail().isLength({ min: 8, max: 200 })
    .withMessage('비밀번호는 8자 이상이어야 합니다.'),
  body('name').isString().bail().trim().isLength({ min: 1, max: 50 })
    .withMessage('이름을 입력해주세요.'),
  body('phone').isString().bail().trim().isLength({ min: 1, max: 20 })
    .withMessage('전화번호를 입력해주세요.'),
  body('birthDate').isString().bail().trim().isLength({ min: 1, max: 20 })
    .withMessage('생년월일을 입력해주세요.'),
  body('schoolId').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1, max: 50 }),
  body('claimedSchoolName').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  body('grade').exists({ checkNull: true }).withMessage('학년을 선택해주세요.')
    .bail().toInt().isInt({ min: 1, max: 6 }).withMessage('학년이 올바르지 않습니다.'),
  body('classNumber').exists({ checkNull: true }).withMessage('반을 선택해주세요.')
    .bail().toInt().isInt({ min: 1, max: 50 }).withMessage('반이 올바르지 않습니다.'),
  body('graduationYear').exists({ checkNull: true }).withMessage('졸업년도를 선택해주세요.')
    .bail().toInt().isInt({ min: 1900, max: 2100 }).withMessage('졸업년도가 올바르지 않습니다.'),
  body('colorId').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 4 }),
  body('verificationMethod').optional({ values: 'falsy' }).isString().isIn(['student_id', 'certificate']),
  body('certificateViewUrl').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
  body('certificateAccessCode').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
  body('studentVerificationToken').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('studentInicisClientToken').optional({ values: 'falsy' }).isString().isLength({ max: 64 }),
  body('guardianInicisClientToken').optional({ values: 'falsy' }).isString().isLength({ max: 64 }),
  body('consents').optional().isObject(),
  body('consents.termsOfService').optional().isBoolean(),
  body('consents.dataCollection').optional().isBoolean(),
  body('consents.studentOcr').optional().isBoolean(),
  body('consents.location').optional().isBoolean(),
  body('consents.marketingOptIn').optional().isBoolean(),
];

const updateUsernameValidators = [
  body('username').isString().bail().trim()
    .customSanitizer((v) => (typeof v === 'string' && v.startsWith('@') ? v.slice(1) : v))
    .isLength({ min: 3, max: 20 }).withMessage('아이디는 3-20자여야 합니다.'),
];

const updatePasswordValidators = [
  body('currentPassword').isString().bail().isLength({ min: 1, max: 200 })
    .withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword').isString().bail().isLength({ min: 8, max: 200 })
    .withMessage('새 비밀번호는 8자 이상이어야 합니다.'),
];

// 내 프로필 조회
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.execute(
      `SELECT 
         u.id,
         u.username,
         u.name_enc,
         u.color_id,
         u.school_id,
         u.grade,
         u.class_number,
         u.color_id,
         c.hex_code AS profile_color_hex,
         c.color_number AS profile_color_number,
         u.student_verified,
         s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       LEFT JOIN colors c ON u.color_id = c.id
       WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const user = rows[0];

    const [friendRows] = await pool.execute(
      `SELECT COUNT(*) as cnt
       FROM user_friendships
       WHERE status = 'accepted'
         AND (requester_id = ? OR addressee_id = ?)`,
      [userId, userId],
    );

    const friendCount = Number(friendRows[0]?.cnt ?? 0);

    const verification = await getStudentVerificationStatus(userId);
    const reverification = await getUserReverificationPayload(userId);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        colorId: user.color_id,
        school: {
          id: user.school_id,
          name: user.school_name,
        },
        grade: user.grade,
        classNumber: user.class_number,
        colorId: user.color_id,
        profileColor: {
          id: user.color_id,
          hexCode: user.profile_color_hex,
          colorNumber: user.profile_color_number,
        },
        friendCount,
        studentVerificationStatus: verification.status,
        rejectReason: verification.rejectReason,
        submissionPurpose: verification.submissionPurpose,
        reverificationSubmissionPending: verification.reverificationSubmissionPending,
        studentVerified: Boolean(user.student_verified),
        reverificationStatus: reverification?.reverificationStatus ?? 'none',
        reverificationDeadline: reverification?.reverificationDeadline ?? null,
        gradeException: reverification?.gradeException ?? false,
        previousSchoolId: reverification?.previousSchoolId ?? null,
      },
    });
  } catch (error) {
    console.error('내 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 프로필 조회 중 오류가 발생했습니다.',
    });
  }
});

// 내 아이디(username) 변경
router.patch('/me/username', authenticate, validate(updateUsernameValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const input = String(req.body?.username ?? '').trim();
    const normalized = input.startsWith('@') ? input.slice(1) : input;

    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: '새 아이디를 입력해주세요.',
      });
    }
    if (!validateUsername(normalized)) {
      return res.status(400).json({
        success: false,
        message: '아이디는 영문, 숫자, 언더스코어만 사용 가능하며 3-20자여야 합니다.',
      });
    }

    await pool.execute(
      `INSERT IGNORE INTO user_settings (user_id) VALUES (?)`,
      [userId]
    );

    const [settingsRows] = await pool.execute(
      `SELECT last_username_change_at
       FROM user_settings
       WHERE user_id = ?`,
      [userId]
    );
    const lastChangedAt = settingsRows[0]?.last_username_change_at
      ? new Date(settingsRows[0].last_username_change_at)
      : null;
    if (lastChangedAt) {
      const nextAllowedAt = new Date(lastChangedAt);
      nextAllowedAt.setMonth(nextAllowedAt.getMonth() + 6);
      if (new Date() < nextAllowedAt) {
        return res.status(400).json({
          success: false,
          message: `아이디는 6개월에 1번만 변경할 수 있습니다. 다음 변경 가능일: ${nextAllowedAt.toISOString().slice(0, 10)}`,
        });
      }
    }

    const [dupRows] = await pool.execute(
      `SELECT id FROM users WHERE username = ? AND id != ?`,
      [normalized, userId]
    );
    if (dupRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 아이디입니다.',
      });
    }

    await pool.execute(
      `UPDATE users SET username = ? WHERE id = ? AND is_deleted = FALSE`,
      [normalized, userId]
    );
    await pool.execute(
      `UPDATE user_settings
       SET last_username_change_at = NOW()
       WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      message: '아이디가 변경되었습니다.',
      data: { username: normalized, lastUsernameChangeAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('아이디 변경 오류:', error);
    return res.status(500).json({
      success: false,
      message: '아이디 변경 중 오류가 발생했습니다.',
    });
  }
});

// 내 비밀번호 변경
router.patch('/me/password', authenticate, validate(updatePasswordValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요.',
      });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 영문과 숫자를 포함하여 최소 8자 이상이어야 합니다.',
      });
    }

    const [rows] = await pool.execute(
      `SELECT password
       FROM users
       WHERE id = ? AND is_deleted = FALSE`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const isValidCurrent = await comparePassword(currentPassword, rows[0].password);
    if (!isValidCurrent) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호가 일치하지 않습니다.',
      });
    }

    const hashed = await hashPassword(newPassword);
    await pool.execute(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashed, userId]
    );
    await incrementTokenVersion(userId);
    await revokeAllRefreshTokens(userId);

    return res.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.',
    });
  }
});

// 전화번호 인증 코드 발송
router.post('/send-verification', async (req, res) => {
  try {
    const phone = normalizeLocalKrPhone(req.body?.phone);

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: '전화번호를 입력해주세요.' 
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: '올바른 전화번호 형식이 아닙니다.' 
      });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료

    const phonePacked = packPhoneOnly(phone);

    // 기존 인증 코드가 있으면 삭제 (같은 전화번호로 여러 번 요청 방지)
    await pool.execute(
      `DELETE FROM phone_verifications WHERE ${phoneLookupWhereClause()} AND is_verified = FALSE`,
      phoneLookupBindParams(phone),
    );

    // 새 인증 코드 저장
    await pool.execute(
      `INSERT INTO phone_verifications (phone_enc, phone_lookup, verification_code, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [
        phonePacked.phone_enc,
        phonePacked.phone_lookup,
        verificationCode,
        expiresAt,
      ],
    );

    // 실제로는 SMS 발송 서비스 연동 (예: 알리고, 카카오톡 등)
    res.json({ 
      success: true, 
      message: '인증 코드가 발송되었습니다.',
      // 개발용 - 실제 프로덕션에서는 제거
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });
  } catch (error) {
    console.error('인증 코드 발송 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '인증 코드 발송 중 오류가 발생했습니다.' 
    });
  }
});

// 전화번호 인증 코드 확인
router.post('/verify-phone', async (req, res) => {
  try {
    const phone = normalizeLocalKrPhone(req.body?.phone);
    const { verificationCode } = req.body;

    if (!phone || !verificationCode) {
      return res.status(400).json({ 
        success: false, 
        message: '전화번호와 인증 코드를 입력해주세요.' 
      });
    }

    // 인증 코드 확인
    const [codes] = await pool.execute(
      `SELECT id, expires_at FROM phone_verifications 
       WHERE ${phoneLookupWhereClause()} AND verification_code = ? AND is_verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [...phoneLookupBindParams(phone), verificationCode],
    );

    if (codes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '인증 코드가 일치하지 않습니다.' 
      });
    }

    const codeRecord = codes[0];

    // 만료 시간 확인
    if (new Date(codeRecord.expires_at) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: '인증 코드가 만료되었습니다.' 
      });
    }

    // 인증 완료 처리
    await pool.execute(
      'UPDATE phone_verifications SET is_verified = TRUE WHERE id = ?',
      [codeRecord.id]
    );

    res.json({ 
      success: true, 
      message: '전화번호 인증이 완료되었습니다.' 
    });
  } catch (error) {
    console.error('인증 코드 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '인증 코드 확인 중 오류가 발생했습니다.' 
    });
  }
});

// 회원가입 전 전화번호 중복 확인 (Firebase SMS 발송 전)
router.post('/check-phone-available', signupPhoneBackendLimiter, async (req, res) => {
  try {
    const phone = normalizeLocalKrPhone(req.body?.phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '전화번호를 입력해주세요.',
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '올바른 전화번호 형식이 아닙니다.',
      });
    }

    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE ${phoneLookupWhereClause()} LIMIT 1`,
      phoneLookupBindParams(phone),
    );

    return res.json({
      success: true,
      data: {
        phone,
        available: existing.length === 0,
      },
    });
  } catch (error) {
    console.error('전화번호 중복 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '전화번호 확인 중 오류가 발생했습니다.',
    });
  }
});

// Firebase Phone Auth ID Token 검증 → phone_verifications 기록
router.post('/verify-firebase-phone', signupPhoneBackendLimiter, async (req, res) => {
  try {
    const { idToken, phone: clientPhone } = req.body || {};

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      });
    }

    const normalizedClient = normalizeLocalKrPhone(clientPhone);
    if (!normalizedClient || !validatePhone(normalizedClient)) {
      return res.status(400).json({
        success: false,
        message: '올바른 전화번호 형식이 아닙니다.',
      });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (tokenErr) {
      console.warn('[verify-firebase-phone] token invalid:', tokenErr?.message || tokenErr);
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 인증 토큰입니다.',
      });
    }

    if (decoded.firebase?.sign_in_provider !== 'phone') {
      return res.status(400).json({
        success: false,
        message: '전화번호 인증 토큰이 아닙니다.',
      });
    }

    const normalizedToken = normalizeLocalKrPhone(decoded.phone_number);
    if (!normalizedToken || !validatePhone(normalizedToken)) {
      return res.status(400).json({
        success: false,
        message: '인증 토큰의 전화번호 형식이 올바르지 않습니다.',
      });
    }

    if (normalizedClient !== normalizedToken) {
      console.warn('[verify-firebase-phone] phone mismatch', {
        client: normalizedClient,
        token: normalizedToken,
      });
      return res.status(400).json({
        success: false,
        message: '인증한 전화번호와 입력한 전화번호가 일치하지 않습니다.',
      });
    }

    const phone = normalizedToken;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const phonePacked = packPhoneOnly(phone);

    await pool.execute(
      `DELETE FROM phone_verifications WHERE ${phoneLookupWhereClause()} AND is_verified = FALSE`,
      phoneLookupBindParams(phone),
    );

    await pool.execute(
      `INSERT INTO phone_verifications (phone_enc, phone_lookup, verification_code, expires_at, is_verified)
       VALUES (?, ?, ?, ?, TRUE)`,
      [phonePacked.phone_enc, phonePacked.phone_lookup, 'FB0000', expiresAt],
    );

    return res.json({
      success: true,
      message: '전화번호 인증이 완료되었습니다.',
      data: { phone },
    });
  } catch (error) {
    console.error('Firebase 전화번호 인증 오류:', error);
    return res.status(500).json({
      success: false,
      message: '전화번호 인증 처리 중 오류가 발생했습니다.',
    });
  }
});

// ── 아이디/비밀번호 찾기 (KG 이니시스 본인인증) ──

router.post('/recovery/find-username', recoveryPhoneBackendLimiter, async (req, res) => {
  try {
    if (!isInicisEnabled()) {
      return res.status(503).json({
        success: false,
        message: '본인인증 서비스를 이용할 수 없습니다.',
      });
    }

    const { inicisClientToken, name } = req.body || {};
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: '이름을 입력해 주세요.',
      });
    }

    const identity = await getIdentityVerificationByClientToken(
      inicisClientToken,
      { purpose: 'find_username' },
    );
    if (identity.name && identity.name !== trimmedName) {
      return res.status(400).json({
        success: false,
        message: '입력하신 이름과 본인인증 정보가 일치하지 않습니다.',
      });
    }

    const user = await findRegisteredUserByPhoneAndName(identity.phone, trimmedName);

    await consumeIdentityVerificationClientToken(inicisClientToken, {
      purpose: 'find_username',
      expectedName: trimmedName,
      expectedPhone: identity.phone,
      linkedUserId: user.id,
    });

    return res.json({
      success: true,
      message: '아이디를 확인했습니다.',
      data: {
        username: user.username,
        name: user.name,
        phone: identity.phone,
      },
    });
  } catch (error) {
    const mapped = mapInicisRecoveryError(error);
    if (mapped.status < 500) {
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
    console.error('[recovery/find-username]', error);
    return res.status(500).json({
      success: false,
      message: '아이디 찾기 중 오류가 발생했습니다.',
    });
  }
});

router.post('/recovery/verify-account', recoveryPhoneBackendLimiter, async (req, res) => {
  try {
    if (!isInicisEnabled()) {
      return res.status(503).json({
        success: false,
        message: '본인인증 서비스를 이용할 수 없습니다.',
      });
    }

    const { inicisClientToken, name, username } = req.body || {};
    const trimmedName = String(name || '').trim();
    const trimmedUsername = String(username || '').trim();
    if (!trimmedName || !trimmedUsername) {
      return res.status(400).json({
        success: false,
        message: '이름과 아이디를 입력해 주세요.',
      });
    }

    const identity = await getIdentityVerificationByClientToken(
      inicisClientToken,
      { purpose: 'password_recovery' },
    );
    if (identity.name && identity.name !== trimmedName) {
      return res.status(400).json({
        success: false,
        message: '입력하신 이름과 본인인증 정보가 일치하지 않습니다.',
      });
    }

    const user = await findRegisteredUserByPhoneNameUsername(
      identity.phone,
      trimmedName,
      trimmedUsername,
    );

    await consumeIdentityVerificationClientToken(inicisClientToken, {
      purpose: 'password_recovery',
      expectedName: trimmedName,
      expectedPhone: identity.phone,
      linkedUserId: user.id,
    });

    const recoveryToken = await issuePasswordRecoveryToken({
      userId: user.id,
      phone: identity.phone,
      username: user.username,
    });

    return res.json({
      success: true,
      message: '본인 확인이 완료되었습니다.',
      data: {
        recoveryToken,
        username: user.username,
        name: user.name,
        phone: identity.phone,
      },
    });
  } catch (error) {
    const mapped = mapInicisRecoveryError(error);
    if (mapped.status < 500) {
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
    console.error('[recovery/verify-account]', error);
    return res.status(500).json({
      success: false,
      message: '본인 확인 중 오류가 발생했습니다.',
    });
  }
});

const recoveryResetValidators = [
  body('recoveryToken').isString().bail().isLength({ min: 10, max: 2000 })
    .withMessage('비밀번호 재설정 토큰이 필요합니다.'),
  body('phone').isString().bail().trim().isLength({ min: 1, max: 20 }),
  body('username').isString().bail().trim().isLength({ min: 3, max: 20 }),
  body('newPassword').isString().bail().isLength({ min: 8, max: 200 })
    .withMessage('새 비밀번호는 8자 이상이어야 합니다.'),
];

router.post('/recovery/reset-password', validate(recoveryResetValidators), async (req, res) => {
  try {
    const { recoveryToken, phone, username, newPassword } = req.body;
    const normalizedPhone = normalizeLocalKrPhone(phone);
    const trimmedUsername = String(username || '').trim();

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 영문과 숫자를 포함하여 최소 8자 이상이어야 합니다.',
      });
    }

    const { userId } = await consumePasswordRecoveryToken(recoveryToken, {
      phone: normalizedPhone,
      username: trimmedUsername,
    });

    const hashed = await hashPassword(newPassword);
    await pool.execute(
      `UPDATE users SET password = ? WHERE id = ? AND is_deleted = FALSE`,
      [hashed, userId],
    );

    return res.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    const mapped = mapRecoveryError(error);
    if (mapped.status < 500) {
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
    console.error('[recovery/reset-password]', error);
    return res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.',
    });
  }
});

// 회원가입
router.post('/signup', blockWhenFlag('signup_disabled'), validate(signupValidators), async (req, res) => {
  try {
    const { 
      username, 
      password, 
      name, 
      phone: rawPhone, 
      birthDate, 
      schoolId, 
      grade, 
      classNumber, 
      graduationYear, 
      colorId: rawColorId,
      verificationMethod = 'student_id',
      certificateViewUrl,
      certificateAccessCode,
      claimedSchoolName,
      studentVerificationToken,
      studentInicisClientToken,
      guardianInicisClientToken,
      consents: rawConsents,
    } = req.body;

    const phone = normalizeLocalKrPhone(rawPhone);
    const normalizedBirthDate = normalizeBirthDateInput(birthDate) || birthDate;
    const isCertificateSignup = verificationMethod === 'certificate';
    const under14 = isUnder14YearsOld(normalizedBirthDate);
    const inicisOn = isInicisEnabled();
    const resolvedSchoolId = isCertificateSignup
      ? (schoolId?.trim() || 'CERT_PENDING')
      : schoolId;

    // 필수 필드 검증
    if (!username || !password || !name || !phone || !birthDate || 
        !resolvedSchoolId || !grade || !classNumber || !graduationYear) {
      return res.status(400).json({ 
        success: false, 
        message: '모든 필드를 입력해주세요.' 
      });
    }

    if (isCertificateSignup) {
      if (!certificateViewUrl?.trim() || !certificateAccessCode?.trim()) {
        return res.status(400).json({
          success: false,
          message: '증명서 열람 주소와 열람 번호를 입력해주세요.',
        });
      }
    } else if (!schoolId?.trim()) {
      return res.status(400).json({
        success: false,
        message: '재학 중인 학교를 선택해 주세요.',
      });
    }

    const consents = rawConsents && typeof rawConsents === 'object' ? rawConsents : {};
    const requiredConsentOk =
      consents.termsOfService === true &&
      consents.dataCollection === true &&
      consents.studentOcr === true &&
      consents.location === true &&
      (!under14 || consents.guardian === true);
    if (!requiredConsentOk) {
      return res.status(400).json({
        success: false,
        message: under14
          ? '필수 약관 및 법정대리인 동의가 완료되지 않았습니다.'
          : '필수 약관 동의가 완료되지 않았습니다.',
      });
    }

    if (!isCertificateSignup && !studentVerificationToken?.trim()) {
      return res.status(400).json({
        success: false,
        message: '학생증 촬영을 먼저 완료해 주세요.',
        code: 'STUDENT_VERIFICATION_TOKEN_REQUIRED',
      });
    }

    const resolvedColorId = Number(rawColorId) || pickRandomProfileColorId();

    const expectedLevel = inferExpectedSchoolLevel(normalizedBirthDate);
    let resolvedGrade = Number(grade);
    let resolvedGraduationYear = Number(graduationYear);
    if (!Number.isFinite(resolvedGrade) || resolvedGrade < 1) {
      resolvedGrade = inferGradeFromBirthDate(normalizedBirthDate, expectedLevel) || 1;
    }
    if (!Number.isFinite(resolvedGraduationYear)) {
      resolvedGraduationYear =
        inferGraduationYear(normalizedBirthDate, expectedLevel, resolvedGrade) ||
        new Date().getFullYear() + 1;
    }
    const resolvedClassNumber = Number(classNumber) || 1;

    // 입력값 검증
    if (!validateUsername(username)) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자명은 영문, 숫자, 언더스코어만 사용 가능하며 3-20자여야 합니다.' 
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: '비밀번호는 영문과 숫자를 포함하여 최소 8자 이상이어야 합니다.' 
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: '올바른 전화번호 형식이 아닙니다.' 
      });
    }

    if (!validateBirthDate(normalizedBirthDate)) {
      return res.status(400).json({ 
        success: false, 
        message: '올바른 생년월일이 아닙니다.' 
      });
    }

    if (under14 && inicisOn && !guardianInicisClientToken?.trim()) {
      return res.status(400).json({
        success: false,
        message: mapIdentityTokenError('GUARDIAN_TOKEN_REQUIRED'),
        code: 'GUARDIAN_TOKEN_REQUIRED',
      });
    }

    if (inicisOn && !studentInicisClientToken?.trim()) {
      return res.status(400).json({
        success: false,
        message: mapIdentityTokenError('IDENTITY_TOKEN_REQUIRED'),
        code: 'IDENTITY_TOKEN_REQUIRED',
      });
    }

    // 전화번호 인증 확인 (이니시스 OFF 시 레거시)
    if (!inicisOn) {
      const [verifiedCodes] = await pool.execute(
        `SELECT id FROM phone_verifications 
         WHERE ${phoneLookupWhereClause()} AND is_verified = TRUE 
         ORDER BY created_at DESC LIMIT 1`,
        phoneLookupBindParams(phone),
      );

      if (verifiedCodes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '전화번호 인증이 완료되지 않았습니다.' 
        });
      }
    }

    // 중복 확인
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR ${phoneLookupWhereClause()}`,
      [username, ...phoneLookupBindParams(phone)],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 사용 중인 사용자명 또는 전화번호입니다.' 
      });
    }

    // 컬러 ID 유효성 확인 (1~4 랜덤 배정 가능)
    const [colors] = await pool.execute('SELECT id FROM colors WHERE id = ?', [resolvedColorId]);
    if (colors.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 컬러 ID입니다.' 
      });
    }

    // student_verified: 학생증·증명서 가입 모두 관리자 검수 승인 전까지 FALSE.
    const studentVerifiedOnInsert = false;

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const identityLinkIds = [];
      const anchorName = String(name).trim();
      const anchorPhone = phone;
      const anchorBirthDate = normalizedBirthDate;
      let signupName = anchorName;
      let signupPhone = anchorPhone;
      let signupBirthDate = anchorBirthDate;

      if (under14 && inicisOn && guardianInicisClientToken?.trim()) {
        try {
          const guardianConsumed = await consumeIdentityVerificationClientToken(
            guardianInicisClientToken,
            { purpose: 'guardian_consent' },
            connection,
          );
          identityLinkIds.push(guardianConsumed.id);
        } catch (tokenErr) {
          await connection.rollback();
          const { status, body } = identityTokenErrorResponse(tokenErr);
          return res.status(status).json(body);
        }
      }

      if (inicisOn && studentInicisClientToken?.trim()) {
        let studentConsumed;
        try {
          studentConsumed = await consumeIdentityVerificationClientToken(
            studentInicisClientToken,
            {
              purpose: 'student_signup',
              expectedName: anchorName,
              expectedPhone: anchorPhone,
              expectedBirthDate: anchorBirthDate,
            },
            connection,
          );
          identityLinkIds.push(studentConsumed.id);
        } catch (tokenErr) {
          await connection.rollback();
          const { status, body } = identityTokenErrorResponse(tokenErr);
          return res.status(status).json(body);
        }

        try {
          await ensureInicisPhoneVerificationRecord(
            studentConsumed.phone || anchorPhone,
            connection,
          );
        } catch (phoneErr) {
          console.error('[signup/ensureInicisPhone]', phoneErr);
          await connection.rollback();
          return res.status(500).json({
            success: false,
            message: '전화번호 인증 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
            code: phoneErr?.code || 'PHONE_VERIFICATION_RECORD_FAILED',
          });
        }

        if (studentConsumed.name) signupName = studentConsumed.name;
        if (studentConsumed.phone) signupPhone = studentConsumed.phone;
        if (studentConsumed.birthDate) {
          signupBirthDate = normalizeBirthDateInput(studentConsumed.birthDate)
            || studentConsumed.birthDate;
        }
      }

      let studentIdManualVerification = null;
      if (!isCertificateSignup) {
        try {
          studentIdManualVerification = await consumeStudentIdManualVerificationToken(
            studentVerificationToken,
            {
              name: anchorName,
              birthDate: anchorBirthDate,
              schoolId: String(schoolId).trim(),
              phone: anchorPhone,
            },
            connection,
          );
        } catch (tokenErr) {
          await connection.rollback();
          const { status, body } = studentVerificationTokenErrorResponse(tokenErr);
          return res.status(status).json(body);
        }
      }

      const userPii = packUserPii({
        name: signupName,
        phone: signupPhone,
        birthDate: signupBirthDate,
      });

      const [result] = await connection.execute(
        `INSERT INTO users 
         (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number, graduation_year, color_id, phone_verified, student_verified) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          username,
          hashedPassword,
          ...userPiiInsertValues(userPii),
          resolvedSchoolId,
          resolvedGrade,
          resolvedClassNumber,
          resolvedGraduationYear,
          resolvedColorId,
          studentVerifiedOnInsert,
        ],
      );

      const userId = result.insertId;

      if (identityLinkIds.length > 0) {
        for (const ivId of identityLinkIds) {
          await connection.execute(
            `UPDATE identity_verifications SET linked_user_id = ? WHERE id = ?`,
            [userId, ivId],
          );
        }
      }

      const submissionPii = packSubmissionPii({
        name: signupName,
        phone: signupPhone,
        birthDate: signupBirthDate,
      });

      if (isCertificateSignup) {
        await connection.execute(
          `INSERT INTO signup_certificate_submissions
           (user_id, name_enc, phone_enc, phone_lookup, birth_date_enc,
            certificate_view_url, certificate_access_code, claimed_school_name, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            userId,
            submissionPii.name_enc,
            submissionPii.phone_enc,
            submissionPii.phone_lookup,
            submissionPii.birth_date_enc,
            certificateViewUrl.trim(),
            certificateAccessCode.trim(),
            claimedSchoolName?.trim() || null,
          ],
        );
      } else if (studentIdManualVerification) {
        await connection.execute(
          `INSERT INTO signup_student_id_submissions
           (user_id, name_enc, phone_enc, phone_lookup, birth_date_enc,
            school_id, cloudinary_url, cloudinary_public_id, status, submission_purpose, verification_jti)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'signup', ?)`,
          [
            userId,
            submissionPii.name_enc,
            submissionPii.phone_enc,
            submissionPii.phone_lookup,
            submissionPii.birth_date_enc,
            studentIdManualVerification.schoolId,
            studentIdManualVerification.cloudinaryUrl,
            studentIdManualVerification.cloudinaryPublicId,
            studentIdManualVerification.jti,
          ],
        );
      }

      await connection.execute(
        `INSERT INTO user_signup_consents
           (user_id, terms_of_service, data_collection, student_ocr, location, marketing_opt_in)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          Boolean(consents.termsOfService),
          Boolean(consents.dataCollection),
          Boolean(consents.studentOcr),
          Boolean(consents.location),
          Boolean(consents.marketingOptIn),
        ],
      );

      await connection.commit();

      res.status(201).json({ 
        success: true, 
        message: isCertificateSignup
          ? '회원가입이 완료되었습니다. 증명서 검수 후 학생 인증이 완료됩니다.'
          : '회원가입이 완료되었습니다. 학생증 검수 후 학생 인증이 완료됩니다.',
        data: {
          userId,
          colorId: resolvedColorId,
          studentVerified: studentVerifiedOnInsert,
          certificateReviewPending: isCertificateSignup,
          studentIdReviewPending: !isCertificateSignup,
        },
      });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('회원가입 오류:', error);
    
    // 중복 키 오류 처리
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 사용 중인 사용자명 또는 전화번호입니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '회원가입 중 오류가 발생했습니다.' 
    });
  }
});

// 학생 인증
router.post('/verify-student', authenticate, async (req, res) => {
  try {
    const { name, schoolId, grade, classNumber } = req.body;
    const userId = req.user.userId;

    if (!name || !schoolId || !grade || !classNumber) {
      return res.status(400).json({ 
        success: false, 
        message: '모든 필드를 입력해주세요.' 
      });
    }

    // 사용자 정보 확인
    const [users] = await pool.execute(
      'SELECT id, name_enc, school_id, grade, class_number FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = users[0];

    // 학생 정보 일치 확인 (실제로는 더 엄격한 검증 필요)
    if (user.name === name && 
        user.school_id === String(schoolId) && 
        user.grade === grade && 
        user.class_number === classNumber) {
      
      // 학생 인증 완료 처리
      await pool.execute(
        'UPDATE users SET student_verified = TRUE WHERE id = ?',
        [userId]
      );

      res.json({ 
        success: true, 
        message: '학생 인증이 완료되었습니다.' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: '입력한 정보가 일치하지 않습니다.' 
      });
    }
  } catch (error) {
    console.error('학생 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학생 인증 중 오류가 발생했습니다.' 
    });
  }
});

// 로그인
router.post('/login', validate(loginValidators), async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자명과 비밀번호를 입력해주세요.' 
      });
    }

    // 사용자 조회
    const [users] = await pool.execute(
      `SELECT id, username, password, name_enc, phone_enc, is_deleted, is_banned, is_suspended, suspended_until,
              token_version, reverification_status, reverification_deadline
       FROM users WHERE username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: '사용자명 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    const user = users[0];

    if (user.is_deleted) {
      return res.status(401).json({ 
        success: false, 
        message: '탈퇴한 사용자입니다.' 
      });
    }
    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: '영구 정지된 계정입니다.',
        code: 'ACCOUNT_BANNED',
      });
    }
    if (user.is_suspended) {
      const until = user.suspended_until ? new Date(user.suspended_until) : null;
      if (!until || until > new Date()) {
        return res.status(403).json({
          success: false,
          message: '임시 정지된 계정입니다.',
          code: 'ACCOUNT_SUSPENDED',
          suspendedUntil: user.suspended_until || null,
        });
      }
    }

    // 비밀번호 확인
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: '사용자명 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    const revCode = getReverificationBlockCode(user.reverification_status);
    if (revCode) {
      const messages = {
        GRADUATED_BLOCKED: '졸업생은 서비스를 이용할 수 없습니다.',
        ADULT_BLOCKED: '성인은 서비스를 이용할 수 없습니다.',
        REVERIFICATION_RESTRICTED: '재인증이 필요합니다. 학생증을 다시 제출해주세요.',
      };
      return res.status(403).json({
        success: false,
        message: messages[revCode] || '서비스 이용이 제한되었습니다.',
        code: revCode,
        reverificationStatus: user.reverification_status,
        reverificationDeadline: user.reverification_deadline || null,
      });
    }

    // 디바이스 정보
    const ipAddress = getClientIp(req);
    const deviceInfo = getDeviceInfo(req);
    const currentDeviceId = deviceId || `device_${user.id}_${Date.now()}`;

    // 기존 디바이스 확인
    const [existingDevices] = await pool.execute(
      `SELECT id, device_id, ip_address, device_info, last_login_at 
       FROM user_devices 
       WHERE user_id = ? AND device_id = ?`,
      [user.id, currentDeviceId]
    );

    let isNewDevice = existingDevices.length === 0;
    let needsVerification = false;

    if (isNewDevice) {
      // 다른 디바이스가 있는지 확인
      const [otherDevices] = await pool.execute(
        'SELECT id FROM user_devices WHERE user_id = ?',
        [user.id]
      );

      if (otherDevices.length > 0) {
        // 기존 디바이스와 IP 비교
        const [lastDevice] = await pool.execute(
          `SELECT ip_address FROM user_devices 
           WHERE user_id = ? 
           ORDER BY last_login_at DESC LIMIT 1`,
          [user.id]
        );

        if (lastDevice.length > 0 && lastDevice[0].ip_address !== ipAddress) {
          needsVerification = true; // IP 변경 감지
        }
      }
    }

    // 디바이스 정보 저장/업데이트
    if (isNewDevice) {
      await pool.execute(
        `INSERT INTO user_devices (user_id, device_id, device_info, ip_address, last_login_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [user.id, currentDeviceId, deviceInfo, ipAddress]
      );
    } else {
      await pool.execute(
        `UPDATE user_devices 
         SET device_info = ?, ip_address = ?, last_login_at = NOW() 
         WHERE user_id = ? AND device_id = ?`,
        [deviceInfo, ipAddress, user.id, currentDeviceId]
      );
    }

    // JWT 토큰 생성
    const tokenVersion = Number(user.token_version ?? 0);
    const token = createUserAccessToken({
      userId: user.id,
      username: user.username,
      tokenVersion,
    });

    const refreshToken = generateRefreshTokenPlain();
    await storeRefreshToken({
      userId: user.id,
      deviceId: currentDeviceId,
      plainToken: refreshToken,
      tokenVersion,
    });

    const verification = await getStudentVerificationStatus(user.id);
    const reverification = await getUserReverificationPayload(user.id);

    res.json({ 
      success: true, 
      message: '로그인 성공',
      data: {
        token,
        refreshToken,
        deviceId: currentDeviceId,
        user: {
          id: user.id,
          username: user.username,
          name: user.name
        },
        needsVerification,
        studentVerificationStatus: verification.status,
        rejectReason: verification.rejectReason,
        submissionPurpose: verification.submissionPurpose,
        reverificationSubmissionPending: verification.reverificationSubmissionPending,
        reverificationStatus: reverification?.reverificationStatus ?? 'none',
        reverificationDeadline: reverification?.reverificationDeadline ?? null,
        gradeException: reverification?.gradeException ?? false,
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그인 중 오류가 발생했습니다.' 
    });
  }
});

// 액세스 토큰 갱신 (Refresh Token rotation)
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken ?? '').trim();
    const deviceId = String(req.body?.deviceId ?? '').trim();

    if (!refreshToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken과 deviceId가 필요합니다.',
      });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = jwt.decode(authHeader.substring(7));
      const decodedId = Number(payload?.userId);
      if (Number.isFinite(decodedId) && decodedId > 0) userId = decodedId;
    }

    if (!userId) {
      const [deviceRows] = await pool.execute(
        'SELECT user_id FROM user_devices WHERE device_id = ? ORDER BY last_login_at DESC LIMIT 1',
        [deviceId],
      );
      userId = deviceRows[0]?.user_id ? Number(deviceRows[0].user_id) : null;
    }

    if (!userId) {
      const hintedUserId = Number(req.body?.userId);
      if (Number.isFinite(hintedUserId) && hintedUserId > 0) {
        userId = hintedUserId;
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 디바이스입니다.',
        code: API_ERROR_CODES.INVALID_TOKEN,
      });
    }

    const [users] = await pool.execute(
      `SELECT id, username, is_deleted, is_banned, is_suspended, suspended_until,
              token_version, reverification_status, reverification_deadline
       FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    if (!users.length || users[0].is_deleted) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자입니다.',
      });
    }

    const user = users[0];
    const tokenVersion = Number(user.token_version ?? 0);

    const consumed = await consumeRefreshToken({
      userId,
      deviceId,
      plainToken: refreshToken,
    });
    if (!consumed) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 refresh 토큰입니다.',
        code: API_ERROR_CODES.INVALID_TOKEN,
      });
    }

    if (tokenVersion !== consumed.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: '세션이 만료되었습니다.',
        code: API_ERROR_CODES.SESSION_REVOKED,
      });
    }

    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: '영구 정지된 계정입니다.',
        code: API_ERROR_CODES.ACCOUNT_BANNED,
      });
    }
    if (user.is_suspended) {
      const until = user.suspended_until ? new Date(user.suspended_until) : null;
      if (!until || until > new Date()) {
        return res.status(403).json({
          success: false,
          message: '임시 정지된 계정입니다.',
          code: API_ERROR_CODES.ACCOUNT_SUSPENDED,
        });
      }
    }

    const revCode = getReverificationBlockCode(user.reverification_status);
    if (revCode) {
      return res.status(403).json({
        success: false,
        code: revCode,
        message: '서비스 이용이 제한되었습니다.',
      });
    }

    const newAccess = createUserAccessToken({
      userId: user.id,
      username: user.username,
      tokenVersion,
    });
    const newRefresh = generateRefreshTokenPlain();
    await storeRefreshToken({
      userId: user.id,
      deviceId,
      plainToken: newRefresh,
      tokenVersion,
    });

    return res.json({
      success: true,
      data: {
        token: newAccess,
        refreshToken: newRefresh,
        deviceId,
      },
    });
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    return res.status(500).json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.',
    });
  }
});

// 로그아웃
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const deviceId = req.body?.deviceId ?? req.body?.device_id;
    const token = req.body?.token ?? req.body?.fcmToken;

    if (deviceId) {
      await pool.execute(
        'DELETE FROM user_devices WHERE user_id = ? AND device_id = ?',
        [userId, deviceId],
      );
      await revokeRefreshToken(userId, deviceId);
    }

    await deactivateFcmTokenForSession({
      userId,
      deviceId,
      token,
    });

    res.json({
      success: true,
      message: '로그아웃되었습니다.',
    });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그아웃 중 오류가 발생했습니다.' 
    });
  }
});

// 회원가입 중 학생증 촬영 → Cloudinary 업로드 (관리자 수동 검수, OCR 미사용)
router.post('/signup/upload-student-id', signupOcrLimiter, async (req, res) => {
  try {
    const { name, birthDate, imageBase64, cropRegion, phone: rawPhone, schoolId } =
      req.body || {};

    if (!name || !birthDate || !imageBase64) {
      return res.status(400).json({
        success: false,
        message: '이름, 생년월일, 학생증 이미지가 필요합니다.',
      });
    }

    const trimmedSchoolId = schoolId ? String(schoolId).trim() : '';
    if (!trimmedSchoolId) {
      return res.status(400).json({
        success: false,
        message: '재학 중인 학교를 먼저 선택해 주세요.',
      });
    }

    const [schoolRows] = await pool.execute(
      'SELECT school_id FROM schools WHERE school_id = ? LIMIT 1',
      [trimmedSchoolId],
    );
    if (!schoolRows.length) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 학교 정보입니다.',
      });
    }

    let uploaded;
    try {
      uploaded = await uploadSignupStudentIdPhoto({ imageBase64, cropRegion });
    } catch (uploadErr) {
      console.error('[signup/upload-student-id] Cloudinary 오류:', uploadErr);
      return res.status(500).json({
        success: false,
        message: '학생증 이미지 업로드에 실패했습니다. 다시 촬영해 주세요.',
      });
    }

    const normalizedPhone = rawPhone ? normalizeLocalKrPhone(rawPhone) : null;
    const normalizedBirthDate = normalizeBirthDateInput(birthDate) || birthDate;
    const expectedLevel = inferExpectedSchoolLevel(normalizedBirthDate);
    const suggestedGrade = inferGradeFromBirthDate(normalizedBirthDate, expectedLevel);
    const suggestedGraduationYear = inferGraduationYear(
      normalizedBirthDate,
      expectedLevel,
      suggestedGrade,
    );

    const studentVerificationToken = await issueStudentIdManualVerificationToken({
      name: String(name).trim(),
      birthDate: normalizedBirthDate,
      phone: normalizedPhone,
      schoolId: trimmedSchoolId,
      cloudinaryUrl: uploaded.cloudinaryUrl,
      cloudinaryPublicId: uploaded.cloudinaryPublicId,
    });

    return res.json({
      success: true,
      data: {
        passed: true,
        manualReview: true,
        cloudinaryUrl: uploaded.cloudinaryUrl,
        studentVerificationToken,
        suggestedGrade,
        suggestedGraduationYear,
        suggestedClassNumber: 1,
        expectedLevel,
      },
    });
  } catch (error) {
    console.error('[signup/upload-student-id] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생증 제출 중 오류가 발생했습니다.',
    });
  }
});

/** 거절된 사용자 — 학생증 재제출 (로그인 후) */
router.post('/resubmit-student-id', authenticate, signupOcrLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imageBase64, cropRegion, schoolId: bodySchoolId } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: '학생증 이미지가 필요합니다.',
      });
    }

    const verification = await getStudentVerificationStatus(userId);
    const reverification = await getUserReverificationPayload(userId);
    const revStatus = reverification?.reverificationStatus ?? 'none';
    const isReverificationResubmit = ['grace', 'required', 'restricted'].includes(
      revStatus,
    );

    if (verification.status === 'APPROVED' && !isReverificationResubmit) {
      return res.status(400).json({
        success: false,
        message: '이미 학생 인증이 완료된 계정입니다.',
      });
    }
    if (!isReverificationResubmit && verification.status !== 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: '재제출은 거절된 경우에만 가능합니다.',
      });
    }
    if (isReverificationResubmit && verification.reverificationSubmissionPending) {
      return res.status(400).json({
        success: false,
        message: '이미 제출된 학생증이 검수 대기 중입니다.',
      });
    }
    if (!isReverificationResubmit && verification.status === 'PENDING') {
      return res.status(400).json({
        success: false,
        message: '이미 제출된 학생증이 검수 대기 중입니다.',
      });
    }

    const [userRows] = await pool.execute(
      `SELECT id, name_enc, phone_enc, birth_date_enc, school_id FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    const user = userRows[0];

    const submissionPurpose = isReverificationResubmit ? 'reverification' : 'resubmit';
    const targetSchoolId = String(bodySchoolId || user.school_id || '').trim();
    if (!targetSchoolId) {
      return res.status(400).json({
        success: false,
        message: '재학 학교를 선택해 주세요.',
      });
    }

    const [schoolRows] = await pool.execute(
      'SELECT school_id FROM schools WHERE school_id = ? LIMIT 1',
      [targetSchoolId],
    );
    if (!schoolRows.length) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 학교입니다.',
      });
    }

    const previousSchoolId = user.school_id || null;

    let uploaded;
    try {
      uploaded = await uploadSignupStudentIdPhoto({ imageBase64, cropRegion });
    } catch (uploadErr) {
      console.error('[resubmit-student-id] Cloudinary 오류:', uploadErr);
      return res.status(500).json({
        success: false,
        message: '학생증 이미지 업로드에 실패했습니다.',
      });
    }

    const resubmitPii = packSubmissionPii({
      name: user.name,
      phone: user.phone,
      birthDate: user.birth_date,
    });

    await pool.execute(
      `INSERT INTO signup_student_id_submissions
         (user_id, name_enc, phone_enc, phone_lookup, birth_date_enc,
          school_id, previous_school_id, cloudinary_url, cloudinary_public_id, status, submission_purpose)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        userId,
        resubmitPii.name_enc,
        resubmitPii.phone_enc,
        resubmitPii.phone_lookup,
        resubmitPii.birth_date_enc,
        targetSchoolId,
        previousSchoolId,
        uploaded.cloudinaryUrl,
        uploaded.cloudinaryPublicId,
        submissionPurpose,
      ],
    );

    if (isReverificationResubmit) {
      return res.json({
        success: true,
        message: '학생증 재인증이 제출되었습니다. 검수가 완료될 때까지 앱을 이용할 수 있습니다.',
        data: {
          studentVerificationStatus: 'APPROVED',
          rejectReason: null,
          submissionPurpose: 'reverification',
          reverificationSubmissionPending: true,
        },
      });
    }

    return res.json({
      success: true,
      message: '학생증이 재제출되었습니다. 관리자 승인을 기다려 주세요.',
      data: {
        studentVerificationStatus: 'PENDING',
        rejectReason: null,
        submissionPurpose: 'resubmit',
        reverificationSubmissionPending: false,
      },
    });
  } catch (error) {
    console.error('[resubmit-student-id] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생증 재제출 중 오류가 발생했습니다.',
    });
  }
});

/*
 * ── [보관] CLOVA OCR 자동 검증 — 수동 검수 전환으로 비활성화 ──
 * 재활성화 시 studentIdOcr.service.js import 및 아래 로직 복구
 *
router.post('/signup/verify-student-id', signupOcrLimiter, async (req, res) => {
  // extractTextFromImageBase64 → verifyStudentIdOcrForSignup → issueStudentOcrVerificationToken
});
 */

// OCR 학생증 인증
router.post('/ocr', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imageUrl, ocrData } = req.body;

    if (!imageUrl && !ocrData) {
      return res.status(400).json({ 
        success: false, 
        message: '이미지 URL 또는 OCR 데이터를 제공해주세요.' 
      });
    }

    // 실제로는 OCR 서비스(구글, 네이버)를 호출하여 학생증 정보 추출
    // 여기서는 클라이언트에서 이미 OCR을 수행한 데이터를 받는다고 가정
    // OCR 데이터 구조: { name, school, grade, classNumber, studentId 등 }

    // 사용자 정보 조회
    const [users] = await pool.execute(
      'SELECT id, name_enc, school_id, grade, class_number FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = users[0];

    // OCR 데이터와 사용자 정보 일치 확인
    // 실제로는 OCR 추출 데이터를 파싱하여 검증
    let isVerified = false;
    if (ocrData) {
      // OCR에서 추출한 정보와 사용자 정보 비교 (실제 구현은 OCR 데이터 구조에 맞게)
      // 예: ocrData.name === user.name && ocrData.school === user.school_id 등
      // 여기서는 간단하게 처리
      isVerified = true; // 실제로는 더 엄격한 검증 필요
    }

    // OCR 인증 기록 저장
    const [result] = await pool.execute(
      `INSERT INTO ocr_verifications (user_id, image_url, extracted_data, is_verified) 
       VALUES (?, ?, ?, ?)`,
      [userId, imageUrl || null, JSON.stringify(ocrData || {}), isVerified]
    );

    if (isVerified) {
      // 학생 인증 완료 처리
      await pool.execute(
        'UPDATE users SET student_verified = TRUE WHERE id = ?',
        [userId]
      );
    }

    res.json({ 
      success: true, 
      message: isVerified ? 'OCR 인증이 완료되었습니다.' : 'OCR 인증이 완료되었으나 검증 대기 중입니다.',
      data: {
        ocrVerificationId: result.insertId,
        isVerified
      }
    });
  } catch (error) {
    console.error('OCR 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OCR 인증 중 오류가 발생했습니다.' 
    });
  }
});

// 보호자 인증 Mock (PASS 미연동, dev/staging)
router.post('/guardian/mock-verify', async (req, res) => {
  const mockEnabled =
    !isProductionEnv() ||
    String(process.env.GUARDIAN_MOCK_ENABLED || '').toLowerCase() === 'true';

  if (!mockEnabled) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const phone = normalizeLocalKrPhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '보호자 전화번호를 입력해주세요.',
      });
    }

    const phonePacked = packPhoneOnly(phone);

    const [result] = await pool.execute(
      `INSERT INTO guardian_verifications (guardian_phone_enc, guardian_phone_lookup, status, verified_at, mock)
       VALUES (?, ?, 'verified', NOW(), TRUE)`,
      [phonePacked.phone_enc, phonePacked.phone_lookup],
    );

    return res.json({
      success: true,
      verified: true,
      verificationId: result.insertId,
    });
  } catch (error) {
    console.error('보호자 Mock 인증 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 인증 처리 중 오류가 발생했습니다.',
    });
  }
});

export default router;
