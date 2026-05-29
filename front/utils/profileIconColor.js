const PROFILE_INNER_COLOR_BY_ID = {
  1: '#E8FFDD', // lightgreen
  2: '#FFFCD7', // yellow
  3: '#FFF3F3', // red
  4: '#E5F0FF', // blue
  5: '#FFFFFF', // white
};

export const PROFILE_INNER_COLORS = [
  PROFILE_INNER_COLOR_BY_ID[1],
  PROFILE_INNER_COLOR_BY_ID[2],
  PROFILE_INNER_COLOR_BY_ID[3],
  PROFILE_INNER_COLOR_BY_ID[4],
  PROFILE_INNER_COLOR_BY_ID[5],
];

function normalizeProfileColorId(rawColorId) {
  const n = Number(rawColorId);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 5) return n;
  if (n >= 0 && n <= 4) return n + 1;
  return null;
}

export function getProfileInnerColor(rawColorId) {
  const id = normalizeProfileColorId(rawColorId);
  return PROFILE_INNER_COLOR_BY_ID[id] || PROFILE_INNER_COLOR_BY_ID[5];
}

export function getProfileInnerColorBySeed(seed) {
  const n = Number(seed);
  const safe = Number.isFinite(n) ? Math.abs(Math.trunc(n)) : 0;
  const id = (safe % 5) + 1;
  return PROFILE_INNER_COLOR_BY_ID[id];
}
