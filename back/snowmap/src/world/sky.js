import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 지금 시각에 맞는 하늘 종류. 새벽·저녁 노을은 evening, 낮은 day, 나머지는 night.
 * @param {Date} [now]
 * @returns {"day"|"evening"|"night"}
 */
export function skyPhaseAt(now = new Date()) {
  const forced = new URLSearchParams(window.location.search).get("sky");
  if (forced && CONFIG.SKY_URLS?.[forced]) return forced;
  const h = now.getHours();
  const inRange = ([from, to]) => h >= from && h < to;
  if ((CONFIG.SKY_EVENING_HOURS || []).some(inRange)) return "evening";
  if (CONFIG.SKY_DAY_HOURS && inRange(CONFIG.SKY_DAY_HOURS)) return "day";
  return "night";
}

function skyUrlFor(phase) {
  return CONFIG.SKY_URLS?.[phase] || CONFIG.SKY_URL;
}

/**
 * 하늘 배경. screen 모드는 이미지를 살짝 확대해 좌우로 천천히 흘려(끝에서 부드럽게 되돌아옴)
 * 이음새 없이 구름이 움직이는 것처럼 보이게 한다. sphere 모드는 하늘 전체를 천천히 돌린다.
 * 사진은 늘리지 않고 화면 비율에 맞춰 잘라 보여 준다(화면을 덮도록 확대).
 * 시간대(낮·노을·밤)에 따라 이미지를 바꾸고, 카페에 있는 동안 시간대가 넘어가면 1분 안에 바뀐다.
 * @param {THREE.Scene} scene
 * @param {{ onPhase?: (phase: string, initial: boolean) => void }} [opts] 시간대가 정해지거나 바뀔 때 (조명 맞추기)
 */
export async function createSky(scene, opts = {}) {
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
    else fitToScreen(tex);
    return tex;
  }

  /** 좌우로 흐를 수 있는 폭(이미지 폭 비율). fitToScreen이 정한다 */
  let driftRange = CONFIG.SKY_DRIFT_RANGE;

  /**
   * 사진 비율을 지키며 화면을 덮게 자른다. 가로는 흐를 여유(SKY_DRIFT_RANGE)를 남기고,
   * 세로는 남는 만큼 잘라 SKY_ANCHOR_Y 위치를 보여 준다.
   */
  function fitToScreen(tex) {
    const img = tex.image;
    const imgAspect = img && img.height ? img.width / img.height : 2;
    const screenAspect = window.innerWidth / Math.max(1, window.innerHeight);
    let visW = 1 - CONFIG.SKY_DRIFT_RANGE;
    let visH = (visW * imgAspect) / screenAspect;
    if (visH > 1) {
      // 화면이 사진보다 세로로 길면 높이를 다 쓰고 가로를 더 자른다
      visH = 1;
      visW = Math.min(1, screenAspect / imgAspect);
    }
    driftRange = Math.max(0, 1 - visW);
    tex.repeat.set(visW, visH);
    const anchor = CONFIG.SKY_ANCHOR_Y ?? 0.5;
    tex.offset.y = (1 - visH) * anchor;
    tex.offset.x = Math.min(tex.offset.x, driftRange);
  }


  let phase = skyPhaseAt();
  // 하늘 이미지를 못 받아도 조명은 시간대에 맞춘다
  opts.onPhase?.(phase, true);
  let texture = await loadTexture(skyUrlFor(phase));
  // 시간대 이미지를 못 받으면 낮 하늘로
  if (!texture && skyUrlFor(phase) !== CONFIG.SKY_URL) texture = await loadTexture(CONFIG.SKY_URL);
  if (!texture) return { texture: null, update() {} };
  scene.background = texture;

  // 화면 크기가 바뀌면(회전 등) 다시 맞춘다
  if (!sphere) {
    window.addEventListener("resize", () => fitToScreen(texture));
  }

  let t = 0;
  let checkAcc = 0;
  let switching = false;

  async function switchTo(next) {
    switching = true;
    const tex = await loadTexture(skyUrlFor(next));
    switching = false;
    if (!tex) return;
    tex.offset.x = Math.min(texture.offset.x, driftRange);
    const old = texture;
    texture = tex;
    phase = next;
    scene.background = tex;
    old.dispose();
    opts.onPhase?.(next, false);
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
    texture.offset.x = p * driftRange;
  }

  return {
    get texture() {
      return texture;
    },
    update,
  };
}
