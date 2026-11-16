import { CONFIG } from "../config.js";
import { isMobileDevice } from "./device.js";

const STORAGE_KEY = "studyroom_quality";

/**
 * High / Low 품질 프리셋 적용.
 * @param {import("three").WebGLRenderer} renderer
 * @param {"high"|"low"} level
 */
export function applyQuality(renderer, level) {
  const preset = CONFIG.QUALITY[level] || CONFIG.QUALITY.high;
  const dprMax = isMobileDevice() ? Math.min(preset.dprMax, CONFIG.MOBILE_DPR_MAX) : preset.dprMax;
  const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = Boolean(preset.shadows);
  // 그림자 맵을 고정해 두므로, 설정이 바뀌면 한 번 다시 그리게 한다
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMappingExposure = preset.exposure ?? CONFIG.TONE_MAPPING_EXPOSURE;
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
  return preset;
}

export function loadSavedQuality() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "low" || v === "high") return v;
  } catch {
    /* ignore */
  }
  return "high";
}
