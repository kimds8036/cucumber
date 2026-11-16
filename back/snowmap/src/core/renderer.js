import * as THREE from "three";
import { CONFIG } from "../config.js";
import { isMobileDevice } from "./device.js";

/**
 * WebGL 렌더러 생성 + AgX / sRGB / 리사이즈.
 */
export function createRenderer(container = document.body) {
  const mobile = isMobileDevice();
  const renderer = new THREE.WebGLRenderer({
    // 폰은 화면 픽셀이 촘촘해서 안티앨리어싱 효과는 작고 비용은 크다
    antialias: !mobile,
    alpha: true,
    powerPreference: mobile ? "default" : "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? CONFIG.MOBILE_DPR_MAX : 2),
  );
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = CONFIG.TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = true;
  // 폰은 가벼운 PCF. 맵이 움직이지 않으니 그림자는 처음 한 번만 그리고 고정한다(requestShadowUpdate)
  renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
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
