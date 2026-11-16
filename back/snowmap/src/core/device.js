/**
 * 폰(앱 WebView·모바일 브라우저)인지. 발열을 줄이려고 폰에서는 해상도·그림자·반사를 낮춘다.
 */
let cached = null;

export function isMobileDevice() {
  if (cached != null) return cached;
  try {
    const ua = navigator.userAgent || "";
    cached = Boolean(
      window.ReactNativeWebView ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
        window.matchMedia?.("(pointer: coarse)")?.matches,
    );
  } catch {
    cached = false;
  }
  return cached;
}
