import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cucumber_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection pool 생성
const pool = mysql.createPool(dbConfig);

// 단일 연결 (마이그레이션용)
export const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

// Connection pool export
export default pool;
