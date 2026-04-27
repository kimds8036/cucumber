import { verifyToken } from '../utils/auth.js';
import pool from '../config/database.js';

function getCookieValue(req, key) {
  const raw = req.headers.cookie || '';
  if (!raw) return null;
  const parts = raw.split(';').map((v) => v.trim());
  const row = parts.find((v) => v.startsWith(`${key}=`));
  if (!row) return null;
  const value = row.slice(key.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // 관리자 웹은 httpOnly 쿠키 기반 인증도 허용
  return getCookieValue(req, 'admin_access_token');
}

// JWT 인증 미들웨어
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 토큰이 필요합니다.' 
      });
    }
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: '유효하지 않은 토큰입니다.' 
      });
    }

    const userId = Number(decoded.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자 정보입니다.',
      });
    }
    const [rows] = await pool.execute(
      `SELECT is_deleted, is_banned, is_suspended, suspended_until
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    if (!rows.length || rows[0].is_deleted) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자입니다.',
      });
    }
    if (rows[0].is_banned) {
      return res.status(403).json({
        success: false,
        message: '영구 정지된 계정입니다.',
        code: 'ACCOUNT_BANNED',
      });
    }
    if (rows[0].is_suspended) {
      const until = rows[0].suspended_until ? new Date(rows[0].suspended_until) : null;
      if (!until || until > new Date()) {
        return res.status(403).json({
          success: false,
          message: '임시 정지된 계정입니다.',
          code: 'ACCOUNT_SUSPENDED',
          suspendedUntil: rows[0].suspended_until || null,
        });
      }
    }
    req.user = decoded; // 토큰에서 추출한 사용자 정보
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: '인증 처리 중 오류가 발생했습니다.' 
    });
  }
};

// 선택적 인증: 토큰이 있으면 req.user 설정, 없으면 req.user = null
export const optionalAuthenticate = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = verifyToken(token);
    req.user = decoded || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
