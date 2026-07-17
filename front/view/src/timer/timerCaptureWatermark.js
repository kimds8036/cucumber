import { Image } from 'react-native';

export const TIMER_CAPTURE_WATERMARK = require('../../../assets/youthpaper_watermark.png');

let watermarkPreloadPromise = null;

function isHttpUri(uri) {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri);
}

/**
 * 타이머 캡처용 워터마크 사전 로드.
 * 번들 require 에셋(Android drawable id 등)은 Image.prefetch 가 지원하지 않음 —
 * 화면의 <Image source={require(...)} /> onLoad 로 디코드를 기다린다.
 * 원격 http(s) URI 만 prefetch.
 */
export function preloadTimerCaptureWatermark() {
  if (!watermarkPreloadPromise) {
    const source = Image.resolveAssetSource(TIMER_CAPTURE_WATERMARK);
    const uri = source?.uri;
    watermarkPreloadPromise = isHttpUri(uri)
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
