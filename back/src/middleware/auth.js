import { verifyToken } from '../utils/auth.js';

// JWT 인증 미들웨어
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 토큰이 필요합니다.' 
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: '유효하지 않은 토큰입니다.' 
      });
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    req.user = decoded || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
