import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3307',
  DB_USER = 'cucumber',
  DB_PASSWORD = 'cucumber0425',
  DB_NAME = 'cucumber',
} = process.env;

async function resetDatabase() {
  const serverConfig = {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  };

  const dbName = DB_NAME;

  console.log('==============================');
  console.log('🗑  개발용 DB 리셋을 시작합니다.');
  console.log(`📂 대상 DB: ${dbName} (host=${DB_HOST}, port=${DB_PORT})`);

  const connection = await mysql.createConnection(serverConfig);

  try {
    // DB 드롭 및 재생성
    console.log(`⚠️  기존 데이터베이스를 삭제합니다: ${dbName}`);
    await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`🆕 데이터베이스를 새로 생성합니다: ${dbName}`);
    await connection.execute(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    // 새로 만든 DB를 사용
    await connection.changeUser({ database: dbName });

    // 마이그레이션 실행 (migrate.js와 동일한 방식)
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ migrations 디렉토리가 없습니다. 마이그레이션을 건너뜁니다.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️ 실행할 마이그레이션 파일이 없습니다.');
      return;
    }

    console.log(`📦 ${files.length}개의 마이그레이션 파일을 실행합니다...\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ 실행 중: ${file}`);

      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          if (err.errno === 1060) console.warn('  ⏭️  컬럼 이미 존재, 스킵');
          else if (err.errno === 1061) console.warn('  ⏭️  인덱스 이미 존재, 스킵');
          else throw err;
        }
      }

      console.log(`✅ 완료: ${file}\n`);
    }

    console.log('🎉 개발용 DB 리셋 및 마이그레이션이 완료되었습니다!');
  } catch (error) {
    console.error('❌ DB 리셋 중 오류 발생:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('==============================');
  }
}

resetDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});

