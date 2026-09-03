import pool from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import {
  inferExpectedSchoolLevel,
  inferGradeFromBirthDate,
  pickRandomProfileColorId,
  computeAge,
} from '../utils/signupEnrollment.js';
import {
  validatePassword,
  validatePhone,
  validateUsername,
} from '../utils/validation.js';
import {
  normalizeBirthDateInput,
  packUserPii,
  phoneLookupBindParams,
  phoneLookupWhereClause,
  userPiiInsertValues,
  USER_PII_INSERT_COLUMNS,
} from './userPii.service.js';
import { normalizeLocalKrPhone } from '../utils/phone.js';

function validateStudentBirthDate(birthDate) {
  const normalized = normalizeBirthDateInput(birthDate);
  if (!normalized) return false;
  const age = computeAge(normalized);
  return age != null && age >= 10 && age <= 25;
}

export function normalizeManualSignupInput(raw) {
  const username = String(raw?.username || '').trim();
  const password = String(raw?.password || '');
  const name = String(raw?.name || '').trim();
  const phone = normalizeLocalKrPhone(raw?.phone);
  const birthDate = normalizeBirthDateInput(raw?.birthDate) || '';
  const schoolId = String(raw?.schoolId || '').trim();
  const grade = Number(raw?.grade);
  const classNumber = Number(raw?.classNumber);
  const colorId = Number(raw?.colorId) || pickRandomProfileColorId();
  const studentVerified = raw?.studentVerified !== false;
  const adminNote = String(raw?.adminNote || '').trim();

  const expectedLevel = inferExpectedSchoolLevel(birthDate);
  let resolvedGrade = grade;
  if (!Number.isFinite(resolvedGrade) || resolvedGrade < 1) {
    resolvedGrade = inferGradeFromBirthDate(birthDate, expectedLevel) || 1;
  }
  const resolvedClassNumber = Number.isFinite(classNumber) && classNumber >= 1
    ? classNumber
    : 1;

  return {
    username,
    password,
    name,
    phone,
    birthDate,
    schoolId,
    grade: resolvedGrade,
    classNumber: resolvedClassNumber,
    colorId,
    studentVerified,
    adminNote,
  };
}

export function validateManualSignupInput(input) {
  const errors = [];

  if (!input.username || !validateUsername(input.username)) {
    errors.push('아이디는 영문·숫자·밑줄 3~20자여야 합니다.');
  }
  if (!input.password || !validatePassword(input.password)) {
    errors.push('비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.');
  }
  if (!input.name) {
    errors.push('이름을 입력해 주세요.');
  }
  if (!input.phone || !validatePhone(input.phone)) {
    errors.push('올바른 휴대폰 번호를 입력해 주세요.');
  }
  if (!validateStudentBirthDate(input.birthDate)) {
    errors.push('생년월일(YYYY-MM-DD)을 확인해 주세요. (만 10~25세)');
  }
  if (!input.schoolId) {
    errors.push('학교를 선택해 주세요.');
  }
  if (!Number.isFinite(input.grade) || input.grade < 1 || input.grade > 6) {
    errors.push('학년을 선택해 주세요.');
  }
  if (!Number.isFinite(input.classNumber) || input.classNumber < 1 || input.classNumber > 50) {
    errors.push('반 번호를 입력해 주세요.');
  }
  if (!Number.isFinite(input.colorId) || input.colorId < 1 || input.colorId > 4) {
    errors.push('프로필 색상을 선택해 주세요.');
  }
  if (!input.adminNote || input.adminNote.length < 4) {
    errors.push('생성 사유를 4자 이상 입력해 주세요.');
  }

  return errors;
}

/**
 * 관리자 수동 회원 생성 (앱 가입과 동일 users 스키마·bcrypt·PII 암호화)
 */
export async function createManualUserAccount(rawInput, { adminUserId, connection: extConn } = {}) {
  const input = normalizeManualSignupInput(rawInput);
  const validationErrors = validateManualSignupInput(input);
  if (validationErrors.length > 0) {
    const err = new Error(validationErrors[0]);
    err.code = 'MANUAL_SIGNUP_VALIDATION';
    err.details = validationErrors;
    throw err;
  }

  const connection = extConn || (await pool.getConnection());
  const ownConnection = !extConn;

  try {
    if (ownConnection) await connection.beginTransaction();

    const [schoolRows] = await connection.execute(
      'SELECT school_id FROM schools WHERE school_id = ? LIMIT 1',
      [input.schoolId],
    );
    if (!schoolRows.length) {
      const err = new Error('선택한 학교를 찾을 수 없습니다.');
      err.code = 'SCHOOL_NOT_FOUND';
      throw err;
    }

    const [colorRows] = await connection.execute(
      'SELECT id FROM colors WHERE id = ? LIMIT 1',
      [input.colorId],
    );
    if (!colorRows.length) {
      const err = new Error('유효하지 않은 프로필 색상입니다.');
      err.code = 'INVALID_COLOR';
      throw err;
    }

    const [existingUsers] = await connection.execute(
      `SELECT id FROM users WHERE username = ? OR ${phoneLookupWhereClause()}`,
      [input.username, ...phoneLookupBindParams(input.phone)],
    );
    if (existingUsers.length > 0) {
      const err = new Error('이미 사용 중인 아이디 또는 전화번호입니다.');
      err.code = 'DUPLICATE_USER';
      throw err;
    }

    const hashedPassword = await hashPassword(input.password);
    const userPii = packUserPii({
      name: input.name,
      phone: input.phone,
      birthDate: input.birthDate,
    });

    const [result] = await connection.execute(
      `INSERT INTO users
         (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number,
          is_graduated, color_id, phone_verified, student_verified,
          reverification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, TRUE, ?, 'none')`,
      [
        input.username,
        hashedPassword,
        ...userPiiInsertValues(userPii),
        input.schoolId,
        input.grade,
        input.classNumber,
        input.colorId,
        input.studentVerified,
      ],
    );

    const userId = result.insertId;

    await connection.execute('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);

    await connection.execute(
      `INSERT INTO user_signup_consents
         (user_id, terms_of_service, data_collection, student_ocr, location, marketing_opt_in)
       VALUES (?, TRUE, TRUE, TRUE, TRUE, FALSE)`,
      [userId],
    );

    if (ownConnection) await connection.commit();

    return {
      userId,
      username: input.username,
      schoolId: input.schoolId,
      grade: input.grade,
      classNumber: input.classNumber,
      colorId: input.colorId,
      phoneVerified: true,
      studentVerified: input.studentVerified,
      adminNote: input.adminNote,
      adminUserId,
    };
  } catch (error) {
    if (ownConnection) await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      const err = new Error('이미 사용 중인 아이디 또는 전화번호입니다.');
      err.code = 'DUPLICATE_USER';
      throw err;
    }
    throw error;
  } finally {
    if (ownConnection) connection.release();
  }
}
