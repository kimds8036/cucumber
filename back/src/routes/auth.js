import express from 'express';
import pool from '../config/database.js';
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

const router = express.Router();

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
         u.school_id,
         u.grade,
         u.class_number,
         s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
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
      schoolId: user.school_id,
      schoolName: user.school_name,
      grade: user.grade,
      classNumber: user.class_number,
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
        school: {
          id: user.school_id,
          name: user.school_name,
        },
        grade: user.grade,
        classNumber: user.class_number,
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
router.patch('/me/username', authenticate, async (req, res) => {
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
router.patch('/me/password', authenticate, async (req, res) => {
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
    const { phone } = req.body;

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
    const { phone, verificationCode } = req.body;

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

// 회원가입
router.post('/signup', async (req, res) => {
  try {
    const { 
      username, 
      password, 
      name, 
      phone, 
      birthDate, 
      schoolId, 
      grade, 
      classNumber, 
      graduationYear, 
      colorId 
    } = req.body;

    // 필수 필드 검증
    if (!username || !password || !name || !phone || !birthDate || 
        !schoolId || !grade || !classNumber || !graduationYear || !colorId) {
      return res.status(400).json({ 
        success: false, 
        message: '모든 필드를 입력해주세요.' 
      });
    }

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
      'SELECT id FROM users WHERE username = ? OR phone = ?',
      [username, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 사용 중인 사용자명 또는 전화번호입니다.' 
      });
    }

    // 컬러 ID 유효성 확인
    const [colors] = await pool.execute('SELECT id FROM colors WHERE id = ?', [colorId]);
    if (colors.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 컬러 ID입니다.' 
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    // 사용자 생성
    const [result] = await pool.execute(
      `INSERT INTO users 
       (username, password, name, phone, birth_date, school_id, grade, class_number, graduation_year, color_id, phone_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [username, hashedPassword, name, phone, birthDate, schoolId, grade, classNumber, graduationYear, colorId]
    );

    res.status(201).json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      data: { userId: result.insertId }
    });
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
router.post('/login', async (req, res) => {
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
      `SELECT id, username, password, name, phone, is_deleted 
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
    const deviceId = req.body.deviceId;

    // 디바이스 삭제 (선택사항 - 보안이 중요한 경우)
    if (deviceId) {
      await pool.execute(
        'DELETE FROM user_devices WHERE user_id = ? AND device_id = ?',
        [userId, deviceId]
      );
    }

    res.json({ 
      success: true, 
      message: '로그아웃되었습니다.' 
    });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그아웃 중 오류가 발생했습니다.' 
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
