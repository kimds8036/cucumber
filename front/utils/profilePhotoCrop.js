function finitePositive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getCoverBaseSize(imageWidth, imageHeight, frameSize) {
  const w = finitePositive(imageWidth, 1);
  const h = finitePositive(imageHeight, 1);
  const f = finitePositive(frameSize, 1);
  const scale = f / Math.min(w, h);
  return {
    baseW: Math.max(1, Math.round(w * scale)),
    baseH: Math.max(1, Math.round(h * scale)),
  };
}

export function clampPan(tx, ty, scale, baseW, baseH, frameSize) {
  const s = Math.max(1, finitePositive(scale, 1));
  const maxX = Math.max(0, (baseW * s - frameSize) / 2);
  const maxY = Math.max(0, (baseH * s - frameSize) / 2);
  const x = Number(tx);
  const y = Number(ty);
  return {
    x: Math.min(maxX, Math.max(-maxX, Number.isFinite(x) ? x : 0)),
    y: Math.min(maxY, Math.max(-maxY, Number.isFinite(y) ? y : 0)),
  };
}

export function cropRegionFromTransform({
  scale,
  tx,
  ty,
  baseW,
  baseH,
  frameSize,
}) {
  const s = Math.max(1, finitePositive(scale, 1));
  const w = finitePositive(baseW, 1);
  const h = finitePositive(baseH, 1);
  const f = finitePositive(frameSize, 1);
  const ox = -f / 2 + (w * s) / 2 - (Number(tx) || 0);
  const oy = -f / 2 + (h * s) / 2 - (Number(ty) || 0);
  return {
    x: Math.min(1, Math.max(0, ox / s / w)),
    y: Math.min(1, Math.max(0, oy / s / h)),
    width: Math.min(1, Math.max(0.02, f / s / w)),
    height: Math.min(1, Math.max(0.02, f / s / h)),
  };
}
