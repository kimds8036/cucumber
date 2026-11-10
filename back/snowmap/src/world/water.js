import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { CONFIG } from "../config.js";

/**
 * 연못 물: Three.js Water(실시간 거울 반사 + 흐르는 물결 노멀)를 연못 모양 그대로 깐다.
 * 반사는 연못이 화면에 보일 때만 작은 해상도로 한 번 더 그린다.
 */

/**
 * 연못 메시를 위에서 본 모양 그대로 XY 평면 지오메트리로 옮긴다.
 * Water는 로컬 +Z를 수면 법선으로 쓰므로 rotation.x = -π/2 로 눕혀 쓴다.
 * @param {THREE.Mesh[]} ponds
 */
function buildFlatWaterGeometry(ponds) {
  const positions = [];
  const indices = [];
  const v = new THREE.Vector3();
  let top = -Infinity;
  for (const mesh of ponds) {
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      top = Math.max(top, v.y);
    }
  }
  for (const mesh of ponds) {
    const pos = mesh.geometry.attributes.position;
    const base = positions.length / 3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      positions.push(v.x, -v.z, 0);
    }
    const index = mesh.geometry.index;
    const n = index ? index.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const a = index ? index.getX(i) : i;
      const b = index ? index.getX(i + 1) : i + 1;
      const c = index ? index.getX(i + 2) : i + 2;
      const ax = positions[(base + a) * 3];
      const ay = positions[(base + a) * 3 + 1];
      const cross =
        (positions[(base + b) * 3] - ax) * (positions[(base + c) * 3 + 1] - ay) -
        (positions[(base + b) * 3 + 1] - ay) * (positions[(base + c) * 3] - ax);
      if (Math.abs(cross) < 1e-8) continue;
      if (cross > 0) indices.push(base + a, base + b, base + c);
      else indices.push(base + a, base + c, base + b);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return { geom, top };
}

/**
 * 수면 위에서 동그랗게 퍼졌다 사라지는 물결 고리. 고리가 연못 밖으로 넘치지 않는 자리에만 생긴다.
 * @param {THREE.Mesh[]} ponds
 * @param {THREE.Object3D} holder 월드 좌표계 부모
 */
function createRipples(ponds, holder) {
  const count = CONFIG.WATER_RIPPLE_COUNT;
  if (!count) return { update() {} };

  const bounds = new THREE.Box3();
  for (const m of ponds) bounds.expandByObject(m);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const maxR = CONFIG.WATER_RIPPLE_RADIUS;

  function surfaceAt(x, z) {
    origin.set(x, bounds.max.y + 1, z);
    ray.set(origin, down);
    const hit = ray.intersectObjects(ponds, false)[0];
    return hit ? hit.point.y : null;
  }

  function pickSpot(out) {
    for (let tries = 0; tries < 12; tries++) {
      const x = THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, Math.random());
      const z = THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, Math.random());
      const y = surfaceAt(x, z);
      if (y == null) continue;
      const r = maxR * 0.9;
      if (surfaceAt(x + r, z) == null || surfaceAt(x - r, z) == null) continue;
      if (surfaceAt(x, z + r) == null || surfaceAt(x, z - r) == null) continue;
      out.set(x, bounds.max.y + 0.006, z);
      return true;
    }
    return false;
  }

  const geom = new THREE.RingGeometry(0.9, 1, 48);
  geom.rotateX(-Math.PI / 2);
  const items = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const rings = [1, 0.6].map(() => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xeaf6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geom, mat);
      ring.renderOrder = 2;
      group.add(ring);
      return ring;
    });
    group.visible = false;
    holder.add(group);
    items.push({ group, rings, age: -(i / count) * CONFIG.WATER_RIPPLE_LIFE });
  }

  function update(dt) {
    const life = CONFIG.WATER_RIPPLE_LIFE;
    for (const it of items) {
      it.age += dt;
      if (it.age < 0) continue;
      if (it.age >= life || !it.group.visible) {
        it.group.visible = pickSpot(it.group.position);
        it.age = it.group.visible ? 0 : -0.5;
        if (!it.group.visible) continue;
      }
      const k = it.age / life;
      const ease = 1 - (1 - k) * (1 - k);
      it.rings.forEach((ring, idx) => {
        const s = Math.max(0.01, maxR * ease * (idx === 0 ? 1 : 0.6));
        ring.scale.setScalar(s);
        ring.material.opacity = CONFIG.WATER_RIPPLE_OPACITY * (1 - k) * (idx === 0 ? 1 : 0.7);
      });
    }
  }

  return { update };
}

/**
 * @param {THREE.Object3D} mapRoot
 */
export function createPondWater(mapRoot) {
  /** @type {THREE.Mesh[]} */
  const ponds = [];
  mapRoot.traverse((child) => {
    if (child.isMesh && /water[_ ]?pond|pond[_ ]?water/i.test(child.name || "")) ponds.push(child);
  });
  if (ponds.length === 0) {
    console.info("[water] 연못 메시 없음");
    return { update() {} };
  }

  const holder = mapRoot.parent ?? mapRoot;
  const { geom, top } = buildFlatWaterGeometry(ponds);

  const normals = new THREE.TextureLoader().load(CONFIG.WATER_NORMAL_URL);
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;

  const water = new Water(geom, {
    textureWidth: CONFIG.WATER_REFLECTION_SIZE,
    textureHeight: CONFIG.WATER_REFLECTION_SIZE,
    waterNormals: normals,
    sunDirection: new THREE.Vector3(...CONFIG.WATER_SUN_DIRECTION).normalize(),
    sunColor: 0xffffff,
    waterColor: CONFIG.WATER_COLOR,
    distortionScale: CONFIG.WATER_DISTORTION,
    alpha: CONFIG.WATER_OPACITY,
    fog: false,
  });
  water.name = "pondWater";
  water.rotation.x = -Math.PI / 2;
  water.position.y = top + 0.002;
  water.material.uniforms.size.value = CONFIG.WATER_WAVE_SIZE;
  water.material.transparent = CONFIG.WATER_OPACITY < 1;
  water.renderOrder = 1;
  holder.add(water);

  for (const mesh of ponds) mesh.visible = false;

  const ripples = createRipples(ponds, holder);

  function update(dt) {
    water.material.uniforms.time.value += dt * CONFIG.WATER_FLOW_SPEED;
    ripples.update(dt);
  }

  console.info("[water]", { ponds: ponds.map((m) => m.name) });
  return { update, material: water.material };
}
