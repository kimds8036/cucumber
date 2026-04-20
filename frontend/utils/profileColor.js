import { colors } from '../styles/colors';

const COLOR_ID_TO_HEX = {
  1: colors.red,
  2: colors.yellow,
  3: colors.lightgreen,
  4: colors.blue,
  5: colors.white,
};

export function getProfileHexByColorId(colorId, fallback = colors.white) {
  const id = Number(colorId);
  if (!Number.isFinite(id)) return fallback;
  return COLOR_ID_TO_HEX[id] || fallback;
}

