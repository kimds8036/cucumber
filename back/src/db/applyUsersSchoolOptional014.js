/**
 * 014_users_school_optional — school_id NULL 허용 + FK ON DELETE SET NULL
 * (PREPARE/동적 SQL은 mysql2 prepared protocol에서 불가 → JS로 처리)
 */

async function dropSchoolIdForeignKeys(connection) {
  const [rows] = await connection.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'school_id'
       AND REFERENCED_TABLE_NAME = 'schools'`,
  );

  const seen = new Set();
  for (const row of rows) {
    const name = row.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    try {
      await connection.execute(
        `ALTER TABLE users DROP FOREIGN KEY \`${name}\``,
      );
    } catch (err) {
      if (err.errno !== 1091) throw err;
    }
  }
  return seen.size;
}

/**
 * @returns {Promise<string[]>} 적용한 작업 요약
 */
export async function applyUsersSchoolOptional014(connection) {
  const summary = [];

  const dropped = await dropSchoolIdForeignKeys(connection);
  if (dropped > 0) summary.push(`drop FK x${dropped}`);

  await connection.execute(`
    ALTER TABLE users
      MODIFY COLUMN \`school_id\` varchar(50) COLLATE utf8mb4_unicode_ci NULL
        COMMENT '학교 ID (가입 시 미선택 가능 · 학생 인증 시 설정)'
  `);
  summary.push('school_id NULL');

  try {
    await connection.execute(`
      ALTER TABLE users
        ADD CONSTRAINT \`users_ibfk_1\`
        FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`school_id\`)
        ON DELETE SET NULL
    `);
    summary.push('FK SET NULL');
  } catch (err) {
    // 1826: duplicate FK name, 1005/1215: already exists / cannot add
    if (err.errno === 1826 || err.errno === 1005 || err.code === 'ER_DUP_KEYNAME') {
      summary.push('FK already ok');
    } else {
      throw err;
    }
  }

  return summary;
}
