import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * F3: 좌석 표면(노랑), 접근 지점(파랑), 앉는 방향(화살표), 골반(빨강).
 * @param {THREE.Scene} scene
 * @param {{ seats: Array<any>, getActiveSeat: () => any }} interact
 * @param {{ getHips: () => THREE.Object3D|null }} characterRef
 */
export function createSeatDebug(scene, interact, characterRef) {
  const root = new THREE.Group();
  root.name = "seatDebug";
  root.visible = false;
  scene.add(root);

  const surfaceMat = new THREE.MeshBasicMaterial({ color: 0xffd978, depthTest: false });
  const approachMat = new THREE.MeshBasicMaterial({ color: 0x6eb6ff, depthTest: false });
  const hipsMat = new THREE.MeshBasicMaterial({ color: 0xff5a5a, depthTest: false });
  const geo = new THREE.SphereGeometry(0.06, 8, 8);

  const markers = interact.seats.map((seat) => {
    const surface = new THREE.Mesh(geo, surfaceMat);
    surface.position.set(seat.surface.x, seat.surface.y, seat.surface.z);
    surface.renderOrder = 10;
    const approach = new THREE.Mesh(geo, approachMat);
    approach.renderOrder = 10;
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw)),
      new THREE.Vector3(seat.surface.x, seat.surface.y + 0.05, seat.surface.z),
      0.35,
      0xffe08a,
      0.08,
      0.05
    );
    root.add(surface, approach, arrow);
    return { seat, approach };
  });

  const _hipsPos = new THREE.Vector3();
  const hipsMarker = new THREE.Mesh(geo, hipsMat);
  hipsMarker.renderOrder = 11;
  hipsMarker.visible = false;
  root.add(hipsMarker);

  let on = false;

  function refresh() {
    if (!on) return;
    for (const marker of markers) {
      const point = marker.seat.approach;
      const dist = CONFIG.SEAT_APPROACH_DISTANCE;
      if (point) marker.approach.position.set(point.x, point.y, point.z);
      else if (marker.seat.front) {
        marker.approach.position.set(marker.seat.front.x, marker.seat.surface.y, marker.seat.front.z);
      } else {
        marker.approach.position.set(
          marker.seat.surface.x + Math.sin(marker.seat.yaw) * dist,
          marker.seat.surface.y,
          marker.seat.surface.z + Math.cos(marker.seat.yaw) * dist
        );
      }
    }
    const hips = characterRef.getHips?.();
    if (hips) {
      hipsMarker.visible = true;
      hipsMarker.position.copy(hips.getWorldPosition(_hipsPos));
    } else {
      hipsMarker.visible = false;
    }
  }

  function setEnabled(enabled) {
    on = enabled;
    root.visible = on;
    refresh();
    console.info("[seat-debug-view]", on ? "ON" : "OFF");
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === CONFIG.DEBUG_SEAT_KEY || event.code === "F3") {
      event.preventDefault();
      setEnabled(!on);
    }
  }

  window.addEventListener("keydown", onKeyDown);

  return {
    refresh,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      scene.remove(root);
    },
  };
}
