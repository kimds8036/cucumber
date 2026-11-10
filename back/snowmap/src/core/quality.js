import { CONFIG } from "../config.js";

const STORAGE_KEY = "studyroom_quality";

/**
 * High / Low 품질 프리셋 적용.
 * @param {import("three").WebGLRenderer} renderer
 * @param {"high"|"low"} level
 */
export function applyQuality(renderer, level) {
  const preset = CONFIG.QUALITY[level] || CONFIG.QUALITY.high;
  const dpr = Math.min(window.devicePixelRatio || 1, preset.dprMax);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = Boolean(preset.shadows);
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
