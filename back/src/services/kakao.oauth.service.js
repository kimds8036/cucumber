/**
 * 카카오 accessToken → 서버 검증 (클라가 보낸 kakaoId 단독 신뢰 금지)
 */

function getKakaoRestApiKey() {
  return String(process.env.KAKAO_REST_API_KEY || '').trim();
}

/**
 * @param {string} accessToken
 * @returns {Promise<{ providerUserId: string, profile: object }>}
 */
export async function verifyKakaoAccessToken(accessToken) {
  const token = String(accessToken || '').trim();
  if (!token) {
    const err = new Error('카카오 accessToken이 필요합니다.');
    err.code = 'KAKAO_TOKEN_REQUIRED';
    err.status = 400;
    throw err;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  };

  // REST 키가 있으면 KakaoAK 로도 호출 가능하나, 사용자 토큰 검증은 Bearer 만으로 충분
  const restKey = getKakaoRestApiKey();
  if (restKey) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers,
    });
  } catch (networkErr) {
    const err = new Error('카카오 서버에 연결하지 못했습니다.');
    err.code = 'KAKAO_NETWORK_ERROR';
    err.status = 503;
    err.cause = networkErr;
    throw err;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(
      body?.msg || body?.message || '카카오 토큰 검증에 실패했습니다.',
    );
    err.code = 'KAKAO_TOKEN_INVALID';
    err.status = 401;
    err.kakao = body;
    throw err;
  }

  const id = body?.id;
  if (id == null || String(id).trim() === '') {
    const err = new Error('카카오 사용자 ID를 확인할 수 없습니다.');
    err.code = 'KAKAO_USER_ID_MISSING';
    err.status = 401;
    throw err;
  }

  return {
    providerUserId: String(id),
    profile: body,
  };
}

export async function findUserIdByOauthProvider(connection, provider, providerUserId) {
  const [rows] = await connection.execute(
    `SELECT user_id FROM user_oauth_providers
     WHERE provider = ? AND provider_user_id = ?
     LIMIT 1`,
    [provider, String(providerUserId)],
  );
  return rows[0]?.user_id ? Number(rows[0].user_id) : null;
}

export async function linkOauthProvider(connection, {
  userId,
  provider,
  providerUserId,
}) {
  await connection.execute(
    `INSERT INTO user_oauth_providers (user_id, provider, provider_user_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE linked_at = linked_at`,
    [userId, provider, String(providerUserId)],
  );
}
