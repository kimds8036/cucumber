/** 운영 환경 여부 */
export function isProductionEnv() {
  return process.env.NODE_ENV === 'production';
}

/**
 * 클라이언트에 내려줄 에러 메시지 (운영에서는 5xx 상세 숨김)
 */
export function clientErrorMessage(err, fallback = 'Internal Server Error') {
  if (!isProductionEnv()) {
    return err?.message || fallback;
  }
  return 'Internal Server Error';
}

/**
 * JSON 에러 응답. 상세 스택/SQL은 console.error 에만 남긴다.
 */
export function sendErrorResponse(res, statusCode, err, { logLabel = '' } = {}) {
  if (err) {
    const prefix = logLabel ? `${logLabel} ` : '';
    console.error(`${prefix}[ERROR]`, err?.stack || err);
  }
  const message =
    statusCode >= 500
      ? clientErrorMessage(err)
      : err?.message || 'Bad Request';
  return res.status(statusCode).json({ success: false, message });
}
