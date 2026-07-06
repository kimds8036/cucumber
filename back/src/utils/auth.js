import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 시크릿 부재 시 fail-fast (개발 단계에서 .env 누락을 즉시 잡기 위함)
if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET 환경변수가 없습니다. 서버를 시작할 수 없습니다.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '30m';

// JWT 토큰 생성
export const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: options.expiresIn || JWT_EXPIRES_IN,
  });
};

/** 모바일 액세스 토큰 (token_version 포함) */
export function createUserAccessToken({ userId, username, tokenVersion = 0 }) {
  return generateToken({
    userId,
    username,
    tv: Number(tokenVersion) || 0,
  });
}

/** 관리자 세션 (OTP 통과 후, 기본 30분) */
export const generateAdminSessionToken = ({ adminId, userId, username, role }) => {
  const id = Number(adminId ?? userId);
  return generateToken(
    {
      adminId: id,
      userId: id,
      username,
      role: role || 'moderator',
      type: 'admin_session',
      adminMfa: true,
    },
    { expiresIn: ADMIN_JWT_EXPIRES_IN },
  );
};

/** JWT exp 클레임 → Unix ms */
export function getTokenExpiresAtMs(token) {
  try {
    const payload = jwt.decode(token);
    if (payload?.exp) return payload.exp * 1000;
  } catch {
    // ignore
  }
  return Date.now() + 30 * 60 * 1000;
}

/** OTP 등록 1회용 (10분) */
export const generateAdminOtpSetupToken = ({ adminId, userId, username }) => {
  const id = Number(adminId ?? userId);
  return generateToken(
    {
      adminId: id,
      userId: id,
      username,
      type: 'admin_otp_setup',
    },
    { expiresIn: '10m' },
  );
};

/**
 * JWT 토큰 검증.
 * 만료/위조 시 throw — 호출 측은 try/catch 로 err.code 를 분기 처리해야 한다.
 *  - err.code === 'TOKEN_EXPIRED' : 만료
 *  - err.code === 'INVALID_TOKEN' : 그 외 모든 위조/포맷 오류
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // 알고리즘 명시 (alg:none / RS256 swap 공격 차단)
    });
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      const err = new Error('TOKEN_EXPIRED');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    const err = new Error('INVALID_TOKEN');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
};

/** bcrypt cost (기본 10, env: BCRYPT_SALT_ROUNDS, 허용 8~10) */
export function getBcryptSaltRounds() {
  const n = Number(process.env.BCRYPT_SALT_ROUNDS);
  if (Number.isFinite(n) && n >= 8 && n <= 10) {
    return Math.floor(n);
  }
  return 10;
}

// 비밀번호 해싱
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, getBcryptSaltRounds());
};

// 비밀번호 검증
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// 인증 코드 생성 (6자리 숫자)
export const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// IP 주소 추출 (프록시 환경 고려)
export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
};

// 디바이스 정보 추출
export const getDeviceInfo = (req) => {
  return req.headers['user-agent'] || 'unknown';
};
