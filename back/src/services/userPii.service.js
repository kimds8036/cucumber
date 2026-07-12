import { decryptPii, encryptPii, hmacPiiLookup } from '../utils/piiCrypto.js';
import { normalizeLocalKrPhone } from '../utils/phone.js';

export function normalizePiiName(name) {
  return String(name || '').trim();
}

export function hashPhoneLookup(phone) {
  const normalized = normalizeLocalKrPhone(phone);
  if (!normalized) return null;
  return hmacPiiLookup('phone', normalized);
}

export function hashNameLookup(name) {
  const normalized = normalizePiiName(name);
  if (!normalized) return null;
  return hmacPiiLookup('name', normalized);
}

export function normalizeBirthDateInput(birthDate) {
  if (birthDate == null || birthDate === '') return null;
  const raw = String(birthDate).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/** users / signup 제출 등 DB 저장용 PII 패킹 */
export function packUserPii({ name, phone, birthDate }) {
  const normalizedName = normalizePiiName(name);
  const normalizedPhone = normalizeLocalKrPhone(phone);
  const normalizedBirth = normalizeBirthDateInput(birthDate);

  return {
    name_enc: normalizedName ? encryptPii(normalizedName) : null,
    name_lookup: hashNameLookup(normalizedName),
    phone_enc: normalizedPhone ? encryptPii(normalizedPhone) : null,
    phone_lookup: hashPhoneLookup(normalizedPhone),
    birth_date_enc: normalizedBirth ? encryptPii(normalizedBirth) : null,
  };
}

export function packPhoneOnly(phone) {
  const normalizedPhone = normalizeLocalKrPhone(phone);
  return {
    phone_enc: normalizedPhone ? encryptPii(normalizedPhone) : null,
    phone_lookup: hashPhoneLookup(normalizedPhone),
  };
}

/** 단일 필드: 암호문 복호화 */
export function resolvePiiField(encValue) {
  if (!encValue) return null;
  try {
    return decryptPii(encValue);
  } catch {
    return null;
  }
}

export function resolveUserName(row) {
  return resolvePiiField(row?.name_enc);
}

export function resolveUserPhone(row) {
  return resolvePiiField(row?.phone_enc);
}

export function resolveUserBirthDate(row) {
  return resolvePiiField(row?.birth_date_enc);
}

/** row에 복호화된 plain 필드 주입 + *_enc 제거 */
export function hydrateUserPiiRow(row, fields = ['name', 'phone', 'birth_date']) {
  if (!row || typeof row !== 'object') return row;
  if (fields.includes('name')) {
    row.name = resolveUserName(row);
    delete row.name_enc;
  }
  if (fields.includes('phone')) {
    row.phone = resolveUserPhone(row);
    delete row.phone_enc;
  }
  if (fields.includes('birth_date')) {
    row.birth_date = resolveUserBirthDate(row);
    delete row.birth_date_enc;
  }
  return row;
}

export function hydrateUserPiiRows(rows, fields) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => hydrateUserPiiRow({ ...row }, fields));
}

/** JOIN alias 필드 (author_name_enc + author_name) */
export function hydrateAliasedPiiField(row, plainKey, encKey = null) {
  const enc = encKey || `${plainKey}_enc`;
  if (row[enc]) {
    row[plainKey] = decryptPii(row[enc]);
    delete row[enc];
  }
  return row[plainKey] ?? null;
}

export function hydrateAliasedPiiFields(row, plainKeys) {
  for (const key of plainKeys) {
    hydrateAliasedPiiField(row, key);
  }
  return row;
}

export function hydrateAliasedPiiRows(rows, plainKeys) {
  return rows.map((row) => {
    const next = { ...row };
    hydrateAliasedPiiFields(next, plainKeys);
    return next;
  });
}

/** users INSERT/UPDATE SQL fragment helpers */
export const USER_PII_INSERT_COLUMNS =
  'name_enc, name_lookup, phone_enc, phone_lookup, birth_date_enc';

export function userPiiInsertValues(pii) {
  return [
    pii.name_enc,
    pii.name_lookup,
    pii.phone_enc,
    pii.phone_lookup,
    pii.birth_date_enc,
  ];
}

/** identity_verifications — birthday_enc 컬럼, users PII 암호문과 스키마가 다름 */
function isIdentityVerificationRow(row) {
  return row && typeof row === 'object' && 'birthday_enc' in row && !('birth_date_enc' in row);
}

export function autoHydratePiiRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ALIASES = [
    ['author_name', 'author_name_enc'],
    ['sender_name', 'sender_name_enc'],
    ['recipient_name', 'recipient_name_enc'],
    ['parent_sender_name', 'parent_sender_name_enc'],
    ['other_user_name', 'other_user_name_enc'],
    ['recipient_user_name', 'recipient_user_name_enc'],
    ['user_name', 'user_name_enc'],
    ['blocked_name', 'blocked_name_enc'],
  ];
  return rows.map((row) => {
    const next = { ...row };
    if (isIdentityVerificationRow(next)) {
      return next;
    }
    for (const [plain, enc] of ALIASES) {
      if (enc in next || plain in next) {
        hydrateAliasedPiiField(next, plain, enc);
      }
    }
    if ('name_enc' in next || 'phone_enc' in next || 'birth_date_enc' in next) {
      hydrateUserPiiRow(next, ['name', 'phone', 'birth_date']);
    }
    if ('guardian_phone_enc' in next) {
      next.guardian_phone = resolvePiiField(next.guardian_phone_enc);
      delete next.guardian_phone_enc;
    }
    return next;
  });
}

export function phoneLookupWhereClause(tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `${prefix}phone_lookup = ?`;
}

export function phoneLookupBindParams(phone) {
  const normalized = normalizeLocalKrPhone(phone);
  return [hashPhoneLookup(normalized)];
}

export function nameLookupWhereClause(tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `${prefix}name_lookup = ?`;
}

export function nameLookupBindParams(name) {
  const normalized = normalizePiiName(name);
  return [hashNameLookup(normalized)];
}

export function packSubmissionPii({ name, phone, birthDate }) {
  return packUserPii({ name, phone, birthDate });
}

export function hydrateSubmissionRow(row) {
  return hydrateUserPiiRow(row, ['name', 'phone', 'birth_date']);
}

export function hydrateSubmissionRows(rows) {
  return hydrateUserPiiRows(rows, ['name', 'phone', 'birth_date']);
}
