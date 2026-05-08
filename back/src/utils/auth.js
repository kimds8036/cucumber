import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 시크릿 부재 시 fail-fast (개발 단계에서 .env 누락을 즉시 잡기 위함)
if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET 환경변수가 없습니다. 서버를 시작할 수 없습니다.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// JWT 토큰 생성
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
  });
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

// 비밀번호 해싱
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
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
