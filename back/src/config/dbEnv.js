import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const BACK_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

let envLoaded = false;

/** back/.env 를 한 번만 로드 */
export function loadBackEnv() {
  if (envLoaded) return;
  dotenv.config({ path: path.join(BACK_ROOT, '.env') });
  envLoaded = true;
}

export const MIGRATE_TARGETS = ['develop', 'production'];

export function normalizeTarget(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  return 'develop';
}

/** Railway 컨테이너 안에서 실행 중인지 */
export function isRailwayRuntime() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

/**
 * 로컬: RAILWAY_TARGET (develop|production)
 * Railway: RAILWAY_ENVIRONMENT (develop|production)
 */
export function getActiveTarget(override) {
  if (override) return normalizeTarget(override);
  if (isRailwayRuntime()) {
    return normalizeTarget(process.env.RAILWAY_ENVIRONMENT || 'develop');
  }
  return normalizeTarget(process.env.RAILWAY_TARGET || 'develop');
}

function targetPrefix(target) {
  return normalizeTarget(target) === 'production' ? 'PRODUCTION' : 'DEVELOP';
}

function readOptional(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function readRequired(name) {
  const value = readOptional(name);
  if (!value) {
    throw new Error(
      `[FATAL] 환경변수 ${name} 가 필요합니다. back/.env 또는 Railway Variables를 확인하세요.`,
    );
  }
  return value;
}

function readPort(...names) {
  for (const name of names) {
    const raw = process.env[name];
    if (raw == null || raw === '') continue;
    const port = Number(raw);
    if (Number.isFinite(port) && port > 0) return port;
  }
  return 3306;
}

function resolveDbKeys(target) {
  if (isRailwayRuntime()) {
    return {
      tunnelHost: 'DB_TUNNEL_HOST',
      tunnelPort: 'DB_TUNNEL_PORT',
      privateHost: 'DB_PRIVATE_HOST',
      privatePort: 'DB_PRIVATE_PORT',
      host: 'DB_HOST',
      port: 'DB_PORT',
      user: 'DB_USER',
      password: 'DB_PASSWORD',
      database: 'DB_NAME',
    };
  }

  const p = targetPrefix(target ?? getActiveTarget());
  return {
    tunnelHost: `${p}_DB_TUNNEL_HOST`,
    tunnelPort: `${p}_DB_TUNNEL_PORT`,
    privateHost: `${p}_DB_PRIVATE_HOST`,
    privatePort: `${p}_DB_PRIVATE_PORT`,
    host: `${p}_DB_HOST`,
    port: `${p}_DB_PORT`,
    user: `${p}_DB_USER`,
    password: `${p}_DB_PASSWORD`,
    database: `${p}_DB_NAME`,
  };
}

function buildConnectionOptions(keys, overrides = {}) {
  const host =
    readOptional(keys.tunnelHost, keys.privateHost, keys.host) ||
    (() => {
      throw new Error(
        `[FATAL] ${keys.tunnelHost}, ${keys.privateHost}, ${keys.host} 중 하나가 필요합니다.`,
      );
    })();

  return {
    host,
    port: readPort(keys.tunnelPort, keys.privatePort, keys.port),
    user: readRequired(keys.user),
    password: readRequired(keys.password),
    database: readRequired(keys.database),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
    ...overrides,
  };
}

/**
 * @param {string} [targetOverride] develop | production
 */
export function getDbConnectionOptions(targetOverride, overrides = {}) {
  loadBackEnv();
  const keys = resolveDbKeys(targetOverride);
  return buildConnectionOptions(keys, overrides);
}

export function getDbServerOptions(targetOverride, overrides = {}) {
  const { database, ...server } = getDbConnectionOptions(targetOverride, overrides);
  return server;
}

export async function createDbConnection(targetOverride, overrides = {}) {
  const conn = await mysql.createConnection(getDbConnectionOptions(targetOverride, overrides));
  await conn.query("SET SESSION time_zone = '+00:00'");
  return conn;
}

export function parseMigrateCliArgs(argv = process.argv.slice(2)) {
  if (argv.includes('--all')) {
    return { targets: [...MIGRATE_TARGETS] };
  }
  const targetArg = argv.find((a) => a.startsWith('--target='));
  if (targetArg) {
    return { targets: [normalizeTarget(targetArg.split('=')[1])] };
  }
  return { targets: [getActiveTarget()] };
}
