/**
 * 한국 전화번호 canonical 저장 형식: 숫자만 01012345678
 * E.164(+82…), 하이픈 포함 입력 모두 수용
 */
export function normalizeLocalKrPhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('82') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/** @deprecated normalizeLocalKrPhone 사용 권장 */
export function e164ToLocalKr(e164) {
  return normalizeLocalKrPhone(e164);
}

/** 010… → +8210… */
export function localKrToE164(localPhone) {
  const normalized = normalizeLocalKrPhone(localPhone);
  if (!normalized) return '';
  if (normalized.startsWith('0')) {
    return `+82${normalized.slice(1)}`;
  }
  return `+82${normalized}`;
}

/** DB users.phone 비교용 — 하이픈·공백 제거 후 일치 */
export const SQL_PHONE_NORM = "REPLACE(REPLACE(phone, '-', ''), ' ', '')";
