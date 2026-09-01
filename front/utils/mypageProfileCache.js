import AsyncStorage from '@react-native-async-storage/async-storage';

export const MYPAGE_PROFILE_CACHE_KEY = '@mypage_profile_cache_v1';
export const ACCOUNT_PROFILE_CACHE_KEY = '@account_profile_cache_v1';

function buildGradeClass(grade, classNumber) {
  const g = Number(grade);
  const c = Number(classNumber);
  if (!Number.isFinite(g) || !Number.isFinite(c) || g < 1 || c < 1) return '';
  return `${g}학년 ${c}반`;
}

export async function readAccountProfileCache() {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeAccountProfileCache(payload) {
  try {
    await AsyncStorage.setItem(
      ACCOUNT_PROFILE_CACHE_KEY,
      JSON.stringify({ ...payload, ts: Date.now() }),
    );
  } catch {
    // ignore
  }
}

/** API 성공 직후 마이페이지·계정관리 캐시 동시 갱신 */
export async function patchMypageProfileCache(patch = {}) {
  const grade =
    patch.grade != null ? Number(patch.grade) : undefined;
  const classNumber =
    patch.classNumber != null ? Number(patch.classNumber) : undefined;

  try {
    const raw = await AsyncStorage.getItem(MYPAGE_PROFILE_CACHE_KEY);
    let userInfo = null;
    if (raw) {
      const parsed = JSON.parse(raw);
      userInfo = parsed?.userInfo || null;
    }
    if (userInfo) {
      const next = { ...userInfo };
      if (patch.school != null) next.school = patch.school;
      if (patch.username != null) {
        const u = String(patch.username).trim();
        next.username = u.startsWith('@') ? u : `@${u}`;
      }
      if (grade != null) next.grade = grade;
      if (classNumber != null) next.classNumber = classNumber;
      if (grade != null || classNumber != null) {
        next.gradeClass = buildGradeClass(
          grade ?? next.grade,
          classNumber ?? next.classNumber,
        );
      }
      await AsyncStorage.setItem(
        MYPAGE_PROFILE_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), userInfo: next }),
      );
    }
  } catch {
    // ignore
  }

  const accountPatch = {};
  if (patch.username != null) {
    accountPatch.username = String(patch.username).replace(/^@+/, '');
  }
  if (grade != null) accountPatch.grade = grade;
  if (classNumber != null) accountPatch.classNumber = classNumber;
  if (patch.school != null) accountPatch.school = patch.school;
  if (patch.schoolName != null) accountPatch.school = patch.schoolName;

  if (Object.keys(accountPatch).length > 0) {
    const prev = (await readAccountProfileCache()) || {};
    await writeAccountProfileCache({ ...prev, ...accountPatch });
  }
}

export function meToAccountCache(me) {
  if (!me) return null;
  return {
    username: me.username || '',
    school: me.school?.name || me.schoolName || '',
    grade: me.grade,
    classNumber: me.classNumber,
  };
}
