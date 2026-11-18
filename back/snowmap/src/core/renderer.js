import * as THREE from "three";
import { CONFIG } from "../config.js";
import { getGraphicsLevel, getGraphicsPreset } from "./graphics.js";

/**
 * WebGL 렌더러 생성 + AgX / sRGB / 리사이즈.
 */
export function createRenderer(container = document.body) {
  // 그래픽 품질(낮음·중간·높음)에 따라 안티앨리어싱·해상도·그림자 종류를 정한다
  const preset = getGraphicsPreset();
  const renderer = new THREE.WebGLRenderer({
    antialias: Boolean(preset.antialias),
    alpha: true,
    powerPreference: getGraphicsLevel() === "low" ? "default" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.dprMax));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = CONFIG.TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = true;
  // 낮음·중간은 가벼운 PCF, 높음은 부드러운 그림자. 맵이 움직이지 않으니 그림자는 처음 한 번만 그리고 고정한다
  renderer.shadowMap.type = preset.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  container.appendChild(renderer.domElement);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", resize);

  return {
    renderer,
    resize,
    dispose() {
      window.removeEventListener("resize", resize);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
