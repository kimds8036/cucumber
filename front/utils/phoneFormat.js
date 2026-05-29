/**
 * canonical: 01012345678 (숫자만)
 */
export function normalizeLocalKrPhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('82') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/** 01012345678 → +821012345678 */
export function formatPhoneToE164(krPhone) {
  const normalized = normalizeLocalKrPhone(krPhone);
  if (!normalized) return '';
  if (normalized.startsWith('0')) {
    return `+82${normalized.slice(1)}`;
  }
  return `+82${normalized}`;
}

/** +821012345678 → 01012345678 */
export function e164ToLocalKr(e164) {
  return normalizeLocalKrPhone(e164);
}
