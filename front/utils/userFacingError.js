/**
 * 사용자에게 보여줄 오류 문구 정리.
 * - API/axios/네트워크 기술 메시지는 한국어 안내로 치환
 * - 서버 message(한글 안내)는 그대로 유지
 */

const DEFAULT_FALLBACK =
  '요청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';

const TECHNICAL_LINE_PATTERNS = [
  /^HTTP \d{3}\b/i,
  /^Request failed with status code/i,
  /^Network Error$/i,
  /^timeout of \d+/i,
  /^API 주소:/i,
  /^에러 코드:/i,
  /^ECONNABORTED\b/,
  /^ERR_[A-Z_]+$/,
  /\baxios\b/i,
  /\bstatus code \d+/i,
  /^Method .+ is deprecated/i,
  /^expo-/i,
  /^\[object Object\]$/,
  /^\{"/,
  /^at .+\(.+\)$/,
  /^Wi‑Fi\/데이터, 방화벽/i,
];

function isTechnicalLine(line) {
  const text = String(line || '').trim();
  if (!text) return true;
  if (text.length > 240) return true;
  return TECHNICAL_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

/** Alert/Toast에 넣기 전 한 줄·여러 줄 문구 정리 */
export function sanitizeUserFacingText(text, fallback = DEFAULT_FALLBACK) {
  const raw = text == null ? '' : String(text).trim();
  if (!raw) return fallback;

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return fallback;

  const friendlyLines = lines.filter((line) => !isTechnicalLine(line));
  if (friendlyLines.length > 0) {
    return friendlyLines.join('\n');
  }

  return fallback;
}

function readServerMessage(error) {
  const fromInterceptor =
    typeof error?.userFacingMessage === 'string' &&
    error.userFacingMessage.trim();
  if (fromInterceptor) return fromInterceptor.trim();

  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data === 'string' && data.trim()) return data.trim();
  return '';
}

/**
 * axios/API 오류 → 사용자용 메시지
 */
export function getUserFacingErrorMessage(
  error,
  fallback = DEFAULT_FALLBACK,
) {
  const serverMsg = readServerMessage(error);
  if (serverMsg) {
    return sanitizeUserFacingText(serverMsg, fallback);
  }

  const status = error?.response?.status;

  if (!error?.response) {
    if (error?.code === 'ECONNABORTED') {
      return '응답 시간이 초과됐어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
    }
    const axiosMsg =
      typeof error?.message === 'string' ? error.message.trim() : '';
    if (axiosMsg === 'Network Error') {
      return '서버에 연결할 수 없어요. 네트워크 연결을 확인해 주세요.';
    }
    return sanitizeUserFacingText(axiosMsg, fallback);
  }

  if (status >= 500) {
    return '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.';
  }
  if (status === 401) {
    return '로그인 정보를 확인해 주세요.';
  }
  if (status === 403) {
    return '이 기능을 사용할 권한이 없어요.';
  }
  if (status === 404) {
    return '요청한 정보를 찾을 수 없어요.';
  }

  return fallback;
}

/** Error / unknown throw 값 */
export function getUserFacingErrorMessageFromUnknown(
  error,
  fallback = DEFAULT_FALLBACK,
) {
  if (error?.response || error?.userFacingMessage) {
    return getUserFacingErrorMessage(error, fallback);
  }
  if (error?.code === 'PERMISSION_DENIED') {
    return '사진 저장을 위해 갤러리 접근 권한이 필요해요.';
  }
  const raw = typeof error?.message === 'string' ? error.message.trim() : '';
  return sanitizeUserFacingText(raw, fallback);
}
