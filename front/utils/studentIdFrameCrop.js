/** login.style.js cardFrame 과 동일 비율 */
export const STUDENT_ID_FRAME_WIDTH_RATIO = 0.8;
export const STUDENT_ID_FRAME_HEIGHT_RATIO = 0.5;

export function getStudentIdFrameSize(screenWidth) {
  const w = Math.max(1, screenWidth);
  return {
    frameWidth: w * STUDENT_ID_FRAME_WIDTH_RATIO,
    frameHeight: w * STUDENT_ID_FRAME_HEIGHT_RATIO,
  };
}

/**
 * CameraView 프리뷰(cover) 기준 가이드 틀 → 실제 사진 픽셀 crop 영역
 */
export function computeCoverCropRect({
  photoWidth,
  photoHeight,
  previewWidth,
  previewHeight,
  frameWidth,
  frameHeight,
}) {
  const pw = Number(photoWidth) || 0;
  const ph = Number(photoHeight) || 0;
  const prevW = Number(previewWidth) || 0;
  const prevH = Number(previewHeight) || 0;

  if (!pw || !ph || !prevW || !prevH) return null;

  const scale = Math.max(prevW / pw, prevH / ph);
  const displayedW = pw * scale;
  const displayedH = ph * scale;
  const offsetX = (prevW - displayedW) / 2;
  const offsetY = (prevH - displayedH) / 2;

  const frameLeft = (prevW - frameWidth) / 2;
  const frameTop = (prevH - frameHeight) / 2;

  let originX = (frameLeft - offsetX) / scale;
  let originY = (frameTop - offsetY) / scale;
  let width = frameWidth / scale;
  let height = frameHeight / scale;

  originX = Math.max(0, Math.round(originX));
  originY = Math.max(0, Math.round(originY));
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));

  if (originX + width > pw) width = pw - originX;
  if (originY + height > ph) height = ph - originY;
  if (width < 8 || height < 8) return null;

  return { originX, originY, width, height };
}

/** 프리뷰 없을 때 사진 중앙에서 틀 비율로 crop */
export function computeCenterFallbackCrop(
  photoWidth,
  photoHeight,
  frameWidth,
  frameHeight,
) {
  const pw = Number(photoWidth) || 0;
  const ph = Number(photoHeight) || 0;
  if (!pw || !ph) return null;

  const frameAspect = frameWidth / frameHeight;
  const photoAspect = pw / ph;

  let width;
  let height;
  if (photoAspect > frameAspect) {
    height = ph;
    width = Math.round(ph * frameAspect);
  } else {
    width = pw;
    height = Math.round(pw / frameAspect);
  }

  const originX = Math.max(0, Math.round((pw - width) / 2));
  const originY = Math.max(0, Math.round((ph - height) / 2));

  return { originX, originY, width, height };
}

export function resolveStudentIdCropRect({
  photoWidth,
  photoHeight,
  previewWidth,
  previewHeight,
  frameWidth,
  frameHeight,
}) {
  return (
    computeCoverCropRect({
      photoWidth,
      photoHeight,
      previewWidth,
      previewHeight,
      frameWidth,
      frameHeight,
    }) ||
    computeCenterFallbackCrop(photoWidth, photoHeight, frameWidth, frameHeight)
  );
}

/** 서버 crop용 0~1 정규화 영역 */
export function cropRectToNormalized(rect, photoWidth, photoHeight) {
  const pw = Number(photoWidth) || 1;
  const ph = Number(photoHeight) || 1;
  return {
    x: rect.originX / pw,
    y: rect.originY / ph,
    width: rect.width / pw,
    height: rect.height / ph,
  };
}
