import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 하늘 배경. screen 모드는 이미지를 살짝 확대해 좌우로 천천히 흘려(끝에서 부드럽게 되돌아옴)
 * 이음새 없이 구름이 움직이는 것처럼 보이게 한다. sphere 모드는 하늘 전체를 천천히 돌린다.
 * @param {THREE.Scene} scene
 */
export async function createSky(scene) {
  const texture = await new THREE.TextureLoader().loadAsync(CONFIG.SKY_URL).catch((err) => {
    console.warn("[sky] 배경 이미지 로드 실패", err);
    return null;
  });
  if (!texture) return { texture: null, update() {} };

  texture.colorSpace = THREE.SRGBColorSpace;
  const sphere = CONFIG.SKY_MODE === "sphere";
  if (sphere) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
  } else {
    texture.repeat.set(1 - CONFIG.SKY_DRIFT_RANGE, 1);
  }
  scene.background = texture;

  let t = 0;
  function update(dt) {
    if (!CONFIG.SKY_DRIFT_SPEED) return;
    t += dt;
    if (sphere) {
      scene.backgroundRotation.y = t * CONFIG.SKY_DRIFT_SPEED * 0.05;
      return;
    }
    const phase = (1 - Math.cos(t * CONFIG.SKY_DRIFT_SPEED)) * 0.5;
    texture.offset.x = phase * CONFIG.SKY_DRIFT_RANGE;
  }

  return { texture, update };
}
