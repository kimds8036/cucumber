import rateLimit from 'express-rate-limit';
import { normalizeLocalKrPhone } from '../utils/phone.js';
import { createRedisRateLimitStore } from './rateLimitStore.js';

/** IP 기본 키 */
function ipKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** 전화번호 + IP 복합 키 (SMS·중복조회 남용 방지) */
function phoneAndIpKey(req) {
  const phone = normalizeLocalKrPhone(req.body?.phone);
  if (phone) return `phone:${phone}:${ipKey(req)}`;
  return `ip:${ipKey(req)}`;
}

/** OCR: IP + (선택) 전화번호 */
function ocrKey(req) {
  const phone = normalizeLocalKrPhone(req.body?.phone);
  if (phone) return `ocr:${phone}:${ipKey(req)}`;
  return `ocr:ip:${ipKey(req)}`;
}

const limitMessage = (msg) => ({
  success: false,
  message: msg,
});

const phoneVerifyStore = createRedisRateLimitStore('phone-verify');
const signupOcrStore = createRedisRateLimitStore('signup-ocr');

const phoneLimiterOptions = {
  windowMs: Number(process.env.SIGNUP_PHONE_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.SIGNUP_PHONE_RATE_MAX || 8),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneAndIpKey,
};

const phoneVerificationMessage = limitMessage(
  '전화번호 인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
);

/**
 * Firebase SMS 관련 백엔드 호출 공통 한도 (가입·아이디/비밀번호 찾기 공유)
 * check-phone-available, verify-firebase-phone, recovery/* 등
 */
export const phoneVerificationBackendLimiter = rateLimit({
  ...phoneLimiterOptions,
  ...(phoneVerifyStore ? { store: phoneVerifyStore } : {}),
  message: phoneVerificationMessage,
});

/** @deprecated alias — phoneVerificationBackendLimiter 와 동일 카운터 */
export const signupPhoneBackendLimiter = phoneVerificationBackendLimiter;
/** @deprecated alias — phoneVerificationBackendLimiter 와 동일 카운터 */
export const recoveryPhoneBackendLimiter = phoneVerificationBackendLimiter;

/**
 * 학생증 CLOVA OCR (verify-student-id)
 * 기본: 24시간 IP+번호당 10회
 */
export const signupOcrLimiter = rateLimit({
  windowMs: Number(process.env.SIGNUP_OCR_RATE_WINDOW_MS || 24 * 60 * 60 * 1000),
  max: Number(process.env.SIGNUP_OCR_RATE_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ocrKey,
  ...(signupOcrStore ? { store: signupOcrStore } : {}),
  message: limitMessage(
    '학생증 인식 요청 한도를 초과했습니다. 내일 다시 시도하거나 고객센터에 문의해 주세요.',
  ),
});
