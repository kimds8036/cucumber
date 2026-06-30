import { verifyToken } from '../utils/auth.js';
import pool from '../config/database.js';
import { API_ERROR_CODES } from '../constants/apiErrorCodes.js';
import { getReverificationBlockCode } from '../services/reverification.service.js';

const REVERIFICATION_RESUBMIT_PATH = '/resubmit-student-id';
const REVERIFICATION_PROFILE_PATH = '/me';

function shouldSkipReverificationBlock(req, reverificationStatus) {
  const path = String(req.originalUrl || req.path || '');
  if (path.includes(REVERIFICATION_PROFILE_PATH)) return true;
  if (!path.includes(REVERIFICATION_RESUBMIT_PATH)) return false;
  return ['grace', 'required', 'restricted'].includes(reverificationStatus);
}

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
  return getCookieValue(req, 'admin_access_token');
}

async function loadUserAuthState(userId) {
  const [rows] = await pool.execute(
    `SELECT is_deleted, is_banned, is_suspended, suspended_until,
            token_version, reverification_status, reverification_deadline
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

function checkReverificationBlock(row) {
  const code = getReverificationBlockCode(row.reverification_status);
  if (!code) return null;
  const messages = {
    GRADUATED_BLOCKED: '졸업생은 서비스를 이용할 수 없습니다.',
    ADULT_BLOCKED: '성인은 서비스를 이용할 수 없습니다.',
    REVERIFICATION_RESTRICTED: '재인증이 필요합니다. 학생증을 다시 제출해주세요.',
  };
  return {
    status: 403,
    code,
    message: messages[code] || '서비스 이용이 제한되었습니다.',
    reverificationStatus: row.reverification_status,
    reverificationDeadline: row.reverification_deadline || null,
  };
}

// JWT 인증 미들웨어
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      });
    }
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err?.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          message: '토큰이 만료되었습니다.',
          code: API_ERROR_CODES.TOKEN_EXPIRED,
        });
      }
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.',
        code: API_ERROR_CODES.INVALID_TOKEN,
      });
    }

    const userId = Number(decoded.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자 정보입니다.',
      });
    }

    const row = await loadUserAuthState(userId);
    if (!row || row.is_deleted) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자입니다.',
      });
    }

    const tokenTv = Number(decoded.tv ?? 0);
    const dbTv = Number(row.token_version ?? 0);
    if (tokenTv !== dbTv) {
      return res.status(401).json({
        success: false,
        message: '세션이 만료되었습니다. 다시 로그인해주세요.',
        code: API_ERROR_CODES.SESSION_REVOKED,
      });
    }

    if (row.is_banned) {
      return res.status(403).json({
        success: false,
        message: '영구 정지된 계정입니다.',
        code: API_ERROR_CODES.ACCOUNT_BANNED,
      });
    }
    if (row.is_suspended) {
      const until = row.suspended_until ? new Date(row.suspended_until) : null;
      if (!until || until > new Date()) {
        return res.status(403).json({
          success: false,
          message: '임시 정지된 계정입니다.',
          code: API_ERROR_CODES.ACCOUNT_SUSPENDED,
          suspendedUntil: row.suspended_until || null,
        });
      }
    }

    const revBlock = checkReverificationBlock(row);
    if (revBlock && !shouldSkipReverificationBlock(req, row.reverification_status)) {
      return res.status(revBlock.status).json({
        success: false,
        message: revBlock.message,
        code: revBlock.code,
        reverificationStatus: revBlock.reverificationStatus,
        reverificationDeadline: revBlock.reverificationDeadline,
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '인증 처리 중 오류가 발생했습니다.',
    });
  }
};

export const optionalAuthenticate = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    let decoded = null;
    try {
      decoded = verifyToken(token);
    } catch {
      decoded = null;
    }
    req.user = decoded || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
