import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 마이그레이션 파일들을 순서대로 실행
async function runMigrations() {
  const connection = await getConnection();

  try {
    const migrationsDir = path.join(__dirname, 'migrations');

    // migrations 디렉토리가 없으면 생성
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('✅ migrations 디렉토리를 생성했습니다.');
      console.log('📝 schema.sql 파일을 migrations 폴더에 만들어주세요.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // 파일명 순서대로 실행

    if (files.length === 0) {
      console.log('⚠️  실행할 마이그레이션 파일이 없습니다.');
      return;
    }

    console.log(`📦 ${files.length}개의 마이그레이션 파일을 실행합니다...\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ 실행 중: ${file}`);

      // SQL을 세미콜론으로 분리하여 각각 실행
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          // 반복 실행 시 자주 발생하는 "이미 존재/없음" 계열은 스킵
          if (err.errno === 1050) console.warn('  ⏭️  테이블 이미 존재, 스킵');
          else if (err.errno === 1060)
            console.warn('  ⏭️  컬럼 이미 존재, 스킵');
          else if (err.errno === 1061)
            console.warn('  ⏭️  인덱스 이미 존재, 스킵');
          else if (err.errno === 1062)
            console.warn('  ⏭️  중복 데이터/키, 스킵');
          else if (err.errno === 1091)
            console.warn('  ⏭️  대상(인덱스/컬럼) 없음, 스킵');
          else if (err.errno === 1826)
            console.warn('  ⏭️  Foreign Key 이름 이미 존재, 스킵');
          else if (err.errno === 1146)
            console.warn('  ⏭️  테이블 없음, 스킵');
          else if (err.errno === 1054)
            console.warn('  ⏭️  필드 없음(이미 변경된 멱등 마이그레이션), 스킵');
          else throw err;
        }
      }

      console.log(`✅ 완료: ${file}\n`);
    }

    console.log('🎉 모든 마이그레이션이 성공적으로 완료되었습니다!');
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigrations().catch(console.error);
