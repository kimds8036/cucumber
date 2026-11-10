import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 시각 메시와 분리된 충돌 월드.
 * - solids: 이동을 막는 AABB (wall / furniture / door) — 병합 금지
 * - floors: 접지용 메시
 * - campfire_stones: 통짜 AABB 대신 링 조각
 * - stairs: 옆면 가드레일 자동 추가
 */

/** @typedef {"wall"|"floor"|"stair"|"furniture"|"door"} ColliderKind */

/**
 * @typedef {object} SolidCollider
 * @property {ColliderKind} kind
 * @property {THREE.Box3} box
 * @property {string} name
 * @property {THREE.Object3D|null} source
 * @property {boolean} dynamic
 */

/**
 * @param {THREE.Object3D} mapRoot
 */
export function buildCollisionWorld(mapRoot) {
  mapRoot.updateMatrixWorld(true);

  /** @type {SolidCollider[]} */
  const solids = [];
  /** @type {{ kind: ColliderKind, mesh: THREE.Mesh, name: string }[]} */
  const floors = [];
  /** @type {Map<string, number[]>} */
  let grid = new Map();
  /** @type {Map<string, number[]>} */
  let floorGrid = new Map();
  const doorLeafCenters = [];
  const _corner = new THREE.Vector3();
  const _floorScratch = [];
  const _floorSeen = new Set();

  const counts = {
    wall: 0,
    floor: 0,
    stair: 0,
    furniture: 0,
    door: 0,
    skipped: 0,
    discarded: 0,
    ringPieces: 0,
    stairRails: 0,
    doorwayCleared: 0,
    refined: 0,
    refinedBoxes: 0,
    proxies: 0,
  };

  const tmp = new THREE.Box3();
  const cell = CONFIG.COLLIDER_QUERY_CELL;
  const _seen = new Set();
  const _scratch = [];
  const _v = new THREE.Vector3();

  function pushSolid(kind, box, name, source = null, dynamic = false) {
    solids.push({
      kind,
      box: box.clone(),
      name,
      source,
      dynamic,
    });
    counts[kind] += 1;
  }

  /** 연못 돌: 메시 정점을 각도 버킷으로 나눠 얇은 링 조각만 벽으로 */
  function addPondStoneRing(mesh, name) {
    const geom = mesh.geometry;
    const pos = geom?.attributes?.position;
    if (!pos) {
      counts.discarded += 1;
      return;
    }
    mesh.updateWorldMatrix(true, false);
    const points = [];
    let cx = 0;
    let cz = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      points.push(_v.clone());
      cx += _v.x;
      cz += _v.z;
      yMin = Math.min(yMin, _v.y);
      yMax = Math.max(yMax, _v.y);
    }
    const n = points.length || 1;
    cx /= n;
    cz /= n;

    const sectors = CONFIG.POND_STONE_RING_SECTORS;
    /** @type {THREE.Vector3[][]} */
    const buckets = Array.from({ length: sectors }, () => []);
    for (const p of points) {
      const ang = Math.atan2(p.z - cz, p.x - cx);
      let idx = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * sectors);
      if (idx < 0) idx = 0;
      if (idx >= sectors) idx = sectors - 1;
      buckets[idx].push(p);
    }

    const minR = CONFIG.POND_STONE_MIN_RADIUS;
    const wallH = Math.max(0.55, yMax - yMin);

    for (let s = 0; s < sectors; s++) {
      const bucket = buckets[s];
      if (bucket.length < 3) continue;
      const box = new THREE.Box3().setFromPoints(bucket);
      const midX = (box.min.x + box.max.x) * 0.5;
      const midZ = (box.min.z + box.max.z) * 0.5;
      const r = Math.hypot(midX - cx, midZ - cz);
      if (r < minR) continue;

      box.min.y = yMin;
      box.max.y = yMin + wallH;

      // 조각 발자국을 얇게 유지 (연못 안·바깥 통행 공간 확보)
      const sx = box.max.x - box.min.x;
      const sz = box.max.z - box.min.z;
      const maxFoot = 0.5;
      if (sx > maxFoot) {
        box.min.x = midX - maxFoot * 0.5;
        box.max.x = midX + maxFoot * 0.5;
      }
      if (sz > maxFoot) {
        box.min.z = midZ - maxFoot * 0.5;
        box.max.z = midZ + maxFoot * 0.5;
      }

      thickenXZ(box);
      pushSolid("wall", box, `${name}:ring${s}`);
      counts.ringPieces += 1;
    }
  }

  /**
   * fence-rope: 통짜 AABB 대신 메시를 따라 얇은 기둥 조각으로 벽 구성
   * (연못 돌 링과 같은 세밀 방식)
   */
  function addFenceSegments(mesh, name) {
    const geom = mesh.geometry;
    const pos = geom?.attributes?.position;
    if (!pos) {
      counts.discarded += 1;
      return;
    }
    mesh.updateWorldMatrix(true, false);

    /** @type {THREE.Vector3[]} */
    const points = [];
    let xMin = Infinity;
    let xMax = -Infinity;
    let zMin = Infinity;
    let zMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      points.push(_v.clone());
      xMin = Math.min(xMin, _v.x);
      xMax = Math.max(xMax, _v.x);
      zMin = Math.min(zMin, _v.z);
      zMax = Math.max(zMax, _v.z);
      yMin = Math.min(yMin, _v.y);
      yMax = Math.max(yMax, _v.y);
    }
    if (points.length < 2) return;

    const sx = xMax - xMin;
    const sz = zMax - zMin;
    const alongX = sx >= sz;
    const bins = CONFIG.FENCE_SEGMENTS;
    const half = CONFIG.FENCE_SEGMENT_HALF;
    const wallH = Math.max(CONFIG.FENCE_WALL_HEIGHT, yMax - yMin + 0.15);
    /** @type {THREE.Vector3[][]} */
    const buckets = Array.from({ length: bins }, () => []);

    for (const p of points) {
      const t = alongX
        ? sx < 1e-6
          ? 0
          : (p.x - xMin) / sx
        : sz < 1e-6
          ? 0
          : (p.z - zMin) / sz;
      let idx = Math.floor(t * bins);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      buckets[idx].push(p);
    }

    let made = 0;
    for (let b = 0; b < bins; b++) {
      const bucket = buckets[b];
      if (bucket.length < 1) continue;
      let mx = 0;
      let mz = 0;
      let byMin = Infinity;
      for (const p of bucket) {
        mx += p.x;
        mz += p.z;
        byMin = Math.min(byMin, p.y);
      }
      mx /= bucket.length;
      mz /= bucket.length;

      const box = new THREE.Box3(
        new THREE.Vector3(mx - half, byMin, mz - half),
        new THREE.Vector3(mx + half, byMin + wallH, mz + half)
      );
      pushSolid("wall", box, `${name}:seg${b}`);
      counts.ringPieces += 1;
      made += 1;
    }

    if (made === 0) counts.discarded += 1;
  }

  /** 계단 양옆 가드레일만 (끝 출구는 막지 않음) */
  function addStairSideRails(mesh, name) {
    const box = new THREE.Box3().setFromObject(mesh);
    const sx = box.max.x - box.min.x;
    const sz = box.max.z - box.min.z;
    const t = CONFIG.STAIR_RAIL_THICKNESS;
    const h = CONFIG.STAIR_RAIL_HEIGHT;
    const ext = CONFIG.STAIR_RAIL_TOP_EXTEND;
    const y0 = box.min.y;
    const y1 = Math.max(box.max.y, y0 + h) + 0.15;
    // 통로 안쪽으로 거의 안 침범 (옆 낙하만 막음)
    const inset = Math.min(t * 0.2, 0.04);

    /** @type {THREE.Box3[]} */
    const rails = [];

    if (sx >= sz * 0.85) {
      // X 방향으로 오름 → Z 양옆만, +X 출구는 열어둠
      rails.push(
        new THREE.Box3(
          new THREE.Vector3(box.min.x - 0.05, y0, box.min.z - t),
          new THREE.Vector3(box.max.x + ext, y1, box.min.z + inset)
        )
      );
      rails.push(
        new THREE.Box3(
          new THREE.Vector3(box.min.x - 0.05, y0, box.max.z - inset),
          new THREE.Vector3(box.max.x + ext, y1, box.max.z + t)
        )
      );
    } else {
      // Z 방향으로 오름 → X 양옆만, +Z 출구는 열어둠
      rails.push(
        new THREE.Box3(
          new THREE.Vector3(box.min.x - t, y0, box.min.z - 0.05),
          new THREE.Vector3(box.min.x + inset, y1, box.max.z + ext)
        )
      );
      rails.push(
        new THREE.Box3(
          new THREE.Vector3(box.max.x - inset, y0, box.min.z - 0.05),
          new THREE.Vector3(box.max.x + t, y1, box.max.z + ext)
        )
      );
    }

    for (let i = 0; i < rails.length; i++) {
      pushSolid("wall", rails[i], `${name}:rail${i}`);
      counts.stairRails += 1;
    }
  }

  /**
   * 로컬 AABB 모서리 8개를 월드로 옮겨 축정렬 박스로 만든다.
   * @param {THREE.Object3D} mesh
   * @param {{x:number,y:number,z:number}} min
   * @param {{x:number,y:number,z:number}} max
   * @param {THREE.Box3} target
   */
  function localAabbToWorld(mesh, min, max, target) {
    target.makeEmpty();
    mesh.updateWorldMatrix(true, false);
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        for (let zi = 0; zi < 2; zi++) {
          _corner.set(xi ? max.x : min.x, yi ? max.y : min.y, zi ? max.z : min.z);
          _corner.applyMatrix4(mesh.matrixWorld);
          target.expandByPoint(_corner);
        }
      }
    }
    return target;
  }

  /**
   * 출입구 벽 구간(cabin-door* 메시 범위)은 통째로 통과 가능.
   * 그 안에 겹친 cabin-wall 조각들도 솔리드에서 뺀다. 막는 건 닫힌 문짝뿐.
   */
  const doorwayZones = [];
  mapRoot.traverse((child) => {
    if (!child.isMesh || !/^cabin-door/i.test(child.name || "")) return;
    const zone = new THREE.Box3().setFromObject(child);
    zone.expandByScalar(CONFIG.DOORWAY_CLEAR_MARGIN);
    if (doorwayZones.some((z) => z.min.distanceTo(zone.min) < 0.05)) return;
    doorwayZones.push(zone);
  });

  function inDoorway(box) {
    if (doorwayZones.length === 0) return false;
    const c = box.getCenter(_corner);
    for (const zone of doorwayZones) {
      if (c.x >= zone.min.x && c.x <= zone.max.x && c.z >= zone.min.z && c.z <= zone.max.z && c.y <= zone.max.y) {
        return true;
      }
    }
    return false;
  }

  const shapeOverrides = CONFIG.COLLIDER_SHAPE_OVERRIDES.map(([pattern, mode]) => [new RegExp(pattern, "i"), mode]);
  function shapeOverride(name) {
    for (const [re, mode] of shapeOverrides) if (re.test(name)) return mode;
    return null;
  }

  const _ta = new THREE.Vector3();
  const _tb = new THREE.Vector3();
  const _tc = new THREE.Vector3();

  /**
   * 메시 삼각형을 바닥 칸에 찍어 실제로 막아야 할 칸만 상자로 만든다.
   * 껍데기 안쪽(바깥에서 닿지 않는 칸)은 채워서 속이 빈 메시도 막힌다.
   * @returns {boolean} 세밀 상자로 대체했으면 true
   */
  function addRefinedSolid(mesh, name, kind, aabb, force) {
    const geom = mesh.geometry;
    const pos = geom?.attributes?.position;
    if (!pos) return false;
    const sx = aabb.max.x - aabb.min.x;
    const sz = aabb.max.z - aabb.min.z;
    if (!force && sx * sz < CONFIG.COLLIDER_REFINE_MIN_AREA) return false;

    const c = CONFIG.COLLIDER_REFINE_CELL;
    const ox = aabb.min.x;
    const oz = aabb.min.z;
    const nx = Math.max(1, Math.ceil(sx / c));
    const nz = Math.max(1, Math.ceil(sz / c));
    if (nx * nz > 40000) return false;
    const bandTop = aabb.min.y + CONFIG.COLLIDER_REFINE_BAND;
    const occ = new Uint8Array(nx * nz);

    const mark = (p) => {
      if (p.y > bandTop) return;
      const ix = Math.min(nx - 1, Math.max(0, Math.floor((p.x - ox) / c)));
      const iz = Math.min(nz - 1, Math.max(0, Math.floor((p.z - oz) / c)));
      occ[iz * nx + ix] = 1;
    };

    mesh.updateWorldMatrix(true, false);
    const index = geom.index;
    const triCount = index ? index.count / 3 : pos.count / 3;
    const p = new THREE.Vector3();
    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      _ta.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
      _tb.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
      _tc.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
      if (_ta.y > bandTop && _tb.y > bandTop && _tc.y > bandTop) continue;
      const len = Math.max(_ta.distanceTo(_tb), _tb.distanceTo(_tc), _tc.distanceTo(_ta));
      const n = Math.min(64, Math.max(1, Math.ceil(len / (c * 0.5))));
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const u = i / n;
          const v = j / n;
          p.set(
            _ta.x + (_tb.x - _ta.x) * u + (_tc.x - _ta.x) * v,
            _ta.y + (_tb.y - _ta.y) * u + (_tc.y - _ta.y) * v,
            _ta.z + (_tb.z - _ta.z) * u + (_tc.z - _ta.z) * v
          );
          mark(p);
        }
      }
    }

    const outside = new Uint8Array(nx * nz);
    const stack = [];
    for (let ix = 0; ix < nx; ix++) {
      stack.push(ix, ix + (nz - 1) * nx);
    }
    for (let iz = 0; iz < nz; iz++) {
      stack.push(iz * nx, iz * nx + nx - 1);
    }
    while (stack.length) {
      const k = stack.pop();
      if (occ[k] || outside[k]) continue;
      outside[k] = 1;
      const ix = k % nx;
      const iz = (k - ix) / nx;
      if (ix > 0) stack.push(k - 1);
      if (ix < nx - 1) stack.push(k + 1);
      if (iz > 0) stack.push(k - nx);
      if (iz < nz - 1) stack.push(k + nx);
    }
    let filled = 0;
    for (let k = 0; k < occ.length; k++) {
      if (!outside[k]) {
        occ[k] = 1;
        filled += 1;
      }
    }
    if (filled === 0) return false;
    if (!force && filled / occ.length >= CONFIG.COLLIDER_REFINE_KEEP_RATIO) return false;

    // 같은 x 구간이 이어지는 줄끼리 직사각형으로 합친다
    /** @type {Map<string, {x0:number,x1:number,z0:number,z1:number}>} */
    let open = new Map();
    const rects = [];
    for (let iz = 0; iz <= nz; iz++) {
      const next = new Map();
      if (iz < nz) {
        let ix = 0;
        while (ix < nx) {
          if (!occ[iz * nx + ix]) {
            ix += 1;
            continue;
          }
          const x0 = ix;
          while (ix < nx && occ[iz * nx + ix]) ix += 1;
          const key = `${x0},${ix - 1}`;
          const prev = open.get(key);
          if (prev) {
            prev.z1 = iz;
            next.set(key, prev);
            open.delete(key);
          } else {
            next.set(key, { x0, x1: ix - 1, z0: iz, z1: iz });
          }
        }
      }
      for (const r of open.values()) rects.push(r);
      open = next;
    }

    const box = new THREE.Box3();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      box.min.set(Math.max(aabb.min.x, ox + r.x0 * c), aabb.min.y, Math.max(aabb.min.z, oz + r.z0 * c));
      box.max.set(Math.min(aabb.max.x, ox + (r.x1 + 1) * c), aabb.max.y, Math.min(aabb.max.z, oz + (r.z1 + 1) * c));
      thickenXZ(box);
      if (kind === "wall" && inDoorway(box)) continue;
      pushSolid(kind, box, `${name}:cell${i}`);
      counts.refinedBoxes += 1;
    }
    counts.refined += 1;
    return true;
  }

  /** 문짝만 동적 솔리드. 닫혀 있을 때만 막고, 열리면 출입구가 완전히 비어 있다 */
  function addDoorLeaf(mesh, name) {
    const geom = mesh.geometry;
    if (!geom) return;
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    if (!bb) return;
    const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    if (doorLeafCenters.some((p) => p.distanceTo(center) < 0.05)) return;
    doorLeafCenters.push(center);
    const seg = 3;
    const span = bb.max.x - bb.min.x;
    for (let i = 0; i < seg; i++) {
      const localMin = { x: bb.min.x + span * (i / seg), y: bb.min.y, z: bb.min.z };
      const localMax = { x: bb.min.x + span * ((i + 1) / seg), y: bb.max.y, z: bb.max.z };
      const box = localAabbToWorld(mesh, localMin, localMax, new THREE.Box3());
      thickenXZ(box);
      pushSolid("door", box, `${name}:seg${i}`, mesh, true);
      const entry = solids[solids.length - 1];
      entry.localMin = localMin;
      entry.localMax = localMax;
      entry.closedYaw = mesh.rotation.y;
    }
  }

  const deskRe = new RegExp(CONFIG.DESK_PATTERN, "i");
  for (const group of collectDeskGroups(mapRoot)) {
    pushSolid("furniture", group.box, `desk-block:${group.chairs.length}chairs`);
  }

  mapRoot.traverse((child) => {
    if (!child.isMesh) return;
    const name = child.name || "";
    if (deskRe.test(name)) return;
    if (/^cabin-door/i.test(name)) {
      counts.skipped += 1;
      return;
    }
    if (/^col[_-]/i.test(name)) {
      child.visible = false;
      tmp.setFromObject(child);
      thickenXZ(tmp);
      pushSolid("wall", tmp, name);
      counts.proxies += 1;
      return;
    }
    const override = shapeOverride(name);
    if (override === "none") {
      counts.skipped += 1;
      return;
    }
    const kind = classifyCollider(name);
    if (!kind) {
      counts.skipped += 1;
      return;
    }

    if (kind === "floor" || kind === "stair") {
      floors.push({ kind, mesh: child, name });
      counts[kind] += 1;
      if (/stairs|step/i.test(name)) {
        addStairSideRails(child, name);
      }
      return;
    }

    // 연못 돌 링 / 울타리: 통짜 박스 금지 → 세밀 조각
    if (/campfire_stones/i.test(name)) {
      addPondStoneRing(child, name);
      return;
    }
    if (/fence/i.test(name)) {
      addFenceSegments(child, name);
      return;
    }

    if (kind === "door") {
      addDoorLeaf(child, name);
      return;
    }

    tmp.setFromObject(child);
    if (kind === "wall") thickenXZ(tmp);
    if (kind === "wall" && /stones|rock/i.test(name)) {
      const minH = 0.55;
      if (tmp.max.y - tmp.min.y < minH) tmp.max.y = tmp.min.y + minH;
    }

    if (!isUsableSolidBox(tmp, kind, name)) {
      counts.discarded += 1;
      return;
    }
    if (kind === "wall" && inDoorway(tmp)) {
      counts.doorwayCleared += 1;
      return;
    }
    if (CONFIG.COLLIDER_REFINE && override !== "box" && addRefinedSolid(child, name, kind, tmp, override === "refine")) {
      return;
    }

    pushSolid(kind, tmp, name, kind === "door" ? child : null, kind === "door");
  });

  function rebuildGrid() {
    grid = new Map();
    for (let i = 0; i < solids.length; i++) {
      if (solids[i].dynamic) continue;
      const b = solids[i].box;
      const x0 = Math.floor(b.min.x / cell);
      const x1 = Math.floor(b.max.x / cell);
      const z0 = Math.floor(b.min.z / cell);
      const z1 = Math.floor(b.max.z / cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const key = `${gx},${gz}`;
          let list = grid.get(key);
          if (!list) {
            list = [];
            grid.set(key, list);
          }
          list.push(i);
        }
      }
    }
  }

  rebuildGrid();
  rebuildFloorGrid();

  function rebuildFloorGrid() {
    floorGrid = new Map();
    const box = new THREE.Box3();
    for (let i = 0; i < floors.length; i++) {
      box.setFromObject(floors[i].mesh);
      floors[i].box = box.clone();
      const x0 = Math.floor(box.min.x / cell);
      const x1 = Math.floor(box.max.x / cell);
      const z0 = Math.floor(box.min.z / cell);
      const z1 = Math.floor(box.max.z / cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const key = `${gx},${gz}`;
          let list = floorGrid.get(key);
          if (!list) {
            list = [];
            floorGrid.set(key, list);
          }
          list.push(i);
        }
      }
    }
  }

  console.info("[collision] built", counts, {
    solids: solids.length,
    floors: floors.length,
    cells: grid.size,
  });

  return {
    solids,
    floors,
    syncDynamic() {
      for (const entry of solids) {
        if (!entry.dynamic || !entry.source) continue;
        if (entry.closedYaw !== undefined) {
          const d = Math.abs(entry.source.rotation.y - entry.closedYaw);
          if (d > CONFIG.DOOR_BLOCK_MAX_ANGLE) {
            entry.box.makeEmpty();
            continue;
          }
        }
        if (entry.localMin && entry.localMax) {
          localAabbToWorld(entry.source, entry.localMin, entry.localMax, tmp);
        } else {
          tmp.setFromObject(entry.source);
        }
        thickenXZ(tmp);
        entry.box.copy(tmp);
      }
    },
    /**
     * 수직 레이가 닿을 수 있는 바닥 메시만. 셀 경계는 이웃 칸까지 본다.
     * @param {number} x
     * @param {number} z
     */
    queryFloorMeshes(x, z) {
      _floorScratch.length = 0;
      _floorSeen.clear();
      const gx = Math.floor(x / cell);
      const gz = Math.floor(z / cell);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = floorGrid.get(`${gx + dx},${gz + dz}`);
          if (!list) continue;
          for (let i = 0; i < list.length; i++) {
            const idx = list[i];
            if (_floorSeen.has(idx)) continue;
            _floorSeen.add(idx);
            _floorScratch.push(floors[idx].mesh);
          }
        }
      }
      return _floorScratch;
    },
    stats: { raycasts: 0 },
    /** @param {number} x @param {number} z @param {number} radius */
    queryNearby(x, z, radius) {
      _scratch.length = 0;
      _seen.clear();
      const x0 = Math.floor((x - radius) / cell);
      const x1 = Math.floor((x + radius) / cell);
      const z0 = Math.floor((z - radius) / cell);
      const z1 = Math.floor((z + radius) / cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const list = grid.get(`${gx},${gz}`);
          if (!list) continue;
          for (let i = 0; i < list.length; i++) {
            const idx = list[i];
            if (_seen.has(idx)) continue;
            _seen.add(idx);
            _scratch.push(solids[idx]);
          }
        }
      }
      for (let i = 0; i < solids.length; i++) {
        if (!solids[i].dynamic || _seen.has(i)) continue;
        _seen.add(i);
        _scratch.push(solids[i]);
      }
      return _scratch;
    },
  };
}

/**
 * 책상(DESK_PATTERN)과 거기 붙은 의자를 묶는다. 충돌과 좌석이 같은 묶음을 쓴다.
 * @param {THREE.Object3D} root
 * @returns {{ box: THREE.Box3, deskBox: THREE.Box3, chairs: THREE.Mesh[] }[]}
 */
export function collectDeskGroups(root) {
  root.updateMatrixWorld(true);
  const deskRe = new RegExp(CONFIG.DESK_PATTERN, "i");
  /** @type {THREE.Box3[]} */
  const desks = [];
  /** @type {THREE.Mesh[]} */
  const chairs = [];
  root.traverse((child) => {
    if (!child.isMesh) return;
    const name = child.name || "";
    if (deskRe.test(name)) {
      const box = new THREE.Box3().setFromObject(child);
      const same = desks.find((d) => d.intersectsBox(box));
      if (same) same.union(box);
      else desks.push(box);
    } else if (/chair/i.test(name)) {
      chairs.push(child);
    }
  });

  const link = CONFIG.DESK_CHAIR_LINK_DIST;
  const chairBox = new THREE.Box3();
  return desks.map((deskBox) => {
    const near = deskBox.clone().expandByScalar(link);
    const box = deskBox.clone();
    const linked = [];
    for (const chair of chairs) {
      chairBox.setFromObject(chair);
      if (!near.intersectsBox(chairBox)) continue;
      linked.push(chair);
      box.union(chairBox);
    }
    box.min.x -= CONFIG.DESK_BLOCK_PAD;
    box.min.z -= CONFIG.DESK_BLOCK_PAD;
    box.max.x += CONFIG.DESK_BLOCK_PAD;
    box.max.z += CONFIG.DESK_BLOCK_PAD;
    return { box, deskBox, chairs: linked };
  });
}

/**
 * @param {string} name
 * @returns {ColliderKind|null}
 */
export function classifyCollider(name) {
  const n = name || "";
  if (
    /outline|pond_water|flower|grass|mushroom|plant|flag|arrow|wreath|book|pillow|Light_|_bright|reindeer|gift|train|sled|cover|drawer|open|Node|lid|chest|lights-colored|snowman|tmpParent|RootNode|body-mesh|snow-pile|water pond/i.test(
      n
    )
  ) {
    return null;
  }
  // 울타리(fence-rope)는 스킵보다 먼저 벽으로 — rope 문자열에 걸려 무시되던 문제 방지
  if (/fence/i.test(n)) return "wall";
  if (new RegExp(CONFIG.BOARD_PATTERN, "i").test(n)) return "furniture";
  if (/^cabin-door/i.test(n)) return null;
  if (/^door/i.test(n)) return "door";
  if (/stairs|step/i.test(n)) return "stair";
  if (/bench|bed|table|crate|barrel|sideTable|stall/i.test(n)) return "furniture";
  if (/chair/i.test(n)) return CONFIG.CHAIR_PASSABLE ? null : "furniture";
  if (/block-snow-overhang-large-tall/i.test(n)) return "wall";
  if (/block-snow/i.test(n)) return "stair";
  if (/tree|lantern|stones|campfire_stones|rocks|cabin-wall|wall|platform-overhang|log/i.test(n)) {
    return "wall";
  }
  if (/snow-flat|path_|platform/i.test(n)) return "floor";
  return null;
}

function thickenXZ(box) {
  const sx = box.max.x - box.min.x;
  const sz = box.max.z - box.min.z;
  if (sx < 0.08) {
    const mid = (box.min.x + box.max.x) * 0.5;
    box.min.x = mid - 0.04;
    box.max.x = mid + 0.04;
  }
  if (sz < 0.08) {
    const mid = (box.min.z + box.max.z) * 0.5;
    box.min.z = mid - 0.04;
    box.max.z = mid + 0.04;
  }
}

function isUsableSolidBox(box, kind, name = "") {
  const sx = box.max.x - box.min.x;
  const sy = box.max.y - box.min.y;
  const sz = box.max.z - box.min.z;
  if (/^stones/i.test(name) || /^rocks/i.test(name)) return true;
  if (sy < CONFIG.COLLIDER_MIN_WALL_HEIGHT && sx * sz > CONFIG.COLLIDER_MAX_FLAT_AREA) {
    return false;
  }
  if (kind === "wall" && sx > 2.8 && sz > 2.8 && sy < 0.5) return false;
  return true;
}
