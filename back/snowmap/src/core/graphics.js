import { CONFIG } from "../config.js";
import { isMobileDevice } from "./device.js";

/**
 * 그래픽 품질 단계. 앱 타이머 설정에서 고른 값이 주소 ?quality=low|medium|high 로 온다.
 * 값이 없으면 폰은 low(발열 적게), PC 브라우저는 high.
 * @returns {"low"|"medium"|"high"}
 */
let cached = null;

export function getGraphicsLevel() {
  if (cached) return cached;
  let level = null;
  try {
    const q = String(new URLSearchParams(window.location.search).get("quality") || "").toLowerCase();
    if (q === "low" || q === "medium" || q === "high") level = q;
  } catch {
    /* ignore */
  }
  cached = level || (isMobileDevice() ? "low" : "high");
  return cached;
}

/** 지금 단계의 설정값 (CONFIG.GRAPHICS) */
export function getGraphicsPreset() {
  return CONFIG.GRAPHICS[getGraphicsLevel()] || CONFIG.GRAPHICS.low;
}
