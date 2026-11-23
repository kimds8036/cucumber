import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 이동 + 캡슐 충돌 + 슬라이딩 + 서브스텝 + 계단/턱 + 탈진.
 * 점프 없음.
 */
export function createCharacterController(pivot, collisionWorld, mapRoot) {
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const _n = new THREE.Vector3();
  const _push = new THREE.Vector3();

  const radius = CONFIG.CAPSULE_RADIUS;
  const skin = CONFIG.COLLISION_SKIN;
  const capH = CONFIG.CAPSULE_HEIGHT;

  const _rayOrigin = new THREE.Vector3();
  /** @type {Map<string, number|null>} */
  const groundCache = new Map();

  const footSamples = [
    [0, 0],
    [0.1, 0],
    [-0.1, 0],
    [0, 0.1],
    [0, -0.1],
    [0.08, 0.08],
    [0.08, -0.08],
    [-0.08, 0.08],
    [-0.08, -0.08],
  ];

  // 테이블/의자 등 가구 윗면은 바닥 아님.
  // block-snow-overhang-low 는 6인석 넓은 바닥 → 접지/오르기 허용 (제외 목록에 넣지 않음)
  function isNonWalkSurface(name) {
    return /outline|pond_water|tree|flower|grass|mushroom|plant|cabin-wall|door|bench|chair|bed|table|sideTable|crate|barrel|stall|fence|pillow|book|Light_|_bright/i.test(
      name || ""
    );
  }

  function acceptGroundHit(hit) {
    if (isNonWalkSurface(hit.object.name || "")) return false;
    if (hit.point.y > CONFIG.MAX_WALK_Y) return false;
    if (hit.face) {
      _n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
      if (_n.y < CONFIG.MIN_FLOOR_NORMAL) return false;
    }
    return true;
  }

  function sampleGround(x, z) {
    const key = `${Math.round(x * 50)},${Math.round(z * 50)}`;
    if (groundCache.has(key)) return groundCache.get(key);
    _rayOrigin.set(x, 40, z);
    raycaster.set(_rayOrigin, down);
    const targets = collisionWorld.queryFloorMeshes
      ? collisionWorld.queryFloorMeshes(x, z)
      : collisionWorld.floors.map((f) => f.mesh);
    if (collisionWorld.stats) collisionWorld.stats.raycasts += 1;
    let best = null;
    if (targets.length > 0) {
      const hits = raycaster.intersectObjects(targets, false);
      for (const hit of hits) {
        if (!acceptGroundHit(hit)) continue;
        if (best === null || hit.point.y > best) best = hit.point.y;
      }
    }
    groundCache.set(key, best);
    return best;
  }

  function groundHeight(x, z) {
    const c = sampleGround(x, z);
    if (c !== null) return c;
    let best = null;
    for (const [ox, oz] of footSamples) {
      if (!ox && !oz) continue;
      const h = sampleGround(x + ox, z + oz);
      if (h === null) continue;
      if (best === null || h > best) best = h;
    }
    return best;
  }

  function isValidFloor(floor, fromY) {
    if (floor === null || floor > CONFIG.MAX_WALK_Y) return false;
    if (fromY === undefined) return true;
    if (floor - fromY > CONFIG.STEP_HEIGHT) return false;
    if (fromY - floor > CONFIG.STEP_DOWN) return false;
    return true;
  }

  function canStandAt(x, z, fromY) {
    if (isValidFloor(sampleGround(x, z), fromY)) return true;
    let hits = 0;
    for (const [ox, oz] of footSamples) {
      if (!ox && !oz) continue;
      if (isValidFloor(sampleGround(x + ox, z + oz), fromY)) hits += 1;
    }
    return hits >= 2;
  }

  function yOverlaps(box, footY) {
    return box.max.y > footY + 0.04 && box.min.y < footY + capH;
  }

  /**
   * 가구(테이블/의자 등)는 단차로 오르지 않음 — 솔리드로만 막음.
   * 진짜 계단은 floors(stair) 접지 높이 차이로만 처리.
   */
  function isClimbable(_entry, _footY) {
    return false;
  }

  function penetrate(cx, cz, footY, box) {
    if (!yOverlaps(box, footY)) return 0;
    const r = radius + skin;
    const insideX = cx > box.min.x && cx < box.max.x;
    const insideZ = cz > box.min.z && cz < box.max.z;

    if (insideX && insideZ) {
      const left = cx - box.min.x;
      const right = box.max.x - cx;
      const near = cz - box.min.z;
      const far = box.max.z - cz;
      const m = Math.min(left, right, near, far);
      if (m === left) _push.set(-(left + r), 0, 0);
      else if (m === right) _push.set(right + r, 0, 0);
      else if (m === near) _push.set(0, 0, -(near + r));
      else _push.set(0, 0, far + r);
      return Math.hypot(_push.x, _push.z);
    }

    const closestX = THREE.MathUtils.clamp(cx, box.min.x, box.max.x);
    const closestZ = THREE.MathUtils.clamp(cz, box.min.z, box.max.z);
    const dx = cx - closestX;
    const dz = cz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= r * r || distSq < 1e-12) return 0;
    const dist = Math.sqrt(distSq);
    const pen = r - dist;
    _push.set((dx / dist) * pen, 0, (dz / dist) * pen);
    return pen;
  }

  function penetrationSum(x, z, footY) {
    let sum = 0;
    const nearby = collisionWorld.queryNearby(x, z, radius + skin + 0.2);
    for (let i = 0; i < nearby.length; i++) {
      sum += penetrate(x, z, footY, nearby[i].box);
    }
    return sum;
  }

  function resolvePenetration(x, z, footY) {
    let cx = x;
    let cz = z;
    for (let iter = 0; iter < CONFIG.DEPENETRATE_ITERS; iter++) {
      let px = 0;
      let pz = 0;
      let moved = false;
      const nearby = collisionWorld.queryNearby(cx, cz, radius + skin + 0.4);
      for (let i = 0; i < nearby.length; i++) {
        const entry = nearby[i];
        if (isClimbable(entry, footY)) continue;
        if (penetrate(cx, cz, footY, entry.box) > 0) {
          px += _push.x;
          pz += _push.z;
          moved = true;
        }
      }
      if (!moved) break;
      cx += px;
      cz += pz;
    }
    return { x: cx, z: cz };
  }

  function collidesAt(x, z, footY) {
    const nearby = collisionWorld.queryNearby(x, z, radius + skin + 0.2);
    for (let i = 0; i < nearby.length; i++) {
      const entry = nearby[i];
      if (isClimbable(entry, footY)) continue;
      if (penetrate(x, z, footY, entry.box) > 0) return true;
    }
    return false;
  }

  function canMoveTo(x, z, fromY, fromX, fromZ) {
    if (!canStandAt(x, z, fromY)) return false;
    if (!collidesAt(x, z, fromY)) return true;
    if (fromX === undefined || !collidesAt(fromX, fromZ, fromY)) return false;
    return penetrationSum(x, z, fromY) < penetrationSum(fromX, fromZ, fromY) - 1e-4;
  }

  function moveStep(fromX, fromZ, fromY, wishX, wishZ) {
    const nextX = fromX + wishX;
    const nextZ = fromZ + wishZ;
    if (canMoveTo(nextX, nextZ, fromY, fromX, fromZ)) return { x: nextX, z: nextZ };

    let nx = 0;
    let nz = 0;
    let hits = 0;
    const nearby = collisionWorld.queryNearby(nextX, nextZ, radius + skin + 0.3);
    for (let i = 0; i < nearby.length; i++) {
      const entry = nearby[i];
      if (isClimbable(entry, fromY)) continue;
      if (penetrate(nextX, nextZ, fromY, entry.box) > 0) {
        nx += _push.x;
        nz += _push.z;
        hits += 1;
      }
    }
    if (hits > 0) {
      const len = Math.hypot(nx, nz);
      if (len > 1e-8) {
        nx /= len;
        nz /= len;
        const dot = wishX * nx + wishZ * nz;
        const sx = fromX + (wishX - nx * dot);
        const sz = fromZ + (wishZ - nz * dot);
        if (canMoveTo(sx, sz, fromY, fromX, fromZ)) return { x: sx, z: sz };
      }
    }
    if (canMoveTo(fromX + wishX, fromZ, fromY, fromX, fromZ)) return { x: fromX + wishX, z: fromZ };
    if (canMoveTo(fromX, fromZ + wishZ, fromY, fromX, fromZ)) return { x: fromX, z: fromZ + wishZ };
    return { x: fromX, z: fromZ };
  }

  /**
   * @param {number} dt
   * @param {{ x: number, y: number, running?: boolean }|null} input  카메라 기준 forward=y, right=x
   * @param {THREE.Vector3} forward
   * @param {THREE.Vector3} right
   * @param {{ holdPose?: boolean }} [opts]  앉/눕 중이면 접지·탈진으로 좌표를 끌어내리지 않음
   */
  function facingYaw() {
    const yaw = THREE.MathUtils.degToRad(CONFIG.CAMERA_YAW_DEG);
    return Math.atan2(-Math.sin(yaw), -Math.cos(yaw));
  }

  /**
   * 겹치지 않는 가장 가까운 바닥. 없으면 null.
   * @param {number} x
   * @param {number} z
   * @param {number} y
   * @param {number} [maxRadius]
   */
  function findFreeSpot(x, z, y, maxRadius = 0.8) {
    const here = groundHeight(x, z);
    const gy = here ?? y;
    if (here != null && canStandAt(x, z, gy) && !collidesAt(x, z, gy)) {
      return { x, y: gy, z };
    }
    for (let r = 0.12; r <= maxRadius; r += 0.12) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cx = x + Math.cos(a) * r;
        const cz = z + Math.sin(a) * r;
        const g = groundHeight(cx, cz);
        if (g == null || !canStandAt(cx, cz, gy) || collidesAt(cx, cz, g)) continue;
        return { x: cx, y: g, z: cz };
      }
    }
    return null;
  }

  function update(dt, input, forward, right, opts = {}) {
    groundCache.clear();
    collisionWorld.syncDynamic?.();

    if (opts.holdPose) {
      return { moving: false, running: false, locomotion: "idle" };
    }

    let moving = false;
    let running = false;

    if (input) {
      running = Boolean(input.running);
      const speed = running ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
      const wishX = (right.x * input.x + forward.x * input.y) * speed * dt;
      const wishZ = (right.z * input.x + forward.z * input.y) * speed * dt;
      const dist = Math.hypot(wishX, wishZ);
      const fromX = pivot.position.x;
      const fromZ = pivot.position.z;
      const fromY = pivot.position.y;

      if (dist > 1e-8) {
        const steps = Math.max(1, Math.ceil(dist / CONFIG.MOVE_SUBSTEP));
        const stepX = wishX / steps;
        const stepZ = wishZ / steps;
        let x = fromX;
        let z = fromZ;
        for (let i = 0; i < steps; i++) {
          const next = moveStep(x, z, fromY, stepX, stepZ);
          x = next.x;
          z = next.z;
        }
        const fixed = resolvePenetration(x, z, fromY);
        pivot.position.x = fixed.x;
        pivot.position.z = fixed.z;
        moving = Math.hypot(fixed.x - fromX, fixed.z - fromZ) > 1e-5;

        const dirX = right.x * input.x + forward.x * input.y;
        const dirZ = right.z * input.x + forward.z * input.y;
        if (Math.hypot(dirX, dirZ) > 0.01) {
          const yaw = Math.atan2(dirX, dirZ);
          const cur = pivot.rotation.y;
          const dy = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur));
          pivot.rotation.y = cur + dy * (1 - Math.exp(-CONFIG.TURN_RESPONSIVENESS * dt));
        }
      }
    }

    // 끼임 탈출
    {
      const u = resolvePenetration(pivot.position.x, pivot.position.z, pivot.position.y);
      pivot.position.x = u.x;
      pivot.position.z = u.z;
    }

    const floor = groundHeight(pivot.position.x, pivot.position.z);
    if (floor === null || floor < CONFIG.FALL_Y || pivot.position.y < CONFIG.FALL_Y) {
      respawn();
    } else {
      // 계단/턱: STEP_HEIGHT 이내면 따라붙기
      const dy = floor - pivot.position.y;
      if (Math.abs(dy) < 0.02) {
        pivot.position.y = floor;
      } else if (dy > 0 && dy <= CONFIG.STEP_HEIGHT) {
        pivot.position.y = THREE.MathUtils.damp(pivot.position.y, floor, 16, dt);
      } else if (dy < 0 && -dy <= CONFIG.STEP_DOWN) {
        pivot.position.y = THREE.MathUtils.damp(pivot.position.y, floor, 8, dt);
      } else if (dy > CONFIG.STEP_HEIGHT) {
        // 너무 높으면 이동에서 이미 막힘 — Y만 유지
      } else {
        pivot.position.y = THREE.MathUtils.damp(pivot.position.y, floor, 6, dt);
      }
    }

    return {
      moving,
      running: moving && running,
      locomotion: moving ? (running ? "run" : "walk") : "idle",
    };
  }

  function respawn() {
    const y = groundHeight(CONFIG.SPAWN.x, CONFIG.SPAWN.z) ?? 0;
    pivot.position.set(CONFIG.SPAWN.x, y, CONFIG.SPAWN.z);
    pivot.rotation.y = facingYaw();
  }

  return {
    update,
    respawn,
    groundHeight,
    sampleGround,
    canStandAt,
    collidesAt,
    findFreeSpot,
    facingYaw,
  };
}
