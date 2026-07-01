import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDbConnection,
  getDbConnectionOptions,
  parseMigrateCliArgs,
} from '../config/dbEnv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrationsForTarget(target) {
  const opts = getDbConnectionOptions(target);
  console.log('\n==============================');
  console.log(`📂 migrate target: ${target}`);
  console.log(`   host=${opts.host}:${opts.port} db=${opts.database}`);
  console.log('==============================\n');

  const connection = await createDbConnection(target);
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ migrations 디렉토리가 없습니다.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  실행할 마이그레이션 파일이 없습니다.');
      return;
    }

    console.log(`📦 ${files.length}개의 마이그레이션 파일을 실행합니다...\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ [${target}] 실행 중: ${file}`);

      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          if (err.errno === 1050) console.warn('  ⏭️  테이블 이미 존재, 스킵');
          else if (err.errno === 1060) console.warn('  ⏭️  컬럼 이미 존재, 스킵');
          else if (err.errno === 1061) console.warn('  ⏭️  인덱스 이미 존재, 스킵');
          else if (err.errno === 1062) console.warn('  ⏭️  중복 데이터/키, 스킵');
          else if (err.errno === 1091) console.warn('  ⏭️  대상(인덱스/컬럼) 없음, 스킵');
          else if (err.errno === 1826) console.warn('  ⏭️  Foreign Key 이름 이미 존재, 스킵');
          else if (err.errno === 1146) console.warn('  ⏭️  테이블 없음, 스킵');
          else if (err.errno === 1054) console.warn('  ⏭️  필드 없음, 스킵');
          else throw err;
        }
      }

      console.log(`✅ [${target}] 완료: ${file}\n`);
    }

    console.log(`🎉 [${target}] 마이그레이션 완료`);
  } finally {
    await connection.end();
  }
}

async function runMigrations() {
  const { targets } = parseMigrateCliArgs();

  for (const target of targets) {
    await runMigrationsForTarget(target);
  }

  if (targets.length > 1) {
    console.log('\n✅ 모든 대상 DB 마이그레이션 완료:', targets.join(', '));
  }
}

runMigrations().catch((error) => {
  console.error('❌ 마이그레이션 오류:', error.message);
  process.exit(1);
});
