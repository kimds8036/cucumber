import { CONFIG } from "../config.js";
import { getGraphicsLevel, getGraphicsPreset } from "./graphics.js";

/**
 * 그래픽 품질(낮음·높음)의 해상도 배율을 렌더러에 적용한다.
 * 안티앨리어싱·그림자 종류는 렌더러를 만들 때(core/renderer.js) 정해진다.
 * @param {import("three").WebGLRenderer} renderer
 */
export function applyQuality(renderer) {
  const preset = getGraphicsPreset();
  const dpr = Math.min(window.devicePixelRatio || 1, preset.dprMax);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  // 그림자 맵을 고정해 두므로, 설정이 바뀌면 한 번 다시 그리게 한다
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMappingExposure = CONFIG.TONE_MAPPING_EXPOSURE;
  console.info("[graphics]", { level: getGraphicsLevel(), dpr, ...preset });
  return preset;
}
