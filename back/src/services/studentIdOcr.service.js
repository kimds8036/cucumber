import pool from '../config/database.js';
import { cropBase64Image } from '../utils/imageCrop.js';
import { recognizeImageBuffer } from './naverClovaOcr.service.js';
import {
  buildSafeSchoolSearchTerm,
  buildSchoolSearchSql,
  schoolSearchParams,
} from '../utils/schoolSearch.js';

function computeAge(birthDate, ref = new Date()) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** 생년월일 기준 기대 학교급 (중/고). 그 외 연령은 null */
export function inferExpectedSchoolLevel(birthDate) {
  const age = computeAge(birthDate);
  if (age == null) return null;
  if (age < 14) return null;
  if (age >= 12 && age <= 15) return 'middle';
  if (age >= 16 && age <= 19) return 'high';
  return null;
}

export function detectSchoolLevelInText(text) {
  const t = String(text || '');
  if (/고등학교|고등\s*학교|고교/.test(t)) return 'high';
  if (/중학교|중학\s*교|중교/.test(t)) return 'middle';
  return null;
}

function normalizeSchoolNameKey(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/초등학교|중학교|고등학교|학교/g, '')
    .trim();
}

function schoolLevelFromRow(row) {
  const bundle = `${row?.school_level || ''} ${row?.school_type || ''} ${row?.name || ''}`;
  if (/고/.test(bundle) && !/중학/.test(bundle)) return 'high';
  if (/중/.test(bundle)) return 'middle';
  return null;
}

export function extractSchoolNameCandidates(ocrText) {
  const text = String(ocrText || '');
  const found = text.match(/[0-9가-힣]+(?:중학교|고등학교|학교)/g) || [];
  const set = new Set(found.map((s) => s.trim()).filter((s) => s.length >= 3));
  return [...set];
}

/** OCR 텍스트에서 schools DB 검색으로 학교 유추 */
export async function inferSchoolFromOcrText(ocrText, birthDate) {
  const expectedLevel = inferExpectedSchoolLevel(birthDate);
  const compact = String(ocrText || '').replace(/\s+/g, '');
  const candidates = extractSchoolNameCandidates(ocrText);

  for (const cand of candidates) {
    const safe = buildSafeSchoolSearchTerm(cand);
    if (!safe) continue;
    const [rows] = await pool.execute(
      buildSchoolSearchSql(8),
      schoolSearchParams(safe),
    );
    for (const row of rows) {
      const rowLevel = schoolLevelFromRow(row);
      if (expectedLevel && rowLevel && rowLevel !== expectedLevel) continue;
      const key = normalizeSchoolNameKey(row.name);
      if (
        compact.includes(key) ||
        String(ocrText).includes(row.name) ||
        String(ocrText).includes(cand)
      ) {
        return row;
      }
    }
  }

  return null;
}

/** base64 학생증 이미지 → CLOVA General OCR 텍스트 */
export async function extractTextFromImageBase64(imageBase64, cropRegion = null) {
  const raw = String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
  if (!raw) return '';

  let buffer = Buffer.from(raw, 'base64');
  if (cropRegion && typeof cropRegion === 'object') {
    buffer = await cropBase64Image(imageBase64, cropRegion);
  }
  return recognizeImageBuffer(buffer);
}

/**
 * 가입용 3중 검증: 실명 · 학교급(생년월일) · OCR 학교 유추
 */
export async function verifyStudentIdOcrForSignup({
  ocrText,
  verifiedName,
  birthDate,
}) {
  const reasons = [];
  const text = String(ocrText || '');

  const expectedLevel = inferExpectedSchoolLevel(birthDate);
  if (!expectedLevel) {
    return {
      passed: false,
      reasons: ['중·고등학생 연령이 아닙니다.'],
      nameOk: false,
      levelOk: false,
      schoolOk: false,
      expectedLevel: null,
      detectedLevel: null,
      school: null,
    };
  }

  const name = String(verifiedName || '').trim();
  const nameOk = name.length >= 2 && text.includes(name);
  if (!nameOk) {
    reasons.push('학생증에서 본인인증 이름을 찾을 수 없습니다.');
  }

  const detectedLevel = detectSchoolLevelInText(text);
  let levelOk = true;
  if (detectedLevel && expectedLevel !== detectedLevel) {
    levelOk = false;
    reasons.push(
      expectedLevel === 'middle'
        ? '나이 대비 중학교 재학으로 보이나, 학생증에 고등학교 정보가 있습니다.'
        : '나이 대비 고등학교 재학으로 보이나, 학생증에 중학교 정보가 있습니다.',
    );
  }

  const schoolRow = await inferSchoolFromOcrText(text, birthDate);
  const schoolOk = Boolean(schoolRow);
  if (!schoolOk) {
    reasons.push(
      '학생증에서 학교를 찾지 못했습니다. 학교명이 선명하게 보이도록 다시 촬영해 주세요.',
    );
  }

  const passed = nameOk && levelOk && schoolOk;

  return {
    passed,
    nameOk,
    levelOk,
    schoolOk,
    reasons,
    expectedLevel,
    detectedLevel,
    school: schoolRow
      ? {
          id: schoolRow.school_id,
          name: schoolRow.name,
          region: schoolRow.region || '',
        }
      : null,
    ocrTextPreview: text.slice(0, 500),
  };
}

export async function loadSchoolById(schoolId) {
  const [rows] = await pool.execute(
    `SELECT school_id, name, region, school_level, school_type
     FROM schools WHERE school_id = ? LIMIT 1`,
    [schoolId],
  );
  return rows[0] || null;
}

/** @deprecated 가입 플로우는 verifyStudentIdOcrForSignup 사용 */
export function verifyStudentIdOcr({
  ocrText,
  verifiedName,
  birthDate,
  schoolName,
}) {
  const reasons = [];
  const text = String(ocrText || '');
  const compact = text.replace(/\s+/g, '');

  const name = String(verifiedName || '').trim();
  const nameOk = name.length >= 2 && text.includes(name);
  if (!nameOk) reasons.push('학생증에서 본인인증 이름을 찾을 수 없습니다.');

  const expectedLevel = inferExpectedSchoolLevel(birthDate);
  const detectedLevel = detectSchoolLevelInText(text);
  let levelOk = true;
  if (expectedLevel && detectedLevel && expectedLevel !== detectedLevel) {
    levelOk = false;
    reasons.push('학교급이 생년월일과 일치하지 않습니다.');
  }

  const schoolKey = normalizeSchoolNameKey(schoolName);
  const schoolOk =
    schoolKey.length >= 2 &&
    (compact.includes(schoolKey) || text.includes(String(schoolName || '').trim()));
  if (!schoolOk) reasons.push('학교명이 학생증과 일치하지 않습니다.');

  return {
    passed: nameOk && levelOk && schoolOk,
    nameOk,
    levelOk,
    schoolOk,
    reasons,
    expectedLevel,
    detectedLevel,
    ocrTextPreview: text.slice(0, 500),
  };
}
