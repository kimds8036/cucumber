/**
 * Apple identityToken (JWT) 서버 검증 — 클라 sub/email 단독 신뢰 금지
 */
import * as jose from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

let appleJwks;

function getAppleJwks() {
  if (!appleJwks) {
    appleJwks = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }
  return appleJwks;
}

function getAppleClientIds() {
  const primary = String(
    process.env.APPLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID || '',
  ).trim();
  const extras = String(process.env.APPLE_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = [...new Set([primary, ...extras].filter(Boolean))];
  // 기본 번들 (Youth Paper)
  if (!ids.length) {
    ids.push('com.ucost.YouthPaper');
  }
  return ids;
}

/**
 * @param {string} identityToken
 * @returns {Promise<{ providerUserId: string, email: string|null, emailVerified: boolean, payload: object }>}
 */
export async function verifyAppleIdentityToken(identityToken) {
  const token = String(identityToken || '').trim();
  if (!token) {
    const err = new Error('Apple identityToken이 필요합니다.');
    err.code = 'APPLE_TOKEN_REQUIRED';
    err.status = 400;
    throw err;
  }

  // develop / 명시적 mock 허용: 프론트 appleAuth DEV mock 토큰
  const appEnv = String(process.env.APP_ENV || '').toLowerCase();
  const allowMock =
    String(process.env.APPLE_ALLOW_MOCK_TOKEN || '').trim() === '1' ||
    appEnv === 'development' ||
    appEnv === 'develop';
  if (allowMock && token.startsWith('mock-apple')) {
    return {
      providerUserId: 'apple-mock-user-001',
      email: null,
      emailVerified: false,
      payload: { sub: 'apple-mock-user-001' },
    };
  }

  const audiences = getAppleClientIds();
  let payload;
  try {
    ({ payload } = await jose.jwtVerify(token, getAppleJwks(), {
      issuer: APPLE_ISSUER,
      audience: audiences.length === 1 ? audiences[0] : audiences,
    }));
  } catch (verifyErr) {
    const err = new Error('Apple 토큰 검증에 실패했습니다.');
    err.code = 'APPLE_TOKEN_INVALID';
    err.status = 401;
    err.cause = verifyErr;
    throw err;
  }

  const sub = payload?.sub;
  if (!sub || String(sub).trim() === '') {
    const err = new Error('Apple 사용자 ID를 확인할 수 없습니다.');
    err.code = 'APPLE_USER_ID_MISSING';
    err.status = 401;
    throw err;
  }

  return {
    providerUserId: String(sub),
    email: payload.email ? String(payload.email) : null,
    emailVerified: Boolean(payload.email_verified),
    payload,
  };
}

export {
  findUserIdByOauthProvider,
  linkOauthProvider,
} from './kakao.oauth.service.js';

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} connection
 * @param {number} userId
 * @returns {Promise<string[]>}
 */
export async function listOauthProvidersForUser(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT provider FROM user_oauth_providers WHERE user_id = ? ORDER BY provider`,
    [userId],
  );
  return rows.map((r) => String(r.provider));
}

export function formatSocialProvidersLabel(providers) {
  const labels = (providers || []).map((p) => {
    if (p === 'kakao') return '카카오';
    if (p === 'apple') return 'Apple';
    return p;
  });
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  return labels.join('·');
}
