import * as THREE from "three";
import { CONFIG } from "../config.js";
import { getGraphicsPreset } from "../core/graphics.js";

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
  const shadowSize = getGraphicsPreset().shadowMapSize;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
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

  // ── 시간대별 조명 (낮·노을·밤). 바뀔 때는 SKY_LIGHTING_FADE 초 동안 천천히 넘어간다 ──
  const targets = [
    [hemi, "color", "hemiSky", "hemi"],
    [ambient, "color", "ambientColor", "ambient"],
    [sun, "color", "sunColor", "sun"],
    [key, "color", "keyColor", "key"],
  ];
  let fade = null;

  function readState() {
    return targets.map(([light]) => ({
      color: light.color.clone(),
      ground: light.groundColor ? light.groundColor.clone() : null,
      intensity: light.intensity,
    }));
  }

  /**
   * @param {"day"|"evening"|"night"} phase
   * @param {boolean} [instant] 처음 들어올 때는 바로 맞춘다
   */
  function setSkyPhase(phase, instant = false) {
    const preset = CONFIG.SKY_LIGHTING?.[phase];
    if (!preset) return;
    const to = targets.map(([, , colorKey, intensityKey]) => ({
      color: new THREE.Color(preset[colorKey]),
      ground: intensityKey === "hemi" ? new THREE.Color(preset.hemiGround) : null,
      intensity: preset[intensityKey],
    }));
    const duration = instant ? 0 : CONFIG.SKY_LIGHTING_FADE || 0;
    fade = { from: readState(), to, t: 0, duration };
    update(0);
  }

  function update(dt) {
    if (!fade) return;
    fade.t += dt;
    const k = fade.duration > 0 ? Math.min(1, fade.t / fade.duration) : 1;
    const e = k * k * (3 - 2 * k);
    targets.forEach(([light], i) => {
      const a = fade.from[i];
      const b = fade.to[i];
      light.color.copy(a.color).lerp(b.color, e);
      if (light.groundColor && b.ground) light.groundColor.copy(a.ground).lerp(b.ground, e);
      light.intensity = a.intensity + (b.intensity - a.intensity) * e;
    });
    if (k >= 1) fade = null;
  }

  return {
    hemi,
    ambient,
    sun,
    characterKey: key,
    followKeyTarget,
    setSkyPhase,
    update,
  };
}
