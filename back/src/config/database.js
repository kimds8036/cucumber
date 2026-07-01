import mysql from 'mysql2/promise';
import { getDbConnectionOptions, getActiveTarget } from './dbEnv.js';

const dbConfig = getDbConnectionOptions(getActiveTarget());

const rawPool = mysql.createPool(dbConfig);

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

export default pool;
export { rawPool };

export const getConnection = async (targetOverride) => {
  const conn = await mysql.createConnection(
    getDbConnectionOptions(targetOverride ?? getActiveTarget()),
  );
  await conn.query(TZ_QUERY);
  return conn;
};
