import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 맵 전역 조명 + 캐릭터용 월드 고정 키 라이트.
 * 키 라이트는 절대 캐릭터/카메라 child가 되면 안 됨.
 * target 위치만 캐릭터 근처로 옮기고, light.position = target + 고정 오프셋
 * → 방향(각도)은 항상 동일.
 */
export function createWorldLights(scene) {
  const hemi = new THREE.HemisphereLight(0xe8f3ff, 0xc4b8a8, 0.62);
  hemi.name = "hemi";
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  ambient.name = "ambient";
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e6, 1.7);
  sun.name = "sun";
  sun.position.set(6, 14, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  const span = 12;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  sun.shadow.bias = -0.00035;
  scene.add(sun);
  scene.add(sun.target);

  const key = new THREE.DirectionalLight(0xfff1e4, CONFIG.CHARACTER_KEY_INTENSITY);
  key.name = "characterKeyWorld";
  key.castShadow = false;
  scene.add(key);
  scene.add(key.target);

  const offset = CONFIG.CHARACTER_KEY_OFFSET;

  function followKeyTarget(x, y, z) {
    key.target.position.set(x, y, z);
    key.position.set(x + offset.x, y + offset.y, z + offset.z);
    key.target.updateMatrixWorld();
  }

  // 초기: 스폰 근처
  followKeyTarget(CONFIG.SPAWN.x, 1.0, CONFIG.SPAWN.z);

  console.info("[lights]", {
    hemi: hemi.intensity,
    ambient: ambient.intensity,
    sun: sun.intensity,
    characterKeyWorld: {
      intensity: key.intensity,
      worldFixed: true,
      parent: "scene",
      offset,
    },
    note: "캐릭터 Point/Spot/Hemisphere fill 없음",
  });

  return {
    hemi,
    ambient,
    sun,
    characterKey: key,
    followKeyTarget,
  };
}
