/** 한글 초성 유틸 (2~3칸) */

export const CHOSEONG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ',
  'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export const PLAYABLE_CHOSEONG = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export function getChoseong(char) {
  const code = String(char || '').charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return CHOSEONG_LIST[Math.floor(code / 588)];
}

export function wordToChoseong(word) {
  const chars = Array.from(String(word || ''));
  const out = [];
  for (const ch of chars) {
    const c = getChoseong(ch);
    if (!c) return null;
    out.push(c);
  }
  return out.join('');
}

/** 초성 배열(2 또는 3)과 단어 앞글자 초성 일치 */
export function matchesChoseong(word, choseongList) {
  const list = Array.isArray(choseongList) ? choseongList : [];
  const got = wordToChoseong(word);
  if (!got || got.length < list.length) return false;
  for (let i = 0; i < list.length; i += 1) {
    if (got[i] !== list[i]) return false;
  }
  return true;
}

/** @deprecated matchesChoseong 사용 */
export function matchesChoseongPair(word, cho1, cho2, cho3) {
  const list = [cho1, cho2, cho3].filter(Boolean);
  return matchesChoseong(word, list);
}

export function randomChoseongSet() {
  const len = Math.random() < 0.45 ? 3 : 2;
  const arr = [];
  for (let i = 0; i < len; i += 1) {
    arr.push(
      PLAYABLE_CHOSEONG[Math.floor(Math.random() * PLAYABLE_CHOSEONG.length)],
    );
  }
  return arr;
}

export function randomChoseongPair() {
  return randomChoseongSet();
}
