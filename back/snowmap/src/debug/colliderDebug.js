import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 충돌체 와이어프레임 디버그.
 * F2(기본)로 토글. 카테고리별 색.
 * floor/stair는 메시 바운딩 박스로 표시 (솔리드가 아님을 구분).
 */
export function createColliderDebug(scene, collisionWorld) {
  const root = new THREE.Group();
  root.name = "colliderDebug";
  root.visible = false;
  scene.add(root);

  const colors = CONFIG.COLLIDER_DEBUG_COLORS;
  /** @type {THREE.Box3Helper[]} */
  const helpers = [];

  for (const solid of collisionWorld.solids) {
    const helper = new THREE.Box3Helper(solid.box, colors[solid.kind] || 0xffffff);
    helper.userData.kind = solid.kind;
    root.add(helper);
    helpers.push(helper);
  }

  // 바닥/계단: 시각 확인용으로만 AABB 표시 (살짝 투명한 다른 톤)
  for (const floor of collisionWorld.floors) {
    const box = new THREE.Box3().setFromObject(floor.mesh);
    const helper = new THREE.Box3Helper(box, colors[floor.kind] || 0x88ff88);
    helper.userData.kind = floor.kind;
    root.add(helper);
    helpers.push(helper);
  }

  let on = false;

  function setEnabled(enabled) {
    on = enabled;
    root.visible = on;
    console.info("[collider-debug]", on ? "ON" : "OFF", {
      helpers: helpers.length,
      solids: collisionWorld.solids.length,
      floors: collisionWorld.floors.length,
    });
  }

  function toggle() {
    setEnabled(!on);
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === CONFIG.DEBUG_COLLIDER_KEY || event.code === "F2") {
      event.preventDefault();
      toggle();
    }
  }

  window.addEventListener("keydown", onKeyDown);

  return {
    get enabled() {
      return on;
    },
    setEnabled,
    toggle,
    /** 문 AABB 갱신 후 헬퍼가 같은 Box3를 보고 있으면 자동 반영됨 */
    refresh() {
      if (!on) return;
      collisionWorld.syncDynamic?.();
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      scene.remove(root);
      for (const h of helpers) {
        h.geometry?.dispose?.();
        h.material?.dispose?.();
      }
    },
  };
}
