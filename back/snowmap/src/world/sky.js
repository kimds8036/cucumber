import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 지금 시각에 맞는 하늘 종류. 새벽·노을은 morning, 낮은 day, 나머지는 night.
 * @param {Date} [now]
 * @returns {"day"|"morning"|"night"}
 */
export function skyPhaseAt(now = new Date()) {
  const forced = new URLSearchParams(window.location.search).get("sky");
  if (forced && CONFIG.SKY_URLS?.[forced]) return forced;
  const h = now.getHours();
  const inRange = ([from, to]) => h >= from && h < to;
  if ((CONFIG.SKY_MORNING_HOURS || []).some(inRange)) return "morning";
  if (CONFIG.SKY_DAY_HOURS && inRange(CONFIG.SKY_DAY_HOURS)) return "day";
  return "night";
}

function skyUrlFor(phase) {
  return CONFIG.SKY_URLS?.[phase] || CONFIG.SKY_URL;
}

/**
 * 하늘 배경. screen 모드는 이미지를 살짝 확대해 좌우로 천천히 흘려(끝에서 부드럽게 되돌아옴)
 * 이음새 없이 구름이 움직이는 것처럼 보이게 한다. sphere 모드는 하늘 전체를 천천히 돌린다.
 * 시간대(새벽·낮·노을·밤)에 따라 이미지를 바꾸고, 카페에 있는 동안 시간대가 넘어가면 1분 안에 바뀐다.
 * @param {THREE.Scene} scene
 */
export async function createSky(scene) {
  const loader = new THREE.TextureLoader();
  const sphere = CONFIG.SKY_MODE === "sphere";

  async function loadTexture(url) {
    const tex = await loader.loadAsync(url).catch((err) => {
      console.warn("[sky] 배경 이미지 로드 실패", url, err);
      return null;
    });
    if (!tex) return null;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (sphere) tex.mapping = THREE.EquirectangularReflectionMapping;
    else tex.repeat.set(1 - CONFIG.SKY_DRIFT_RANGE, 1);
    return tex;
  }

  let phase = skyPhaseAt();
  let texture = await loadTexture(skyUrlFor(phase));
  // 시간대 이미지를 못 받으면 낮 하늘로
  if (!texture && skyUrlFor(phase) !== CONFIG.SKY_URL) texture = await loadTexture(CONFIG.SKY_URL);
  if (!texture) return { texture: null, update() {} };
  scene.background = texture;

  let t = 0;
  let checkAcc = 0;
  let switching = false;

  async function switchTo(next) {
    switching = true;
    const tex = await loadTexture(skyUrlFor(next));
    switching = false;
    if (!tex) return;
    tex.offset.copy(texture.offset);
    const old = texture;
    texture = tex;
    phase = next;
    scene.background = tex;
    old.dispose();
  }

  function update(dt) {
    t += dt;
    checkAcc += dt;
    if (checkAcc >= 60 && !switching) {
      checkAcc = 0;
      const next = skyPhaseAt();
      if (next !== phase) switchTo(next);
    }
    if (!CONFIG.SKY_DRIFT_SPEED) return;
    if (sphere) {
      scene.backgroundRotation.y = t * CONFIG.SKY_DRIFT_SPEED * 0.05;
      return;
    }
    const p = (1 - Math.cos(t * CONFIG.SKY_DRIFT_SPEED)) * 0.5;
    texture.offset.x = p * CONFIG.SKY_DRIFT_RANGE;
  }

  return {
    get texture() {
      return texture;
    },
    update,
  };
}
