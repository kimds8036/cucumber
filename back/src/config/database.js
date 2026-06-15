import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Railway: Public Networking Off 후 DB_PRIVATE_HOST(또는 *.railway.internal) 사용 권장
const dbConfig = {
  host: process.env.DB_PRIVATE_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PRIVATE_PORT || process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'cucumber',
  password: process.env.DB_PASSWORD || 'cucumber0425',
  database: process.env.DB_NAME || 'cucumber',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DB ↔ Node.js 간에는 항상 UTC 기준으로 주고받고,
  // 클라이언트(앱)에서 기기 로컬 시간대로 변환해서 보여준다.
  timezone: 'Z',
};

const rawPool = mysql.createPool(dbConfig);

// MySQL 세션 타임존도 UTC로 고정
const TZ_QUERY = "SET SESSION time_zone = '+00:00'";

async function withConnection(fn) {
  const conn = await rawPool.getConnection();
  try {
    await conn.query(TZ_QUERY);
    return await fn(conn);
  } finally {
    conn.release();
  }
}

const pool = {
  execute(sql, params) {
    return withConnection((conn) => conn.execute(sql, params));
  },
  query(sql, params) {
    return withConnection((conn) => conn.query(sql, params));
  },
  getConnection() {
    return rawPool.getConnection().then(async (conn) => {
      await conn.query(TZ_QUERY);
      return conn;
    });
  },
};

// Connection pool export
export default pool;
export { rawPool };

// 단일 연결 (마이그레이션용) - 타임존 UTC
export const getConnection = async () => {
  const conn = await mysql.createConnection(dbConfig);
  await conn.query(TZ_QUERY);
  return conn;
};
