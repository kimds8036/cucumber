import mysql from 'mysql2/promise';
import {
  getDbConnectionOptions,
  getActiveTarget,
  resolveConnectionLimit,
} from './dbEnv.js';
import { autoHydratePiiRows } from '../services/userPii.service.js';

const dbConfig = getDbConnectionOptions(getActiveTarget());

if (process.env.NODE_ENV !== 'test') {
  console.log(
    `[DB] connectionLimit=${resolveConnectionLimit()} (DB_CONNECTION_LIMIT)`,
  );
}

const rawPool = mysql.createPool(dbConfig);

const TZ_QUERY = "SET SESSION time_zone = '+00:00'";

function hydrateExecuteResult(result) {
  if (!Array.isArray(result) || !Array.isArray(result[0])) return result;
  return [autoHydratePiiRows(result[0]), ...result.slice(1)];
}

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
  async execute(sql, params) {
    const result = await withConnection((conn) => conn.execute(sql, params));
    return hydrateExecuteResult(result);
  },
  async query(sql, params) {
    const result = await withConnection((conn) => conn.query(sql, params));
    return hydrateExecuteResult(result);
  },
  getConnection() {
    return rawPool.getConnection().then(async (conn) => {
      await conn.query(TZ_QUERY);
      return conn;
    });
  },
};

export default pool;
export { rawPool };

export const getConnection = async (targetOverride) => {
  const conn = await mysql.createConnection(
    getDbConnectionOptions(targetOverride ?? getActiveTarget()),
  );
  await conn.query(TZ_QUERY);
  return conn;
};
