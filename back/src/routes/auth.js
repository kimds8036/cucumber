import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { deactivateFcmTokenForSession } from '../utils/pushTokens.js';
import { 
  generateVerificationCode, 
  hashPassword, 
  comparePassword, 
  generateToken,
  getClientIp,
  getDeviceInfo
} from '../utils/auth.js';
import { validatePhone, validateUsername, validatePassword, validateBirthDate } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  extractTextFromImageBase64,
  verifyStudentIdOcrForSignup,
} from '../services/studentIdOcr.service.js';
import {
  inferExpectedSchoolLevel,
  inferGradeFromBirthDate,
  inferGraduationYear,
  pickRandomProfileColorId,
} from '../utils/signupEnrollment.js';
import { verifyFirebaseIdToken } from '../config/firebase.js';
import {
  normalizeLocalKrPhone,
  SQL_PHONE_NORM,
} from '../utils/phone.js';
import {
  signupOcrLimiter,
  signupPhoneBackendLimiter,
} from '../middleware/signupRateLimit.js';
import {
  issueStudentOcrVerificationToken,
  consumeStudentOcrVerificationToken,
} from '../services/signupVerificationToken.service.js';

const router = express.Router();

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
    console.log('[API][GET /api/auth/me] 요청 수신:', { userId });

    const [rows] = await pool.execute(
      `SELECT 
         u.id,
         u.username,
         u.name,
         u.color_id,
         u.school_id,
         u.grade,
         u.class_number,
         u.color_id,
         c.hex_code AS profile_color_hex,
         c.color_number AS profile_color_number,
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
    console.log('[API][GET /api/auth/me] 사용자 기준 정보:', {
      userId: user.id,
      colorId: user.color_id,
      schoolId: user.school_id,
      schoolName: user.school_name,
      grade: user.grade,
      classNumber: user.class_number,
      colorId: user.color_id,
      profileColorHex: user.profile_color_hex,
    });

    const [friendRows] = await pool.execute(
      `SELECT COUNT(*) as cnt
       FROM user_friendships
       WHERE status = 'accepted'
         AND (requester_id = ? OR addressee_id = ?)`,
      [userId, userId],
    );

    const friendCount = Number(friendRows[0]?.cnt ?? 0);

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
      },
    });
    console.log('[API][GET /api/auth/me] 응답 완료:', {
      userId: user.id,
      friendCount,
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

    // 기존 인증 코드가 있으면 삭제 (같은 전화번호로 여러 번 요청 방지)
    await pool.execute(
      'DELETE FROM phone_verifications WHERE phone = ? AND is_verified = FALSE',
      [phone]
    );

    // 새 인증 코드 저장
    await pool.execute(
      `INSERT INTO phone_verifications (phone, verification_code, expires_at) 
       VALUES (?, ?, ?)`,
      [phone, verificationCode, expiresAt]
    );

    // 실제로는 SMS 발송 서비스 연동 (예: 알리고, 카카오톡 등)
    // 여기서는 개발용으로 코드를 반환
    console.log(`[개발용] ${phone}로 인증 코드 발송: ${verificationCode}`);

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
       WHERE phone = ? AND verification_code = ? AND is_verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [phone, verificationCode]
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
      `SELECT id FROM users WHERE ${SQL_PHONE_NORM} = ? LIMIT 1`,
      [phone],
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

    await pool.execute(
      'DELETE FROM phone_verifications WHERE phone = ? AND is_verified = FALSE',
      [phone],
    );

    await pool.execute(
      `INSERT INTO phone_verifications (phone, verification_code, expires_at, is_verified)
       VALUES (?, ?, ?, TRUE)`,
      [phone, 'FB0000', expiresAt],
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

// 회원가입
router.post('/signup', validate(signupValidators), async (req, res) => {
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
      consents: rawConsents,
    } = req.body;

    const phone = normalizeLocalKrPhone(rawPhone);
    const isCertificateSignup = verificationMethod === 'certificate';
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
        message: '학생증 인증으로 학교를 확인해 주세요.',
      });
    }

    const consents = rawConsents && typeof rawConsents === 'object' ? rawConsents : {};
    const requiredConsentOk =
      consents.termsOfService === true &&
      consents.dataCollection === true &&
      consents.studentOcr === true &&
      consents.location === true;
    if (!requiredConsentOk) {
      return res.status(400).json({
        success: false,
        message: '필수 약관 동의가 완료되지 않았습니다.',
      });
    }

    if (!isCertificateSignup) {
      try {
        await consumeStudentOcrVerificationToken(studentVerificationToken, {
          name: String(name).trim(),
          birthDate,
          schoolId: String(schoolId).trim(),
          phone,
        });
      } catch (tokenErr) {
        const code = tokenErr?.code || 'INVALID_STUDENT_VERIFICATION_TOKEN';
        const messages = {
          STUDENT_VERIFICATION_TOKEN_REQUIRED:
            '학생증 인증을 먼저 완료해 주세요.',
          INVALID_STUDENT_VERIFICATION_TOKEN:
            '학생증 인증이 만료되었거나 유효하지 않습니다. 다시 촬영해 주세요.',
          STUDENT_VERIFICATION_TOKEN_USED:
            '이미 사용된 학생증 인증입니다. 다시 촬영해 주세요.',
          STUDENT_VERIFICATION_TOKEN_EXPIRED:
            '학생증 인증이 만료되었습니다. 다시 촬영해 주세요.',
          STUDENT_VERIFICATION_MISMATCH:
            '제출 정보가 학생증 인증 결과와 일치하지 않습니다.',
          STUDENT_VERIFICATION_PHONE_MISMATCH:
            '전화번호가 학생증 인증 시점과 일치하지 않습니다.',
          INVALID_SCHOOL_ID: '유효하지 않은 학교 정보입니다.',
        };
        return res.status(400).json({
          success: false,
          message: messages[code] || '학생증 인증 검증에 실패했습니다.',
          code,
        });
      }
    }

    const resolvedColorId = Number(rawColorId) || pickRandomProfileColorId();

    const expectedLevel = inferExpectedSchoolLevel(birthDate);
    let resolvedGrade = Number(grade);
    let resolvedGraduationYear = Number(graduationYear);
    if (!Number.isFinite(resolvedGrade) || resolvedGrade < 1) {
      resolvedGrade = inferGradeFromBirthDate(birthDate, expectedLevel) || 1;
    }
    if (!Number.isFinite(resolvedGraduationYear)) {
      resolvedGraduationYear =
        inferGraduationYear(birthDate, expectedLevel, resolvedGrade) ||
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

    if (!validateBirthDate(birthDate)) {
      return res.status(400).json({ 
        success: false, 
        message: '올바른 생년월일이 아닙니다.' 
      });
    }

    // 전화번호 인증 확인
    const [verifiedCodes] = await pool.execute(
      `SELECT id FROM phone_verifications 
       WHERE phone = ? AND is_verified = TRUE 
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );

    if (verifiedCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '전화번호 인증이 완료되지 않았습니다.' 
      });
    }

    // 중복 확인
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR ${SQL_PHONE_NORM} = ?`,
      [username, phone],
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

    // student_verified: 학생증 OCR 가입은 즉시 TRUE.
    // 등교·학적 검증 등 운영 로직에서 FALSE 로 내릴 수 있음 (users.student_verified).
    // 증명서 가입은 관리자 검수 승인 전까지 FALSE.
    const studentVerifiedOnInsert = !isCertificateSignup;

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO users 
         (username, password, name, phone, birth_date, school_id, grade, class_number, graduation_year, color_id, phone_verified, student_verified) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          username,
          hashedPassword,
          name,
          phone,
          birthDate,
          resolvedSchoolId,
          resolvedGrade,
          resolvedClassNumber,
          resolvedGraduationYear,
          resolvedColorId,
          studentVerifiedOnInsert,
        ],
      );

      const userId = result.insertId;

      if (isCertificateSignup) {
        await connection.execute(
          `INSERT INTO signup_certificate_submissions
           (user_id, name, phone, birth_date, certificate_view_url, certificate_access_code, claimed_school_name, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            userId,
            name,
            phone,
            birthDate,
            certificateViewUrl.trim(),
            certificateAccessCode.trim(),
            claimedSchoolName?.trim() || null,
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
          : '회원가입이 완료되었습니다.',
        data: {
          userId,
          colorId: resolvedColorId,
          studentVerified: studentVerifiedOnInsert,
          certificateReviewPending: isCertificateSignup,
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
      'SELECT id, name, school_id, grade, class_number FROM users WHERE id = ?',
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
      `SELECT id, username, password, name, phone, is_deleted, is_banned, is_suspended, suspended_until
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
    const token = generateToken({ 
      userId: user.id, 
      username: user.username 
    });

    console.log('[API][POST /api/auth/login] 로그인 성공 토큰 발급', {
      userId: user.id,
      username: user.username,
      deviceId: currentDeviceId,
      token,
    });

    res.json({ 
      success: true, 
      message: '로그인 성공',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name
        },
        needsVerification // 새 디바이스/IP 변경 시 추가 인증 필요
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

// 회원가입 중 학생증 CLOVA OCR 3중 검증 (비로그인)
router.post('/signup/verify-student-id', signupOcrLimiter, async (req, res) => {
  try {
    const { name, birthDate, imageBase64, cropRegion, phone: rawPhone } =
      req.body || {};

    if (!name || !birthDate || !imageBase64) {
      return res.status(400).json({
        success: false,
        message: '이름, 생년월일, 학생증 이미지가 필요합니다.',
      });
    }

    let ocrText = '';
    try {
      ocrText = await extractTextFromImageBase64(imageBase64, cropRegion);
    } catch (ocrErr) {
      console.error('CLOVA OCR 오류:', ocrErr);
      return res.status(500).json({
        success: false,
        message: '학생증 이미지 인식에 실패했습니다. 다시 촬영해 주세요.',
      });
    }

    if (!String(ocrText || '').trim()) {
      return res.json({
        success: true,
        data: {
          passed: false,
          reasons: ['학생증에서 텍스트를 읽을 수 없습니다. 밝은 곳에서 다시 촬영해 주세요.'],
          school: null,
        },
      });
    }

    const verification = await verifyStudentIdOcrForSignup({
      ocrText,
      verifiedName: name,
      birthDate,
    });

    const ocrDebug =
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_OCR_DEBUG === 'true';
    if (ocrDebug) {
      console.log('[verify-student-id] OCR raw (first 800 chars):', String(ocrText || '').slice(0, 800));
      console.log('[verify-student-id] checks:', {
        passed: verification.passed,
        nameOk: verification.nameOk,
        levelOk: verification.levelOk,
        schoolOk: verification.schoolOk,
        expectedLevel: verification.expectedLevel,
        detectedLevel: verification.detectedLevel,
        school: verification.school,
        reasons: verification.reasons,
      });
    }

    const expectedLevel = verification.expectedLevel;
    const suggestedGrade = inferGradeFromBirthDate(birthDate, expectedLevel);
    const suggestedGraduationYear = inferGraduationYear(
      birthDate,
      expectedLevel,
      suggestedGrade,
    );

    let studentVerificationToken = null;
    if (verification.passed && verification.school?.id) {
      const normalizedPhone = rawPhone
        ? normalizeLocalKrPhone(rawPhone)
        : null;
      studentVerificationToken = await issueStudentOcrVerificationToken({
        name: String(name).trim(),
        birthDate,
        schoolId: verification.school.id,
        phone: normalizedPhone,
      });
    }

    return res.json({
      success: true,
      data: {
        passed: verification.passed,
        reasons: verification.reasons,
        nameOk: verification.nameOk,
        levelOk: verification.levelOk,
        schoolOk: verification.schoolOk,
        expectedLevel: verification.expectedLevel,
        detectedLevel: verification.detectedLevel,
        school: verification.school,
        suggestedGrade,
        suggestedGraduationYear,
        suggestedClassNumber: 1,
        studentVerificationToken,
        ...(ocrDebug && {
          ocrTextPreview: verification.ocrTextPreview,
        }),
      },
    });
  } catch (error) {
    console.error('학생증 가입 검증 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생증 검증 중 오류가 발생했습니다.',
    });
  }
});

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
      'SELECT id, name, school_id, grade, class_number FROM users WHERE id = ?',
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

export default router;
