import * as THREE from "three";
import { CONFIG } from "../config.js";

/** 같은 위치 꼭짓점 법선을 평균 → 하드엣지 틈 완화 */
function averageSmoothNormals(positionAttr, normalAttr) {
  const pos = positionAttr.array;
  const nor = normalAttr.array;
  const count = positionAttr.count;
  const groups = new Map();
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const key = `${pos[ix].toFixed(5)},${pos[ix + 1].toFixed(5)},${pos[ix + 2].toFixed(5)}`;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(i);
  }
  const smooth = new Float32Array(nor.length);
  for (const indices of groups.values()) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (const i of indices) {
      const ix = i * 3;
      nx += nor[ix];
      ny += nor[ix + 1];
      nz += nor[ix + 2];
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const i of indices) {
      const ix = i * 3;
      smooth[ix] = nx;
      smooth[ix + 1] = ny;
      smooth[ix + 2] = nz;
    }
  }
  return smooth;
}

function buildExtrudedOutlineGeometry(sourceGeometry, localThickness) {
  const geom = sourceGeometry.clone();
  geom.computeVertexNormals();
  const posAttr = geom.getAttribute("position");
  const norAttr = geom.getAttribute("normal");
  if (!posAttr || !norAttr) return geom;
  const smooth = averageSmoothNormals(posAttr, norAttr);
  const pos = posAttr.array;
  const out = new Float32Array(pos.length);
  for (let i = 0; i < posAttr.count; i++) {
    const ix = i * 3;
    out[ix] = pos[ix] + smooth[ix] * localThickness;
    out[ix + 1] = pos[ix + 1] + smooth[ix + 1] * localThickness;
    out[ix + 2] = pos[ix + 2] + smooth[ix + 2] * localThickness;
  }
  const outlineGeo = new THREE.BufferGeometry();
  outlineGeo.setAttribute("position", new THREE.BufferAttribute(out, 3));
  if (geom.index) outlineGeo.setIndex(geom.index.clone());
  outlineGeo.computeVertexNormals();
  return outlineGeo;
}

/**
 * 노멀 익스트루드 아웃라인 (좌석 전용).
 * scale 팽창이 아니라 법선 방향 압출 → 원점 치우친 메시도 덜 어긋남.
 */
export function makeExtrudedOutline(child, color = CONFIG.OUTLINE_COLOR) {
  if (!child?.geometry) return null;
  if (child.isSkinnedMesh || child.isInstancedMesh) {
    console.warn("[outline] skinned/instanced — bind-pose 정적 아웃라인만:", child.name);
  }

  const worldScale = child.getWorldScale(new THREE.Vector3());
  const avgScale = Math.max(
    (Math.abs(worldScale.x) + Math.abs(worldScale.y) + Math.abs(worldScale.z)) / 3,
    0.001
  );
  const localThickness = CONFIG.OUTLINE_THICKNESS / avgScale;
  const outlineGeo = buildExtrudedOutlineGeometry(child.geometry, localThickness);

  const edges = new THREE.Mesh(
    outlineGeo,
    new THREE.MeshBasicMaterial({
      name: "outline",
      color,
      side: THREE.BackSide,
      toneMapped: false,
      depthTest: true,
      depthWrite: false,
    })
  );
  edges.name = "outline";
  edges.position.set(0, 0, 0);
  edges.quaternion.identity();
  edges.scale.set(1, 1, 1);
  edges.renderOrder = 2;
  edges.visible = false;
  edges.castShadow = false;
  edges.receiveShadow = false;
  edges.raycast = () => {};
  child.add(edges);
  return edges;
}
