export function getCoverBaseSize(imageWidth, imageHeight, frameSize) {
  const w = Number(imageWidth) || 1;
  const h = Number(imageHeight) || 1;
  const f = Number(frameSize) || 1;
  const scale = f / Math.min(w, h);
  return {
    baseW: w * scale,
    baseH: h * scale,
  };
}

export function clampPan(tx, ty, scale, baseW, baseH, frameSize) {
  const s = Math.max(1, Number(scale) || 1);
  const maxX = Math.max(0, (baseW * s - frameSize) / 2);
  const maxY = Math.max(0, (baseH * s - frameSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, tx)),
    y: Math.min(maxY, Math.max(-maxY, ty)),
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
  const s = Math.max(1, Number(scale) || 1);
  const ox = -frameSize / 2 + (baseW * s) / 2 - tx;
  const oy = -frameSize / 2 + (baseH * s) / 2 - ty;
  return {
    x: Math.min(1, Math.max(0, ox / s / baseW)),
    y: Math.min(1, Math.max(0, oy / s / baseH)),
    width: Math.min(1, Math.max(0.02, frameSize / s / baseW)),
    height: Math.min(1, Math.max(0.02, frameSize / s / baseH)),
  };
}
