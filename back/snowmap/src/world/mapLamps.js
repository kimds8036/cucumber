import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 맵 램프/트리/루돌프 토글.
 * - lights-colored: 등록 안 함 → 항상 켜짐
 * - OFF 시 메시는 유지, emissive + PointLight만 끔 (에셋 사라짐 방지)
 * - desk: 앉았을 때만 자동 점등
 */

/**
 * @param {string} name
 * @returns {"desk"|"street"|"tree"|"rudolph"|"lamp"|null}
 */
export function classifyLampKind(name) {
  const n = name || "";
  if (/lights-colored/i.test(n)) return null;
  if (/reindeer/i.test(n)) return "rudolph";
  if (/tree-decorated/i.test(n)) return "tree";
  if (/lantern/i.test(n)) return "street";
  if (/Light_Desk|Light_Ceiling|desk|_bright|bright\./i.test(n)) return "desk";
  if (/Light_/i.test(n)) return "desk";
  return null;
}

function meshMaterials(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function meshHasEmissive(mesh) {
  return meshMaterials(mesh).some((mat) => mat?.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.02);
}

/**
 * 가로등 머리는 메시마다 on/off 머티리얼을 따로 가진다.
 * 꺼짐은 밝은 유리 텍스처를 빼고 어두운 단색만 쓴다.
 * @param {THREE.Mesh} mesh
 * @param {"street"|"desk"|"tree"|"rudolph"|"lamp"} kind
 */
function buildGlowMaterials(mesh, kind) {
  if (mesh.userData._lampOnMat) return;
  const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!src) return;
  const onMat = src.clone();
  const offMat = src.clone();
  if (kind === "street") {
    onMat.emissive = new THREE.Color(CONFIG.LANTERN_ON_EMISSIVE_COLOR);
    onMat.emissiveIntensity = CONFIG.LANTERN_ON_EMISSIVE;
    offMat.map = null;
    offMat.emissive = new THREE.Color(0x000000);
    offMat.emissiveIntensity = 0;
    offMat.color = new THREE.Color(CONFIG.LANTERN_OFF_COLOR);
    offMat.metalness = 0;
    offMat.roughness = 1;
  } else {
    offMat.emissive = new THREE.Color(0x000000);
    offMat.emissiveIntensity = 0;
  }
  mesh.userData._lampOnMat = onMat;
  mesh.userData._lampOffMat = offMat;
  mesh.userData._lampGlow = true;
}

function applyMeshGlow(mesh, on) {
  mesh.visible = true;
  if (!mesh.userData._lampGlow) return;
  mesh.material = on ? mesh.userData._lampOnMat : mesh.userData._lampOffMat;
}

/**
 * @param {THREE.Object3D} mapRoot
 * @param {THREE.Scene} scene
 */
export function createMapLamps(mapRoot, scene) {
  /** @type {Array<any>} */
  const lamps = [];

  mapRoot.updateMatrixWorld(true);
  mapRoot.traverse((child) => {
    if (!child.isMesh) return;
    const kind = classifyLampKind(child.name || "");
    if (!kind) return;
    registerLamp(child, kind);
  });

  function isExactDuplicate(childBox) {
    if (!CONFIG.HIDE_DUPLICATE_MESHES) return false;
    const center = childBox.getCenter(new THREE.Vector3());
    const size = childBox.getSize(new THREE.Vector3());
    for (const item of lamps) {
      for (const mesh of item.meshes) {
        const prev = mesh.userData._lampBox;
        if (!prev) continue;
        if (center.distanceTo(prev.center) > 0.02) continue;
        if (Math.abs(size.x - prev.size.x) > 0.02) continue;
        if (Math.abs(size.y - prev.size.y) > 0.02) continue;
        if (Math.abs(size.z - prev.size.z) > 0.02) continue;
        return true;
      }
    }
    return false;
  }

  function attachMesh(item, child, box, glow) {
    child.userData._lampBox = {
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };
    item.meshes.push(child);
    if (!glow) return;
    buildGlowMaterials(child, item.kind);
    const center = child.userData._lampBox.center;
    if (item.light) item.light.position.set(center.x, center.y, center.z);
  }

  function registerLamp(child, kind) {
    const box = new THREE.Box3().setFromObject(child);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const mergeDistance =
      kind === "tree" ? 1.4 : kind === "rudolph" ? 1.0 : kind === "street" ? 0.7 : 0.55;
    const glow = meshHasEmissive(child);

    const existing = lamps.find(
      (item) => item.kind === kind && Math.hypot(item.x - center.x, item.z - center.z) < mergeDistance
    );
    if (existing) {
      if (isExactDuplicate(box)) {
        child.visible = false;
        return;
      }
      attachMesh(existing, child, box, glow);
      return;
    }

    const intensity =
      kind === "tree"
        ? CONFIG.TREE_POINT_INTENSITY
        : kind === "street"
          ? CONFIG.LANTERN_POINT_INTENSITY
          : CONFIG.LAMP_POINT_INTENSITY;
    const distance =
      kind === "tree"
        ? CONFIG.TREE_POINT_DISTANCE
        : kind === "street"
          ? CONFIG.LANTERN_POINT_DISTANCE
          : CONFIG.LAMP_POINT_DISTANCE;
    const color =
      kind === "rudolph" ? 0xff3b3b : kind === "tree" ? 0xffb35c : 0xffd27a;

    const point = new THREE.PointLight(color, intensity, distance, 2);
    point.position.set(center.x, glow ? center.y : center.y + 0.35, center.z);
    scene.add(point);

    const item = {
      kind,
      meshes: [],
      x: center.x,
      y: center.y,
      z: center.z,
      range: Math.max(size.x, size.z, 0.8) * 0.7 + 0.85,
      on: true,
      light: point,
      baseIntensity: intensity,
      autoDesk: false,
    };
    attachMesh(item, child, box, glow);
    lamps.push(item);
    if (kind === "desk") setLampOn(item, false);
    else if (glow) applyMeshGlow(child, true);
  }

  // 기둥 뒤에 붙는 머리도 켜진 머티리얼로 맞춘다.
  for (const item of lamps) {
    if (item.kind === "desk") continue;
    for (const mesh of item.meshes) {
      if (mesh.userData._lampGlow) applyMeshGlow(mesh, item.on);
    }
  }

  function setLampOn(item, on) {
    item.on = on;
    for (const mesh of item.meshes) applyMeshGlow(mesh, on);
    if (item.light) {
      item.light.visible = true;
      item.light.intensity = on ? item.baseIntensity : 0;
    }
  }

  function setStreetLamps(on) {
    for (const item of lamps) {
      if (item.kind === "street") setLampOn(item, on);
    }
  }

  function streetLampState() {
    let on = 0;
    let total = 0;
    for (const item of lamps) {
      if (item.kind !== "street") continue;
      total += 1;
      if (item.on) on += 1;
    }
    return { on, total };
  }

  /**
   * on/off 머티리얼을 한 번씩 씬에 올려 셰이더를 미리 컴파일한다.
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  function warmShaders(renderer, scene, camera) {
    /** @type {Array<[THREE.Mesh, THREE.Material]>} */
    const saved = [];
    const lightSaved = lamps.map((item) => item.light?.intensity ?? 0);
    for (const item of lamps) {
      if (item.light) item.light.intensity = item.baseIntensity;
      for (const mesh of item.meshes) {
        if (!mesh.userData._lampOffMat) continue;
        saved.push([mesh, mesh.material]);
      }
    }
    for (const [mesh] of saved) mesh.material = mesh.userData._lampOffMat;
    renderer.compile(scene, camera);
    for (const [mesh] of saved) mesh.material = mesh.userData._lampOnMat;
    renderer.compile(scene, camera);
    for (const [mesh, mat] of saved) mesh.material = mat;
    lamps.forEach((item, i) => {
      if (item.light) item.light.intensity = lightSaved[i];
    });
  }

  function toggleLamp(item) {
    setLampOn(item, !item.on);
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {{ deskOnly?: boolean, excludeDesk?: boolean }} [opts]
   */
  function nearestLamp(x, z, opts = {}) {
    let best = null;
    let bestDist = Infinity;
    for (const item of lamps) {
      if (opts.deskOnly && item.kind !== "desk") continue;
      if (opts.excludeDesk && item.kind === "desk") continue;
      const range = opts.deskOnly ? item.range * 1.35 : item.range;
      const d = Math.hypot(item.x - x, item.z - z);
      if (d <= range && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    return best;
  }

  function onSeated(x, z) {
    const desk = nearestLamp(x, z, { deskOnly: true });
    if (!desk) return null;
    desk.autoDesk = true;
    setLampOn(desk, true);
    return desk;
  }

  function onStoodUp() {
    for (const item of lamps) {
      if (item.kind !== "desk" || !item.autoDesk) continue;
      item.autoDesk = false;
      setLampOn(item, false);
    }
  }

  const counts = lamps.reduce((acc, l) => {
    acc[l.kind] = (acc[l.kind] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  console.info("[mapLamps]", { total: lamps.length, counts, note: "OFF=emissive/light only, mesh kept" });

  return {
    lamps,
    setLampOn,
    setStreetLamps,
    streetLampState,
    warmShaders,
    toggleLamp,
    nearestLamp,
    onSeated,
    onStoodUp,
  };
}

export function lampActionLabel(item) {
  const names = {
    desk: "책상등",
    street: "가로등",
    tree: "트리",
    rudolph: "루돌프",
    lamp: "전등",
  };
  const name = names[item.kind] || "불";
  return item.on ? `${name} OFF` : `${name} ON`;
}
