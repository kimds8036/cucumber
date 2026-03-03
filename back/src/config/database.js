import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'cucumber',
  password: process.env.DB_PASSWORD || 'cucumber0425',
  database: process.env.DB_NAME || 'cucumber',
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
