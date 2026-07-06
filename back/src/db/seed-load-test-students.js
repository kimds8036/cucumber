/**
 * load-test 전용 가짜 학생 100명 upsert (test_student_1 … test_student_100)
 *
 * 사용법:
 *   cd back && npm run seed:load-test-students
 *   cd back && npm run seed:load-test-students -- --target=develop --reset-attendance
 *
 * 기존 yp_dev_mid1_8k3x 등과 username 접두사가 달라 데이터가 겹치지 않습니다.
 */

import bcrypt from 'bcrypt';
import { getBcryptSaltRounds } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';
import { packUserPii, userPiiInsertValues, USER_PII_INSERT_COLUMNS } from '../services/userPii.service.js';
import { formatKstDateYmd, getKstNow } from '../services/reverification.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOAD_TEST_COUNT = Number(process.env.LOAD_TEST_COUNT) || 100;
const USERNAME_PREFIX = 'test_student_';
/** load-test / k6 와 동일 — 로컬 전용 */
export const LOAD_TEST_PASSWORD = 'LoadTest100!@#';

function parseArgs(argv = process.argv.slice(2)) {
  const { targets } = parseMigrateCliArgs(argv);
  return {
    targets,
    resetAttendance: argv.includes('--reset-attendance'),
  };
}

function usernameForIndex(i) {
  return `${USERNAME_PREFIX}${i}`;
}

function phoneForIndex(i) {
  const suffix = String(i).padStart(4, '0');
  return `010-9001-${suffix}`;
}

function birthDateForIndex(i) {
  const year = 2012 + (i % 3);
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function pickSchoolWithCoords(connection) {
  const [rows] = await connection.execute(
    `SELECT school_id, name, latitude, longitude
     FROM schools
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
     ORDER BY school_id
     LIMIT 1`,
  );
  if (!rows.length) {
    throw new Error(
      '좌표가 있는 학교가 없습니다. seed:schools 후 schools.latitude/longitude를 확인하세요.',
    );
  }
  return rows[0];
}

async function upsertLoadTestStudent(connection, { index, schoolId, hashedPassword }) {
  const username = usernameForIndex(index);
  const pii = packUserPii({
    name: `부하테스트${index}`,
    phone: phoneForIndex(index),
    birthDate: birthDateForIndex(index),
  });
  const grade = (index % 3) + 1;
  const classNumber = (index % 10) + 1;
  const graduationYear = 2028 + (index % 3);

  const [existing] = await connection.execute(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [username],
  );

  if (existing.length > 0) {
    const userId = existing[0].id;
    await connection.execute(
      `UPDATE users SET
         password = ?,
         name_enc = ?,
         name_lookup = ?,
         phone_enc = ?,
         phone_lookup = ?,
         birth_date_enc = ?,
         name = NULL,
         phone = NULL,
         birth_date = NULL,
         school_id = ?,
         grade = ?,
         class_number = ?,
         graduation_year = ?,
         is_graduated = FALSE,
         is_deleted = FALSE,
         is_banned = FALSE,
         is_suspended = FALSE,
         suspended_until = NULL,
         color_id = 1,
         phone_verified = TRUE,
         student_verified = TRUE,
         reverification_status = 'none',
         reverification_deadline = NULL
       WHERE id = ?`,
      [
        hashedPassword,
        ...userPiiInsertValues(pii).slice(0, 5),
        schoolId,
        grade,
        classNumber,
        graduationYear,
        userId,
      ],
    );
    return { userId, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO users
       (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number,
        graduation_year, is_graduated, color_id, phone_verified, student_verified,
        reverification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 1, TRUE, TRUE, 'none')`,
    [
      username,
      hashedPassword,
      ...userPiiInsertValues(pii),
      schoolId,
      grade,
      classNumber,
      graduationYear,
    ],
  );
  return { userId: result.insertId, created: true };
}

async function resetTodayAttendance(connection) {
  const today = formatKstDateYmd(getKstNow());
  const [result] = await connection.execute(
    `DELETE a FROM attendances a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.username LIKE ? AND a.attendance_date = ?`,
    [`${USERNAME_PREFIX}%`, today],
  );
  return result.affectedRows ?? 0;
}

function writeAccountsManifest(school) {
  const outDir = path.resolve(__dirname, '../../load-test');
  fs.mkdirSync(outDir, { recursive: true });
  const accounts = Array.from({ length: LOAD_TEST_COUNT }, (_, i) => {
    const index = i + 1;
    return {
      index,
      username: usernameForIndex(index),
      password: LOAD_TEST_PASSWORD,
    };
  });
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: LOAD_TEST_COUNT,
    password: LOAD_TEST_PASSWORD,
    schoolId: school.school_id,
    schoolName: school.name,
    latitude: Number(school.latitude),
    longitude: Number(school.longitude),
    accounts,
  };
  fs.writeFileSync(
    path.join(outDir, 'accounts.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const { targets, resetAttendance } = parseArgs();
  const target = targets[0];

  const connection = await createDbConnection(target);
  try {
    await connection.beginTransaction();
    const school = await pickSchoolWithCoords(connection);
    const hashedPassword = await bcrypt.hash(LOAD_TEST_PASSWORD, getBcryptSaltRounds());

    let created = 0;
    let updated = 0;
    for (let i = 1; i <= LOAD_TEST_COUNT; i += 1) {
      const row = await upsertLoadTestStudent(connection, {
        index: i,
        schoolId: school.school_id,
        hashedPassword,
      });
      if (row.created) created += 1;
      else updated += 1;
    }

    let deletedAttendance = 0;
    if (resetAttendance) {
      deletedAttendance = await resetTodayAttendance(connection);
    }

    await connection.commit();
    writeAccountsManifest(school);

    console.log(`✅ [${target}] load-test 학생 ${LOAD_TEST_COUNT}명 upsert 완료`);
    console.log(`   생성 ${created} / 갱신 ${updated}`);
    console.log(`   학교: ${school.name} (id=${school.school_id})`);
    console.log(`   좌표: ${school.latitude}, ${school.longitude}`);
    console.log(`   아이디: ${usernameForIndex(1)} … ${usernameForIndex(LOAD_TEST_COUNT)}`);
    console.log(`   공통 비밀번호: ${LOAD_TEST_PASSWORD}`);
    if (resetAttendance) {
      console.log(`   오늘(KST) attendances 삭제: ${deletedAttendance}건`);
    }
    console.log('   manifest: back/load-test/accounts.json');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('❌ seed-load-test-students 실패:', error?.message || error);
  process.exit(1);
});
