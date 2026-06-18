import { StyleSheet } from 'react-native';
import { fontSizes } from '../../../../styles/colors';

export const CLOUD_VIEWBOX_WIDTH = 280;
export const CLOUD_BODY_X = 14;
/** 퍼프 하단이 본체 안으로 20px+ 파고들도록 본체 상단을 올림 (기존 95 → 68) */
export const CLOUD_BODY_Y = 68;
export const CLOUD_BODY_WIDTH = 252;
export const CLOUD_BODY_RX = 28;
export const CLOUD_TAIL_EXTRA = 41;

const PUFF_RADII = [16, 24, 30, 36, 30, 24, 16];
const PUFF_CY = [80, 72, 62, 52, 62, 72, 80];
const PUFF_OVERLAP_RATIO = 0.4;

function buildPuffCenters(radii, centerCx) {
  const cx = new Array(radii.length);
  const mid = Math.floor(radii.length / 2);
  cx[mid] = centerCx;

  for (let i = mid - 1; i >= 0; i -= 1) {
    const overlap = PUFF_OVERLAP_RATIO * Math.min(radii[i], radii[i + 1]);
    cx[i] = cx[i + 1] - (radii[i] + radii[i + 1] - overlap);
  }

  for (let i = mid + 1; i < radii.length; i += 1) {
    const overlap = PUFF_OVERLAP_RATIO * Math.min(radii[i - 1], radii[i]);
    cx[i] = cx[i - 1] + (radii[i - 1] + radii[i] - overlap);
  }

  return cx;
}

const puffCenters = buildPuffCenters(PUFF_RADII, 133);

export const CLOUD_PUFFS = PUFF_RADII.map((r, index) => ({
  cx: puffCenters[index],
  cy: PUFF_CY[index],
  r,
}));

export const CLOUD_TAIL_OFFSETS = [
  { cx: 80, dy: 7, r: 12 },
  { cx: 62, dy: 20, r: 9 },
  { cx: 47, dy: 30, r: 6 },
  { cx: 36, dy: 37, r: 4 },
];

export function computeCloudMetrics(normalize, optionCount) {
  const cloudWidth = normalize(272);
  const scale = cloudWidth / CLOUD_VIEWBOX_WIDTH;

  const optionRowHeight =
    normalize(11) * 2 + Math.ceil(normalize(fontSizes.lg) * 1.25);
  const dividerHeight = StyleSheet.hairlineWidth * 2;
  const bodyInnerPadding = normalize(10) * 2;

  const bodyContentHeight =
    optionCount * optionRowHeight + (optionCount - 1) * dividerHeight;
  const bodyHeightPx = bodyContentHeight + bodyInnerPadding;
  const bodyHeightViewBox = bodyHeightPx / scale;

  const viewBoxHeight = CLOUD_BODY_Y + bodyHeightViewBox + CLOUD_TAIL_EXTRA;
  const cloudHeight = viewBoxHeight * scale;
  const bodyBottomViewBox = CLOUD_BODY_Y + bodyHeightViewBox;

  return {
    cloudWidth,
    cloudHeight,
    viewBoxHeight,
    bodyHeightViewBox,
    bodyBottomViewBox,
    contentPaddingTop: CLOUD_BODY_Y * scale + normalize(10),
    contentPaddingBottom: CLOUD_TAIL_EXTRA * scale,
    contentPaddingHorizontal: CLOUD_BODY_X * scale + normalize(8),
    scale,
  };
}

export function getTailCircles(bodyBottomViewBox) {
  return CLOUD_TAIL_OFFSETS.map((tail) => ({
    cx: tail.cx,
    cy: bodyBottomViewBox + tail.dy,
    r: tail.r,
  }));
}
