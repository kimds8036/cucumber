const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'oi_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 6589,
    dialect: 'postgres',
    logging: false
  }
);

async function testConnection() {
  try {
    console.log('🔄 PostgreSQL 연결 테스트 중...\n');
    
    // 1. 연결 테스트
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 연결 성공!');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}\n`);
    
    // 2. 테이블 목록 조회
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 생성된 테이블 목록:');
    tables.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log(`\n총 ${tables.length}개의 테이블\n`);
    
    // 3. 사용자 수 확인
    const [userCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM users'
    );
    console.log(`👥 등록된 사용자 수: ${userCount[0].count}명\n`);
    
    // 4. 학교 수 확인
    const [schoolCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM schools'
    );
    console.log(`🏫 등록된 학교 수: ${schoolCount[0].count}개\n`);
    
    console.log('🎉 모든 테스트 통과!');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    console.error('\n🔍 확인사항:');
    console.error('   1. PostgreSQL 서비스가 실행 중인가요?');
    console.error('   2. .env 파일의 DB_PASSWORD가 정확한가요?');
    console.error('   3. 포트 번호가 6589가 맞나요?');
    console.error('   4. oi_db 데이터베이스가 생성되었나요?\n');
    process.exit(1);
  }
}

testConnection();