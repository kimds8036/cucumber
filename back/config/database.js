// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL 연결 설정
const sequelize = new Sequelize(
  process.env.DB_NAME || 'oi_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '040215',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 6589,
    dialect: 'postgres',
    
    // 연결 풀 설정
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // 로깅 설정
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // 타임존 설정
    timezone: '+09:00',
    
    // 추가 옵션
    define: {
      timestamps: true,
      underscored: true, // snake_case 사용
      freezeTableName: true // 테이블명 복수형 변환 방지
    }
  }
);

// 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 데이터베이스 연결 성공!');
  } catch (error) {
    console.error('❌ PostgreSQL 연결 실패:', error);
    process.exit(1);
  }
};

// 개발 환경에서 자동 연결 테스트
if (process.env.NODE_ENV !== 'production') {
  testConnection();
}

module.exports = sequelize;
