import { createWorker } from 'tesseract.js';
import pool from '../config/database.js';

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

/** 생년월일 기준 기대 학교급 (중/고) */
export function inferExpectedSchoolLevel(birthDate) {
  const age = computeAge(birthDate);
  if (age == null) return null;
  if (age >= 12 && age <= 15) return 'middle';
  if (age >= 16 && age <= 19) return 'high';
  if (age < 12) return null;
  return 'high';
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

export async function extractTextFromImageBase64(imageBase64) {
  const raw = String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
  if (!raw) return '';

  const buffer = Buffer.from(raw, 'base64');
  const worker = await createWorker('kor+eng', 1, {
    logger: () => {},
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return String(text || '');
  } finally {
    await worker.terminate();
  }
}

/**
 * 3중 교차 검증: 실명 · 학교급(중/고) · 학교명
 */
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
  if (!nameOk) {
    reasons.push('학생증에서 본인인증 이름을 찾을 수 없습니다.');
  }

  const expectedLevel = inferExpectedSchoolLevel(birthDate);
  const detectedLevel = detectSchoolLevelInText(text);
  let levelOk = true;
  if (expectedLevel && detectedLevel && expectedLevel !== detectedLevel) {
    levelOk = false;
    reasons.push(
      expectedLevel === 'middle'
        ? '나이 대비 중학교 재학으로 보이나, 학생증에 고등학교 정보가 있습니다.'
        : '나이 대비 고등학교 재학으로 보이나, 학생증에 중학교 정보가 있습니다.',
    );
  }

  const schoolKey = normalizeSchoolNameKey(schoolName);
  const schoolOk =
    schoolKey.length >= 2 &&
    (compact.includes(schoolKey) || text.includes(String(schoolName || '').trim()));
  if (!schoolOk) {
    reasons.push('선택한 학교명이 학생증 텍스트와 일치하지 않습니다.');
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
