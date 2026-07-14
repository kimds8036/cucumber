import { Image } from 'react-native';

export const TIMER_CAPTURE_WATERMARK = require('../../../assets/youthpaper_watermark.png');

let watermarkPreloadPromise = null;

/** 타이머 캡처용 워터마크 — 저장 전 디코드 완료 보장 */
export function preloadTimerCaptureWatermark() {
  if (!watermarkPreloadPromise) {
    const source = Image.resolveAssetSource(TIMER_CAPTURE_WATERMARK);
    const uri = source?.uri;
    watermarkPreloadPromise = uri
      ? Image.prefetch(uri).catch((error) => {
          watermarkPreloadPromise = null;
          console.warn('[TimerCapture] watermark prefetch failed:', error);
          throw error;
        })
      : Promise.resolve();
  }
  return watermarkPreloadPromise;
}

export function waitForTimerCapturePaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}
